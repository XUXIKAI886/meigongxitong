import { NextRequest, NextResponse } from 'next/server';
import { ChatApiClient, withRetry, rateLimiter, handleApiError } from '@/lib/api-client';
import { createReversePromptRequest, createReversePromptRequestWithBase64, extractPromptFromResponse } from '@/lib/prompt-templates';
import { JobQueue, jobRunner } from '@/lib/job-queue';
import { upload, FileManager } from '@/lib/upload';
import { config } from '@/lib/config';
import { ReversePromptRequest, ReversePromptResponse, ApiResponse } from '@/types';


// 强制使用 Node.js Runtime (Vercel部署必需)
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

// Job processor for reverse prompt
class ReversePromptProcessor {
  private chatClient = new ChatApiClient();

  async process(job: any): Promise<ReversePromptResponse> {
    const { sourceImageBuffer, sourceImageType, scene, shopName, category, slogan, extraDirectives } = job.payload;

    // Convert buffer back to base64 for API call
    const sourceBuffer = Buffer.from(sourceImageBuffer, 'base64');
    const base64Image = this.bufferToBase64(sourceBuffer, sourceImageType);

    // Create the prompt request with base64 image
    const promptRequest = createReversePromptRequestWithBase64(
      base64Image,
      scene,
      shopName,
      category,
      slogan,
      extraDirectives
    );
    
    // Call chat completion API with retry
    const response = await withRetry(async () => {
      return await this.chatClient.createCompletion({
        model: config.chat.modelName,
        messages: promptRequest.messages,
        max_tokens: 1000,
        temperature: 0.7,
      });
    });
    
    const content = response.choices[0]?.message?.content || '';
    const { summary, prompt } = extractPromptFromResponse(content);
    
    return {
      summary,
      prompt,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private bufferToBase64(buffer: Buffer, mimeType: string): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}

// Register the processor
jobRunner.registerProcessor('reverse-prompt', new ReversePromptProcessor());

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'anonymous';
    const canProceed = await rateLimiter.checkLimit(
      `reverse-prompt:${clientIp}`,
      config.rateLimit.global.requests,
      config.rateLimit.global.windowMs
    );
    
    if (!canProceed) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Rate limit exceeded',
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 429 }
      );
    }
    
    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const scene = formData.get('scene') as string;
    const shopName = formData.get('shopName') as string;
    const category = formData.get('category') as string;
    const slogan = formData.get('slogan') as string;
    const extraDirectives = formData.get('extraDirectives') as string;
    
    // Validate required fields
    if (!imageFile || !scene || !shopName || !category) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: image, scene, shopName, category',
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Validate scene
    if (!['logo', 'avatar'].includes(scene)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid scene. Must be "logo" or "avatar"',
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Convert image to base64 for processing
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // Create job with base64 image data
    const job = JobQueue.createJob('reverse-prompt', {
      sourceImageBuffer: imageBuffer.toString('base64'),
      sourceImageType: imageFile.type,
      scene,
      shopName,
      category,
      slogan: slogan || undefined,
      extraDirectives: extraDirectives || undefined,
    }, clientIp);
    
    // Start job processing
    jobRunner.runJob(job.id);
    
    return NextResponse.json({
      ok: true,
      data: {
        jobId: job.id,
        status: job.status,
      },
      requestId,
      durationMs: Date.now() - startTime,
    } as ApiResponse);
    
  } catch (error) {
    console.error('Reverse prompt API error:', error);
    const { message, status } = handleApiError(error);
    
    return NextResponse.json(
      {
        ok: false,
        error: message,
        requestId,
        durationMs: Date.now() - startTime,
      } as ApiResponse,
      { status: status || 500 }
    );
  }
}
