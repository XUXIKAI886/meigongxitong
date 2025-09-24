import { NextRequest, NextResponse } from 'next/server';
import { ProductImageApiClient, withRetry, rateLimiter, handleApiError } from '@/lib/api-client';
import { JobQueue, jobRunner } from '@/lib/job-queue';
import { FileManager } from '@/lib/upload';
import { config } from '@/lib/config';
import { parseSize, resizeImage, removeBackground, addBackground, enhanceImage } from '@/lib/image-utils';
import { ApiResponse, GenerateProductRequest } from '@/types';

// Job processor for product generation
class ProductGenerationProcessor {
  private imageClient = new ProductImageApiClient(); // 使用单品图专用客户端

  async process(job: any): Promise<{ imageUrl: string; width: number; height: number }> {
    const { sourceImageBuffer, sourceImageType, background, enhance, outputSize } = job.payload;

    // Create prompt based on background mode and enhancement options
    let prompt = this.createBackgroundPrompt(background, enhance);

    // Convert base64 string back to buffer, then to API format
    const sourceBuffer = Buffer.from(sourceImageBuffer, 'base64');
    const base64Image = this.bufferToBase64(sourceBuffer, sourceImageType);

    // Use image-to-image generation with the source image
    const response = await withRetry(async () => {
      return await this.imageClient.generateImageWithImage({
        image: base64Image,
        prompt: prompt,
        size: outputSize,
        n: 1,
      });
    });

    const imageData = response.data[0];
    console.log('Image data structure:', JSON.stringify(imageData, null, 2));

    if (!imageData || (!imageData.url && !imageData.b64_json)) {
      throw new Error('No image data in response');
    }

    // Handle different response formats from Gemini API
    let generatedImageBuffer: Buffer;

    if (imageData.url && imageData.url.startsWith('data:')) {
      // Handle data URL format from Gemini
      const base64Data = imageData.url.split(',')[1];
      generatedImageBuffer = Buffer.from(base64Data, 'base64');
    } else if (imageData.b64_json) {
      // Handle base64 format
      generatedImageBuffer = Buffer.from(imageData.b64_json, 'base64');
    } else if (imageData.url) {
      // Handle regular URL format
      const imageResponse = await fetch(imageData.url);
      if (!imageResponse.ok) {
        throw new Error('Failed to download generated image');
      }
      generatedImageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    } else {
      throw new Error('No valid image data found in response');
    }
    const targetSize = parseSize(outputSize);

    // Resize to exact dimensions if needed
    const processedBuffer = await resizeImage(
      generatedImageBuffer,
      targetSize.width,
      targetSize.height,
      { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }
    );

    // Save processed image
    const savedFile = await FileManager.saveBuffer(
      processedBuffer,
      `product-${Date.now()}.png`,
      'image/png'
    );

    return {
      imageUrl: savedFile.url,
      width: targetSize.width,
      height: targetSize.height,
    };
  }

  private createBackgroundPrompt(background: any, enhance?: any): string {
    let prompt = '';

    // Base prompt for product image with background replacement
    prompt = 'product photography, clean background, professional lighting, high quality';

    // Add background-specific prompts
    switch (background.mode) {
      case 'solid':
        const color = background.solidColor || '#FFFFFF';
        prompt += `, solid ${color} background, minimalist`;
        break;

      case 'gradient':
        const gradient = background.gradient || { from: '#FFFFFF', to: '#F0F0F0' };
        prompt += `, gradient background from ${gradient.from} to ${gradient.to}, smooth transition`;
        break;

      case 'texture':
        const texturePrompt = background.texturePrompt || 'subtle texture';
        prompt += `, ${texturePrompt} background, textured surface`;
        break;

      case 'text2img':
        const customPrompt = background.text2imgPrompt || 'clean background';
        prompt += `, ${customPrompt}`;
        break;

      default:
        prompt += ', white background, clean and minimal';
    }

    // Add enhancement prompts
    if (enhance?.sharpen) {
      prompt += ', sharp details, crisp edges';
    }

    if (enhance?.denoise) {
      prompt += ', smooth surface, noise-free';
    }

    // Add beautify prompts
    if (enhance?.beautify) {
      const beautifyPrompts = this.getBeautifyPrompt(enhance.beautifyPreset);
      prompt += `, ${beautifyPrompts}`;
    }

    // Add final quality modifiers
    prompt += ', studio lighting, commercial photography, 4k resolution';

    return prompt;
  }

  private getBeautifyPrompt(preset: string): string {
    const beautifyPresets: Record<string, string> = {
      'general': 'enhance product quality, improve lighting, remove imperfections, maintain original appearance, professional food photography',
      'food-fresh': 'make food look fresh and appetizing, enhance colors, improve texture, add natural shine, maintain food authenticity',
      'color-enhance': 'enhance colors and saturation, improve contrast, make colors more vibrant, maintain natural appearance',
      'texture-detail': 'enhance texture details, improve surface quality, add realistic details, maintain product integrity',
      'lighting-fix': 'improve lighting conditions, fix shadows, enhance natural lighting, professional studio lighting effect',
      'defect-repair': 'repair surface defects, remove blemishes, fix imperfections, maintain original product shape and characteristics'
    };

    return beautifyPresets[preset] || beautifyPresets['general'];
  }

  private bufferToBase64(buffer: Buffer, mimeType: string): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}

// Register the processor
jobRunner.registerProcessor('generate-product', new ProductGenerationProcessor());

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'anonymous';
    const canProceed = await rateLimiter.checkLimit(
      `generate-product:${clientIp}`,
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
    
    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const backgroundMode = formData.get('backgroundMode') as string;
    const backgroundData = formData.get('backgroundData') as string;
    const enhanceData = formData.get('enhance') as string;
    const outputSize = formData.get('outputSize') as string || config.images.sizes.product;
    
    // Validate required fields
    if (!imageFile || !backgroundMode) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: image, backgroundMode',
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 400 }
      );
    }
    
    // Get image buffer from uploaded file
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // Parse background and enhance data
    const background = backgroundData ? JSON.parse(backgroundData) : { mode: backgroundMode };
    const enhance = enhanceData ? JSON.parse(enhanceData) : undefined;

    // Create job with image buffer as base64 string for serialization
    const job = JobQueue.createJob('generate-product', {
      sourceImageBuffer: imageBuffer.toString('base64'),
      sourceImageType: imageFile.type,
      background,
      enhance,
      outputSize,
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
    console.error('Product generation API error:', error);
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
