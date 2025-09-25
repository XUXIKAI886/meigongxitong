import { Job } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// In-memory job storage (in production, use Redis or database)
const jobs = new Map<string, Job>();
const userJobs = new Map<string, Set<string>>();

export class JobQueue {
  // Create a new job
  static createJob(
    type: Job['type'],
    payload: any,
    userId?: string
  ): Job {
    // Clean up old jobs before creating new ones
    this.cleanup();

    const job: Job = {
      id: uuidv4(),
      type,
      status: 'queued',
      payload,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jobs.set(job.id, job);

    // Track user jobs for concurrency control
    if (userId) {
      if (!userJobs.has(userId)) {
        userJobs.set(userId, new Set());
      }
      userJobs.get(userId)!.add(job.id);
    }

    console.log(`Created job ${job.id} of type ${type} for user ${userId || 'anonymous'}`);

    return job;
  }
  
  // Get job by ID
  static getJob(jobId: string): Job | undefined {
    return jobs.get(jobId);
  }
  
  // Update job status
  static updateJob(
    jobId: string,
    updates: Partial<Pick<Job, 'status' | 'progress' | 'result' | 'error'>>
  ): Job | undefined {
    const job = jobs.get(jobId);
    if (!job) return undefined;
    
    Object.assign(job, updates, { updatedAt: new Date() });
    jobs.set(jobId, job);
    
    return job;
  }
  
  // Check user concurrency limit
  static canUserCreateJob(userId: string, maxConcurrent: number = 2): boolean {
    const userJobIds = userJobs.get(userId);
    if (!userJobIds) return true;

    // Count running jobs
    const runningJobs = Array.from(userJobIds)
      .map(id => jobs.get(id))
      .filter(job => job && (job.status === 'queued' || job.status === 'running'))
      .length;

    console.log(`User ${userId} concurrency check: ${runningJobs}/${maxConcurrent} running jobs`);

    return runningJobs < maxConcurrent;
  }
  
  // Get user jobs
  static getUserJobs(userId: string): Job[] {
    const userJobIds = userJobs.get(userId);
    if (!userJobIds) return [];
    
    return Array.from(userJobIds)
      .map(id => jobs.get(id))
      .filter((job): job is Job => job !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  // Clean up completed jobs (older than 15 minutes for better concurrency and frontend polling)
  static cleanup(): void {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    let cleanedCount = 0;

    for (const [jobId, job] of jobs.entries()) {
      if (
        (job.status === 'succeeded' || job.status === 'failed') &&
        job.updatedAt < fifteenMinutesAgo
      ) {
        jobs.delete(jobId);
        cleanedCount++;

        // Remove from user jobs
        for (const [userId, userJobIds] of userJobs.entries()) {
          if (userJobIds.has(jobId)) {
            userJobIds.delete(jobId);
            if (userJobIds.size === 0) {
              userJobs.delete(userId);
            }
            break;
          }
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} completed jobs`);
    }
  }
  
  // Remove a specific job
  static removeJob(jobId: string): boolean {
    const job = jobs.get(jobId);
    if (!job) return false;

    jobs.delete(jobId);

    // Remove from user jobs
    for (const [userId, userJobIds] of userJobs.entries()) {
      if (userJobIds.has(jobId)) {
        userJobIds.delete(jobId);
        if (userJobIds.size === 0) {
          userJobs.delete(userId);
        }
        break;
      }
    }

    console.log(`Manually removed job ${jobId}`);
    return true;
  }

  // Get queue statistics
  static getStats(): {
    total: number;
    queued: number;
    running: number;
    succeeded: number;
    failed: number;
  } {
    const allJobs = Array.from(jobs.values());

    return {
      total: allJobs.length,
      queued: allJobs.filter(job => job.status === 'queued').length,
      running: allJobs.filter(job => job.status === 'running').length,
      succeeded: allJobs.filter(job => job.status === 'succeeded').length,
      failed: allJobs.filter(job => job.status === 'failed').length,
    };
  }
}

// Job processor interface
export interface JobProcessor {
  process(job: Job): Promise<any>;
}

// Job runner
export class JobRunner {
  private processors = new Map<Job['type'], JobProcessor>();
  private running = new Set<string>();
  
  registerProcessor(type: Job['type'], processor: JobProcessor): void {
    this.processors.set(type, processor);
  }
  
  async runJob(jobId: string): Promise<void> {
    if (this.running.has(jobId)) {
      return; // Job already running
    }
    
    const job = JobQueue.getJob(jobId);
    if (!job || job.status !== 'queued') {
      return;
    }
    
    const processor = this.processors.get(job.type);
    if (!processor) {
      JobQueue.updateJob(jobId, {
        status: 'failed',
        error: `No processor found for job type: ${job.type}`,
      });
      return;
    }
    
    this.running.add(jobId);
    
    try {
      console.log(`Starting job ${jobId}`);
      JobQueue.updateJob(jobId, { status: 'running', progress: 0 });

      const result = await processor.process(job);
      console.log(`Job ${jobId} completed successfully:`, result);

      JobQueue.updateJob(jobId, {
        status: 'succeeded',
        progress: 100,
        result,
      });

      // 延迟清理任务，给前端足够时间获取结果
      // 增加清理延迟到15分钟，确保前端轮询有足够时间
      setTimeout(() => {
        const currentJob = JobQueue.getJob(jobId);
        if (currentJob && currentJob.status === 'succeeded') {
          JobQueue.removeJob(jobId);
          console.log(`Job ${jobId} cleaned up after completion (15min delay)`);
        } else if (currentJob) {
          console.log(`Job ${jobId} not cleaned up - status: ${currentJob.status}`);
        } else {
          console.log(`Job ${jobId} already cleaned up by global cleanup`);
        }
      }, 900000); // 15分钟后清理，确保前端有足够时间获取结果
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      JobQueue.updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.running.delete(jobId);
    }
  }
}

// Global job runner instance
export const jobRunner = new JobRunner();

// Cleanup interval (run every 2 minutes for better concurrency management)
if (typeof window === 'undefined') {
  setInterval(() => {
    JobQueue.cleanup();
  }, 2 * 60 * 1000);
}
