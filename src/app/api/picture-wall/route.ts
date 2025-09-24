import { NextRequest, NextResponse } from 'next/server';
import { ImageApiClient, ChatApiClient, withRetry, rateLimiter, handleApiError } from '@/lib/api-client';
import { JobQueue, jobRunner } from '@/lib/job-queue';
import { FileManager } from '@/lib/upload';
import { config } from '@/lib/config';
import { createReversePromptRequest, createReversePromptRequestWithBase64, extractPromptFromResponse, enhancePromptWithShopDetails } from '@/lib/prompt-templates';
import { parseSize, resizeImage } from '@/lib/image-utils';
import { ApiResponse, PictureWallRequest, PictureWallResponse } from '@/types';

// Job processor for picture wall generation
class PictureWallProcessor {
  private imageClient = new ImageApiClient();
  private chatClient = new ChatApiClient();

  async process(job: any): Promise<PictureWallResponse> {
    const { avatarImageBuffer, avatarImageType } = job.payload;

    // Update progress: Starting reverse prompt analysis
    JobQueue.updateJob(job.id, { progress: 10 });

    // Convert buffer back to base64 for API call
    const avatarBuffer = Buffer.from(avatarImageBuffer, 'base64');
    const base64Image = this.bufferToBase64(avatarBuffer, avatarImageType);

    console.log('Creating reverse prompt request with base64 image');
    const promptRequest = createReversePromptRequestWithBase64(
      base64Image,
      'avatar',
      '图片墙', // 默认店铺名称
      '美食' // 默认分类
    );

    console.log('Reverse prompt request created:', {
      messagesCount: promptRequest.messages.length,
      systemMessageLength: promptRequest.messages[0]?.content?.toString().length,
      userMessageType: typeof promptRequest.messages[1]?.content
    });

    const chatResponse = await withRetry(async () => {
      return await this.chatClient.createCompletion({
        model: config.chat.modelName,
        messages: promptRequest.messages,
        max_tokens: 1500, // 增加token限制，确保获得完整的设计提示词
        temperature: 0.7,
      });
    });

    const content = chatResponse.choices[0]?.message?.content || '';
    const { summary, prompt } = extractPromptFromResponse(content);

    console.log('=== 反推提示词分析结果 ===');
    console.log('完整响应内容:', content);
    console.log('提取的摘要:', summary);
    console.log('提取的提示词:', prompt);
    console.log('========================');

    // Update progress: Reverse prompt completed, include reverse prompt data
    JobQueue.updateJob(job.id, {
      progress: 30,
      reversePrompt: {
        fullResponse: content,
        summary: summary,
        extractedPrompt: prompt
      }
    });

    // Use the original reverse prompt directly without any enhancement
    const finalPrompt = prompt; // 直接使用反推提示词，不进行任何加工

    console.log('直接使用的反推提示词:', {
      length: finalPrompt.length,
      content: finalPrompt
    });
    
    // Generate 3 images for picture wall
    const images = [];
    const targetSize = parseSize(config.images.sizes.pictureWall);

    for (let i = 0; i < 3; i++) {
      // Update progress for each image generation
      const progressBase = 30 + (i * 20); // 30%, 50%, 70%
      JobQueue.updateJob(job.id, { progress: progressBase });

      // Use the same reverse prompt for all 3 images
      const imagePrompt = finalPrompt; // 三张图片使用相同的反推提示词

      console.log(`Generating image ${i + 1}:`, {
        promptLength: imagePrompt.length,
        prompt: imagePrompt.substring(0, 100) + '...', // 只显示前100字符
        size: config.images.sizes.pictureWall,
        model: process.env.IMAGE_MODEL_NAME
      });

      const response = await withRetry(async () => {
        return await this.imageClient.generateImage({
          prompt: imagePrompt, // 使用完整的反推提示词
          size: config.images.sizes.pictureWall,
          // 移除可能不支持的参数
          // n: 1,
          // quality: 'hd',
          // style: 'vivid',
        });
      });

      const imageData = response.data[0];
      if (!imageData.url) {
        throw new Error(`No image URL in response for image ${i + 1}`);
      }

      // Update progress: Image generated, now processing
      JobQueue.updateJob(job.id, { progress: progressBase + 10 });

      // Download and process the generated image
      const imageResponse = await fetch(imageData.url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download generated image ${i + 1}`);
      }
      
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
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
        `picture-wall-${i + 1}-${Date.now()}.png`,
        'image/png'
      );
      
      images.push({
        imageUrl: savedFile.url,
        width: targetSize.width,
        height: targetSize.height,
      });
    }

    // Final progress update
    JobQueue.updateJob(job.id, { progress: 95 });

    return {
      images,
      reversePrompt: {
        summary,
        prompt,
        originalPrompt: prompt // 使用原始反推提示词
      }
    };
  }

  private bufferToBase64(buffer: Buffer, mimeType: string): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}

// Register the processor
jobRunner.registerProcessor('picture-wall', new PictureWallProcessor());

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'anonymous';
    const canProceed = await rateLimiter.checkLimit(
      `picture-wall:${clientIp}`,
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
    
    // Parse form data
    const formData = await request.formData();
    const avatarFile = formData.get('avatar') as File;

    // Validate required fields
    if (!avatarFile) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required field: avatar',
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Convert avatar to base64 for processing
    const avatarBuffer = Buffer.from(await avatarFile.arrayBuffer());

    // Create job with base64 image data
    const job = JobQueue.createJob('picture-wall', {
      avatarImageBuffer: avatarBuffer.toString('base64'),
      avatarImageType: avatarFile.type,
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
    console.error('Picture wall API error:', error);
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
