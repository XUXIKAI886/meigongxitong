import { NextRequest, NextResponse } from 'next/server';
import { JobQueue } from '@/lib/job-queue';
import { getClientIdentifier } from '@/lib/request-context';
import { ApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  try {
    const { id } = await params;
    const requesterId = getClientIdentifier(request);
    
    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Job ID is required',
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 400 }
      );
    }
    
    const job = JobQueue.getJob(id);

    if (!job || (job.userId && job.userId !== requesterId)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Job not found',
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 404 }
      );
    }

    // Debug log
    console.log(`Job ${id} status:`, job.status, 'progress:', job.progress);
    
    return NextResponse.json({
      ok: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
      requestId,
      durationMs: Date.now() - startTime,
    } as ApiResponse);
    
  } catch (error) {
    console.error('Job polling error:', error);
    
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        requestId,
        durationMs: Date.now() - startTime,
      } as ApiResponse,
      { status: 500 }
    );
  }
}
