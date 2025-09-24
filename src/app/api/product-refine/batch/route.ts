import { NextRequest, NextResponse } from 'next/server';
import { ProductRefineApiClient, withRetry, handleApiError, rateLimiter } from '@/lib/api-client';
import { JobQueue, jobRunner } from '@/lib/job-queue';
import { FileManager } from '@/lib/upload';
import { config } from '@/lib/config';
import { ApiResponse } from '@/types';
import * as fs from 'fs';
import * as path from 'path';

// Job processor for batch product refine
class BatchProductRefineProcessor {
  private refineClient: ProductRefineApiClient;

  constructor() {
    this.refineClient = new ProductRefineApiClient();
  }

  async process(job: any): Promise<{ processedCount: number; outputFolder: string; results: any[] }> {
    const { sourceImageBuffers, sourceImageTypes, prompt, outputFolder } = job.payload;

    console.log(`Starting batch refine for ${sourceImageBuffers.length} images`);
    
    const results = [];
    let processedCount = 0;

    // 确保输出文件夹存在
    const outputPath = path.resolve(outputFolder || './batch-refined');
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    for (let i = 0; i < sourceImageBuffers.length; i++) {
      try {
        // 更新进度
        const progress = Math.round(((i + 1) / sourceImageBuffers.length) * 100);
        JobQueue.updateJob(job.id, { progress });

        console.log(`Processing image ${i + 1}/${sourceImageBuffers.length}`);

        // Convert base64 string back to buffer, then to API format
        const sourceBuffer = Buffer.from(sourceImageBuffers[i], 'base64');
        const base64Image = this.bufferToBase64(sourceBuffer, sourceImageTypes[i]);

        // Use Gemini API for product refinement with enhanced prompt
        const response = await withRetry(async () => {
          return await this.refineClient.refineProduct({
            image: base64Image,
            prompt: prompt,
          });
        });

        if (!response.data || response.data.length === 0) {
          throw new Error(`No refined image generated for image ${i + 1}`);
        }

        const imageData = response.data[0];
        if (!imageData.url) {
          throw new Error(`No image URL in response for image ${i + 1}`);
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
            throw new Error(`Failed to download refined image ${i + 1}`);
          }
          generatedImageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        }

        // Save to custom folder
        const fileName = `refined-${Date.now()}-${i + 1}.png`;
        const filePath = path.join(outputPath, fileName);
        fs.writeFileSync(filePath, generatedImageBuffer);

        results.push({
          index: i + 1,
          fileName: fileName,
          filePath: filePath,
          success: true
        });

        processedCount++;
        console.log(`Successfully processed image ${i + 1}, saved to: ${filePath}`);

      } catch (error) {
        console.error(`Failed to process image ${i + 1}:`, error);
        results.push({
          index: i + 1,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      processedCount,
      outputFolder: outputPath,
      results
    };
  }

  private bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}

// Register the processor
jobRunner.registerProcessor('batch-product-refine', new BatchProductRefineProcessor());

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    console.log('Batch product refine request from:', clientIp);

    // 应用速率限制
    const canProceed = await rateLimiter.checkLimit(
      `batch-product-refine:${clientIp}`,
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
    const sourceImageFiles = formData.getAll('sourceImages') as File[];
    const prompt = formData.get('prompt') as string;
    const outputFolder = formData.get('outputFolder') as string;

    if (!sourceImageFiles || sourceImageFiles.length === 0) {
      return NextResponse.json(
        { error: '请上传至少一张产品图片' },
        { status: 400 }
      );
    }

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: '请提供精修提示词' },
        { status: 400 }
      );
    }

    if (!outputFolder?.trim()) {
      return NextResponse.json(
        { error: '请指定输出文件夹' },
        { status: 400 }
      );
    }

    // Convert all images to base64 format
    const sourceImageBuffers = [];
    const sourceImageTypes = [];

    for (const file of sourceImageFiles) {
      const imageBuffer = Buffer.from(await file.arrayBuffer());
      sourceImageBuffers.push(imageBuffer.toString('base64'));
      sourceImageTypes.push(file.type);
    }

    // Create job
    const job = JobQueue.createJob('batch-product-refine', {
      sourceImageBuffers,
      sourceImageTypes,
      prompt: prompt.trim(),
      outputFolder: outputFolder.trim(),
    }, clientIp);

    // Start job processing
    console.log(`Starting batch product refine job processing for ${job.id} with ${sourceImageFiles.length} images`);
    jobRunner.runJob(job.id);

    const response: ApiResponse = {
      success: true,
      jobId: job.id,
      message: `批量产品精修任务已创建，正在处理 ${sourceImageFiles.length} 张图片...`
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Batch product refine API error:', error);
    
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: 500 }
    );
  }
}
