/**
 * Vercel 环境作业处理辅助函数
 *
 * 解决 Vercel Serverless Functions 无状态问题:
 * - Vercel: 同步处理,直接返回结果
 * - 本地: 异步队列,返回 jobId 供轮询
 */

import { JobQueue, jobRunner, JobProcessor } from './job-queue';
import { Job } from '@/types';

/**
 * 检测是否在 Vercel 环境
 */
export function isVercelEnvironment(): boolean {
  return process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

/**
 * 创建并处理作业 (自动适配 Vercel/本地环境)
 *
 * @param type 作业类型
 * @param payload 作业数据
 * @param processor 处理器实例
 * @param clientIp 客户端IP (用于并发控制)
 * @returns Vercel: 处理结果; 本地: jobId
 */
export async function createAndProcessJob(
  type: Job['type'],
  payload: any,
  processor: JobProcessor,
  clientIp: string
): Promise<{ isSync: boolean; jobId?: string; result?: any }> {
  const isVercel = isVercelEnvironment();

  if (isVercel) {
    // Vercel 模式: 同步处理
    console.log('Vercel环境检测: 使用同步处理模式');

    const mockJob = { id: `vercel-${Date.now()}`, type, payload };
    const result = await processor.process(mockJob as any);

    return { isSync: true, result };
  } else {
    // 本地模式: 异步队列
    const job = JobQueue.createJob(type, payload, clientIp);
    console.log(`Starting job processing for ${job.id}`);
    jobRunner.runJob(job.id);

    return { isSync: false, jobId: job.id };
  }
}
