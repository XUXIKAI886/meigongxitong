/**
 * Vercel 环境下的任务调度辅助工具
 *
 * 根据 Vercel Serverless Functions 的运行特性自动选择同步/异步流程：
 * - Vercel 运行时：同步执行并直接返回结果
 * - 本地/自建环境：创建 Job 交由队列异步处理
 */

import { JobQueue, jobRunner, JobProcessor } from './job-queue';
import { Job, JobType } from '@/types';

/**
 * 判断当前运行环境是否为 Vercel
 */
export function isVercelEnvironment(): boolean {
  return process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

/**
 * 根据环境选择同步或异步执行任务
 *
 * @param type 任务类型
 * @param payload 任务载荷
 * @param processor 任务处理器
 * @param clientIp 客户端 IP（用于并发控制）
 * @returns Vercel 环境返回同步结果；其他环境返回异步 jobId
 */
export async function createAndProcessJob<TPayload, TResult = unknown>(
  type: JobType,
  payload: TPayload,
  processor: JobProcessor<TPayload, TResult>,
  clientIp: string
): Promise<{ isSync: true; result: TResult } | { isSync: false; jobId: string }> {
  const isVercel = isVercelEnvironment();

  if (isVercel) {
    // Vercel 模式：同步执行，避免队列长时间挂起
    console.log('Vercel 运行环境：采用同步处理流程');

    const mockJob: Job<TPayload, TResult> = {
      id: `vercel-${Date.now()}`,
      type,
      status: 'queued',
      payload,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await processor.process(mockJob);
    return { isSync: true, result };
  }

  // 本地/其他环境：走标准队列流程
  const job = JobQueue.createJob<TPayload, TResult>(type, payload, clientIp);
  console.log(`异步环境：创建任务 ${job.id} 并交由队列处理`);
  jobRunner.runJob(job.id);

  return { isSync: false, jobId: job.id };
}
