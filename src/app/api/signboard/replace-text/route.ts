import { NextRequest, NextResponse } from 'next/server';
import { ImageApiClient, withRetry, rateLimiter, handleApiError } from '@/lib/api-client';
import { JobQueue, jobRunner } from '@/lib/job-queue';
import { FileManager } from '@/lib/upload';
import { config } from '@/lib/config';
import { ApiResponse } from '@/types';


// 强制使用 Node.js Runtime (Vercel部署必需)
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

// Job processor for intelligent signboard text replacement
class SignboardTextReplaceProcessor {
  private imageClient = new ImageApiClient();

  async process(job: any): Promise<{ imageUrl: string; width: number; height: number }> {
    const { sourceImageBuffer, sourceImageType, originalText, newText } = job.payload;

    // Create intelligent text replacement prompt
    const prompt = this.createTextReplacePrompt(originalText, newText);

    // Convert base64 string back to buffer, then to API format
    const sourceBuffer = Buffer.from(sourceImageBuffer, 'base64');
    const base64Image = this.bufferToBase64(sourceBuffer, sourceImageType);

    // Call image-to-image API for text replacement
    console.log('Using output size:', config.signboard.outputSize);
    const response = await withRetry(async () => {
      return await this.imageClient.generateImageWithImage({
        image: base64Image,
        prompt: prompt,
        size: config.signboard.outputSize
      });
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No image generated');
    }

    const imageData = response.data[0];
    if (!imageData.url) {
      throw new Error('No image URL in response');
    }

    // Download the generated image
    const imageResponse = await fetch(imageData.url);
    if (!imageResponse.ok) {
      throw new Error('Failed to download generated image');
    }

    const generatedImageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Save the processed image
    const savedFile = await FileManager.saveBuffer(
      generatedImageBuffer,
      `signboard-${originalText}-to-${newText}-${Date.now()}.png`,
      'image/png'
    );

    return {
      imageUrl: savedFile.url,
      width: 4693, // High resolution output size
      height: 3520,
    };
  }

  private createTextReplacePrompt(originalText: string, newText: string): string {
    // Create intelligent prompt that maintains original style and natural appearance
    const basePrompt = `Replace the text "${originalText}" with "${newText}" in this signboard image, maintain the exact same font style, color, and visual effects as the original text, preserve original perspective, lighting, shadows, and background, keep the same text positioning and alignment, seamless integration, professional signboard appearance, high quality, realistic text replacement, CRITICAL: ensure all characters in the new text use exactly the same font size - no individual character scaling or size variations, maintain uniform character height and width proportions across all letters, ensure consistent baseline alignment for all characters, apply identical font size parameters to every single character without exception, prevent any automatic size adjustments between different characters`;

    // Add naturalness constraints based on configuration
    const naturalnessSettings = config.signboard.naturalness;
    const naturalnessConstraints = [];

    // Add font consistency constraints based on configuration
    const fontConsistencySettings = config.signboard.fontConsistency;
    const fontConsistencyConstraints = [];

    if (fontConsistencySettings.enforceUniformSize) {
      fontConsistencyConstraints.push('enforce identical font size for every character');
    }

    if (fontConsistencySettings.maintainCharacterAlignment) {
      fontConsistencyConstraints.push('maintain perfect character baseline alignment');
    }

    if (fontConsistencySettings.preventIndividualScaling) {
      fontConsistencyConstraints.push('prevent individual character scaling or size adjustments');
    }

    if (fontConsistencySettings.ensureEvenSpacing) {
      fontConsistencyConstraints.push('ensure consistent character spacing and kerning');
    }

    if (naturalnessSettings.preserveOriginalColors) {
      naturalnessConstraints.push('preserve original color palette and saturation levels');
    }

    if (naturalnessSettings.maintainMaterialTexture) {
      naturalnessConstraints.push('maintain authentic material texture and surface details');
    }

    if (naturalnessSettings.avoidOverSaturation) {
      naturalnessConstraints.push('avoid over-saturation or artificial color enhancement');
    }

    if (naturalnessSettings.keepWeatheringEffects) {
      naturalnessConstraints.push('preserve weathering effects and natural aging appearance');
    }

    // Additional natural appearance constraints
    naturalnessConstraints.push(
      'natural lighting conditions',
      'realistic color balance',
      'authentic wood grain patterns',
      'original surface imperfections',
      'natural shadow depth',
      'consistent ambient lighting'
    );

    // Combine all constraints
    const allConstraints = [
      ...naturalnessConstraints,
      ...fontConsistencyConstraints,
      // Additional font uniformity emphasis
      'uniform character dimensions across all letters',
      'identical font weight and thickness for every character',
      'consistent text rendering without size variations',
      'maintain exact same character scale throughout the text',
      'apply uniform font metrics to all characters'
    ];

    const prompt = `${basePrompt}, ${allConstraints.join(', ')}`;

    return prompt;
  }

  private bufferToBase64(buffer: Buffer, mimeType: string): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}

// Register the processor
jobRunner.registerProcessor('signboard-replace', new SignboardTextReplaceProcessor());

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'anonymous';
    const canProceed = await rateLimiter.checkLimit(
      `signboard-replace:${clientIp}`,
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
    const imageFile = formData.get('image') as File;
    const originalText = formData.get('originalText') as string;
    const newText = formData.get('newText') as string;

    // Validate required fields
    if (!imageFile || !originalText || !newText) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing required fields: image, originalText, newText',
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate file type and size
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid file type. Please upload an image file.',
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 400 }
      );
    }

    if (imageFile.size > config.upload.maxFileSize) {
      return NextResponse.json(
        {
          ok: false,
          error: `File too large. Maximum size is ${config.upload.maxFileSize / (1024 * 1024)}MB`,
          requestId,
          durationMs: Date.now() - startTime,
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Convert image to base64 for processing
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    // Create job
    const job = JobQueue.createJob('signboard-replace', {
      sourceImageBuffer: imageBuffer.toString('base64'),
      sourceImageType: imageFile.type,
      originalText,
      newText,
    }, clientIp);

    console.log(`Created job ${job.id} for signboard text replacement`);

    // Start job processing
    console.log(`Starting job processing for ${job.id}`);
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
    console.error('Signboard replace text API error:', error);
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
