import { NextRequest, NextResponse } from 'next/server';
import { ImageApiClient, withRetry, rateLimiter, handleApiError } from '@/lib/api-client';
import { JobQueue, jobRunner } from '@/lib/job-queue';
import { FileManager } from '@/lib/upload';
import { config } from '@/lib/config';
import { enhancePromptWithShopDetails } from '@/lib/prompt-templates';
import { parseSize, resizeImage } from '@/lib/image-utils';
import { ApiResponse } from '@/types';


// 强制使用 Node.js Runtime (Vercel部署必需)
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

// Job processor for poster generation
class PosterGenerationProcessor {
  private imageClient = new ImageApiClient();

  async process(job: any): Promise<{ imageUrl: string; width: number; height: number }> {
    const { prompt, shopName, category, slogan } = job.payload;
    
    // Enhance prompt with shop details
    const enhancedPrompt = enhancePromptWithShopDetails(prompt, shopName, category, slogan);
    
    // Generate image with retry
    const response = await withRetry(async () => {
      return await this.imageClient.generateImage({
        prompt: `${enhancedPrompt}, promotional poster, marketing design, eye-catching, high quality, professional`,
        size: config.images.sizes.poster,
        n: 1,
        quality: 'hd',
        style: 'vivid',
      });
    });
    
    const imageData = response.data[0];
    if (!imageData.url) {
      throw new Error('No image URL in response');
    }
    
    // Download and process the generated image
    const imageResponse = await fetch(imageData.url);
    if (!imageResponse.ok) {
      throw new Error('Failed to download generated image');
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const targetSize = parseSize(config.images.sizes.poster);
    const minSize = config.images.minSizes.poster;
    
    // Ensure minimum size requirements
    if (targetSize.width < minSize.width || targetSize.height < minSize.height) {
      throw new Error(`Poster size must be at least ${minSize.width}x${minSize.height}`);
    }
    
    // Resize to exact dimensions
    const processedBuffer = await resizeImage(
      imageBuffer,
      targetSize.width,
      targetSize.height,
      { fit: 'cover' }
    );
    
    // Save processed image
    const savedFile = await FileManager.saveBuffer(
      processedBuffer,
      `poster-${Date.now()}.png`,
      'image/png'
    );
    
    return {
      imageUrl: savedFile.url,
      width: targetSize.width,
      height: targetSize.height,
    };
  }
}

// Register the processor
jobRunner.registerProcessor('generate-poster', new PosterGenerationProcessor());

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'anonymous';
    const canProceed = await rateLimiter.checkLimit(
      `generate-poster:${clientIp}`,
      config.rateLimit.perUser.requests,
      config.rateLimit.perUser.windowMs
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
    
    // Check user concurrency
    if (!JobQueue.canUserCreateJob(clientIp, config.jobs.maxConcurrentPerUser)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Too many concurrent jobs. Please wait for existing jobs to complete.',
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 429 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { prompt, shopName, category, slogan } = body;
    
    // Validate required fields
    if (!prompt || !shopName || !category) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: prompt, shopName, category',
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Create job
    const job = JobQueue.createJob('generate-poster', {
      prompt,
      shopName,
      category,
      slogan,
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
    console.error('Poster generation API error:', error);
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
