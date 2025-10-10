import { NextRequest, NextResponse } from 'next/server';
import { ProductRefineApiClient, withRetry, handleApiError, rateLimiter } from '@/lib/api-client';
import { JobQueue, jobRunner } from '@/lib/job-queue';
import { FileManager } from '@/lib/upload';
import { config } from '@/lib/config';
import { ApiResponse } from '@/types';


// 强制使用 Node.js Runtime (Vercel部署必需)
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

// Job processor for product refine
class ProductRefineProcessor {
  private refineClient: ProductRefineApiClient;

  constructor() {
    this.refineClient = new ProductRefineApiClient();
  }

  async process(job: any): Promise<{ imageUrl: string; width: number; height: number }> {
    const { sourceImageBuffer, sourceImageType, prompt } = job.payload;

    // Convert base64 string back to buffer, then to API format
    const sourceBuffer = Buffer.from(sourceImageBuffer, 'base64');
    const base64Image = this.bufferToBase64(sourceBuffer, sourceImageType);

    // Use Gemini API for enhanced product refinement with completion and centering
    const response = await withRetry(async () => {
      return await this.refineClient.refineProduct({
        image: base64Image,
        prompt: prompt,
      });
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No refined image generated');
    }

    const imageData = response.data[0];
    if (!imageData.url) {
      throw new Error('No image URL in response');
    }

    // Download the generated image
    let generatedImageBuffer: Buffer;
    
    if (imageData.url.startsWith('data:')) {
      // Handle data URL (base64)
      const base64Data = imageData.url.split(',')[1];
      generatedImageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Handle regular URL
      const imageResponse = await fetch(imageData.url);
      if (!imageResponse.ok) {
        throw new Error('Failed to download refined image');
      }
      generatedImageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    }

    // Save refined image
    const savedFile = await FileManager.saveBuffer(
      generatedImageBuffer,
      `refined-product-${Date.now()}.png`,
      'image/png'
    );

    return {
      imageUrl: savedFile.url,
      width: 1200, // Default size for refined products
      height: 900,
    };
  }

  private bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}

// Register the processor
jobRunner.registerProcessor('product-refine', new ProductRefineProcessor());

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    console.log('Product refine request from:', clientIp);

    // 应用速率限制
    const canProceed = await rateLimiter.checkLimit(
      `product-refine:${clientIp}`,
      config.rateLimit.perUser.requests,
      config.rateLimit.perUser.windowMs
    );

    if (!canProceed) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    // 检查用户并发限制
    if (!JobQueue.canUserCreateJob(clientIp, config.jobs.maxConcurrentPerUser)) {
      return NextResponse.json(
        { error: '并发任务过多，请等待现有任务完成后再试' },
        { status: 429 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const sourceImageFile = formData.get('sourceImage') as File;
    const prompt = formData.get('prompt') as string;

    if (!sourceImageFile) {
      return NextResponse.json(
        { error: '请上传产品图片' },
        { status: 400 }
      );
    }

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: '请提供精修提示词' },
        { status: 400 }
      );
    }

    // Convert to base64 format
    const imageBuffer = Buffer.from(await sourceImageFile.arrayBuffer());

    // Create job
    const job = JobQueue.createJob('product-refine', {
      sourceImageBuffer: imageBuffer.toString('base64'), // base64 string
      sourceImageType: sourceImageFile.type, // MIME type
      prompt: prompt.trim(),
    }, clientIp);

    // Start job processing
    console.log(`Starting product refine job processing for ${job.id}`);
    jobRunner.runJob(job.id);

    return NextResponse.json({
      ok: true,
      data: {
        jobId: job.id,
        message: '产品精修任务已创建，正在处理中...'
      },
      requestId: job.id,
      durationMs: 0
    });

  } catch (error: any) {
    console.error('Product refine API error:', error);
    
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: 500 }
    );
  }
}
