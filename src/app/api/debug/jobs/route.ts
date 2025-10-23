import { NextRequest, NextResponse } from 'next/server';
import { JobQueue } from '@/lib/job-queue';

export async function GET(request: NextRequest) {
  try {
    // Get all job statistics
    const stats = JobQueue.getStats();
    
    // Get detailed job information
    const allJobs = JobQueue.listJobs().map(job => ({
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      error: job.error,
      hasResult: job.result !== undefined
    }));

    const userJobMapping = JobQueue.listUserJobMapping().reduce<Record<string, string[]>>((acc, entry) => {
      acc[entry.userId] = entry.jobIds;
      return acc;
    }, {});
    
    return NextResponse.json({
      ok: true,
      data: {
        stats,
        jobs: allJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        userJobMapping,
        totalJobs: allJobs.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: unknown) {
    console.error('Debug jobs API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
