import { NextRequest, NextResponse } from 'next/server';
import { JobQueue } from '@/lib/job-queue';

export async function GET(request: NextRequest) {
  try {
    // Get all job statistics
    const stats = JobQueue.getStats();
    
    // Get detailed job information
    const allJobs = [];
    const jobs = (JobQueue as any).jobs; // Access private jobs map
    const userJobs = (JobQueue as any).userJobs; // Access private userJobs map

    if (jobs && jobs.entries) {
      for (const [jobId, job] of jobs.entries()) {
        allJobs.push({
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          error: job.error,
          hasResult: !!job.result
        });
      }
    }

    // Get user job mapping
    const userJobMapping = {};
    if (userJobs && userJobs.entries) {
      for (const [userId, jobIds] of userJobs.entries()) {
        userJobMapping[userId] = Array.from(jobIds);
      }
    }
    
    return NextResponse.json({
      ok: true,
      data: {
        stats,
        jobs: allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        userJobMapping,
        totalJobs: allJobs.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Debug jobs API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
