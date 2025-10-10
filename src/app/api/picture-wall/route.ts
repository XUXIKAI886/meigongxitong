import { NextRequest, NextResponse } from 'next/server';
import { ImageApiClient, ChatApiClient, withRetry, rateLimiter, handleApiError } from '@/lib/api';
import { JobQueue, jobRunner } from '@/lib/job-queue';
import { FileManager } from '@/lib/upload';
import { config } from '@/lib/config';
import { createReversePromptRequest, createReversePromptRequestWithBase64, extractPromptFromResponse, enhancePromptWithShopDetails } from '@/lib/prompt-templates';
import { parseSize, resizeImage } from '@/lib/image-utils';
import { ApiResponse, PictureWallRequest, PictureWallResponse } from '@/types';


// 强制使用 Node.js Runtime (Vercel部署必需)
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

// Job processor for picture wall generation
class PictureWallProcessor {
  private imageClient = new ImageApiClient();
  private chatClient = new ChatApiClient();

  async process(job: any): Promise<PictureWallResponse> {
    const { avatarImageBuffer, avatarImageType } = job.payload;

    // Update progress: Starting reverse prompt analysis (仅本地模式)
    if (!job.id.startsWith('vercel-')) {
      JobQueue.updateJob(job.id, { progress: 10 });
    }

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
      return await this.chatClient.createChatCompletion({
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

    // Update progress: Reverse prompt completed (仅本地模式)
    if (!job.id.startsWith('vercel-')) {
      JobQueue.updateJob(job.id, { progress: 30 });
    }

    // Use the original reverse prompt directly without any enhancement
    const finalPrompt = prompt; // 直接使用反推提示词，不进行任何加工

    console.log('直接使用的反推提示词:', {
      length: finalPrompt.length,
      content: finalPrompt
    });

    // Generate 3 images for picture wall with different compositions
    const images = [];
    const targetSize = parseSize(config.images.sizes.pictureWall);

    // 为每张图片定义不同的构图变化
    const compositionVariations = [
      '主视角正面构图，文字排版在顶部，食物居中特写展示',
      '侧面45度角构图，文字排版在左侧或右侧，食物局部细节展示',
      '俯视角度构图，文字排版在底部，食物整体摆盘展示'
    ];

    for (let i = 0; i < 3; i++) {
      // Update progress for each image (仅本地模式)
      if (!job.id.startsWith('vercel-')) {
        const progress = 30 + Math.floor((i / 3) * 60); // 30% → 90%
        JobQueue.updateJob(job.id, { progress });
      }

      // 为每张图片添加不同的构图要求
      const enhancedPrompt = `${finalPrompt}

【第${i + 1}张图片构图要求】
${compositionVariations[i]}
确保文字排版、拍摄角度、食物展示方式与其他图片明显不同，但保持整体风格统一。`;

      console.log(`Generating image ${i + 1}/3 with composition variation:`, {
        variation: compositionVariations[i],
        promptLength: enhancedPrompt.length,
        size: config.images.sizes.pictureWall,
        model: process.env.IMAGE_MODEL_NAME
      });

      try {
        const response = await withRetry(async () => {
          return await this.imageClient.generateImage({
            prompt: enhancedPrompt,
            size: config.images.sizes.pictureWall,
          });
        });

        if (!response.data || response.data.length === 0) {
          console.error(`No image data returned for image ${i + 1}`);
          continue;
        }

        const imageData = response.data[0];
        if (!imageData.url) {
          console.error(`No URL in response for image ${i + 1}`);
          continue;
        }

        // Download and process the generated image
        const imageResponse = await fetch(imageData.url);
        if (!imageResponse.ok) {
          console.error(`Failed to download image ${i + 1}`);
          continue;
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Resize to exact dimensions
        const processedBuffer = await resizeImage(
          imageBuffer,
          targetSize.width,
          targetSize.height,
          { fit: 'cover' }
        );

        // Save the processed image
        const savedFile = await FileManager.saveBuffer(
          processedBuffer,
          `picture-wall-${i + 1}-${Date.now()}.png`,
          'image/png',
          true // Use public/generated directory
        );

        images.push({
          imageUrl: savedFile.url,
          width: targetSize.width,
          height: targetSize.height,
        });

        console.log(`Successfully generated and saved image ${i + 1}/3`);
      } catch (error) {
        console.error(`Error generating image ${i + 1}:`, error);
        // Continue with next image even if one fails
      }
    }

    console.log(`Final result: ${images.length}/3 images generated successfully`);

    // If no images were successfully generated, throw error
    if (images.length === 0) {
      throw new Error('Failed to generate any images');
    }

    // Final progress update (仅本地模式)
    if (!job.id.startsWith('vercel-')) {
      JobQueue.updateJob(job.id, { progress: 95 });
    }

    return {
      images,
      reversePrompt: {
        summary,
        prompt,
        enhancedPrompt: prompt
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
    
    // Parse FormData
    const formData = await request.formData();
    const avatarFile = formData.get('avatar') as File;

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

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(avatarFile.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid file type. Allowed: ${validTypes.join(', ')}`,
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Convert file to buffer
    const avatarBuffer = Buffer.from(await avatarFile.arrayBuffer());

    const payload = {
      avatarImageBuffer: avatarBuffer.toString('base64'),
      avatarImageType: avatarFile.type,
    };

    // Vercel 环境检测: 同步处理而非异步作业队列
    const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isVercel) {
      // Vercel 模式: 同步处理,直接返回结果
      console.log('Vercel环境检测: 使用同步处理模式');

      const processor = new PictureWallProcessor();
      const result = await processor.process({ id: `vercel-${Date.now()}`, payload } as any);

      return NextResponse.json({
        ok: true,
        data: result,
        requestId,
        durationMs: Date.now() - startTime,
      } as ApiResponse);
    } else {
      // 本地模式: 异步作业队列
      const job = JobQueue.createJob('picture-wall', payload, clientIp);
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
    }
    
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
