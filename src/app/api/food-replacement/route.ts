import { NextRequest, NextResponse } from 'next/server';
import { ProductRefineApiClient } from '@/lib/api-client';
import { jobRunner, JobQueue } from '@/lib/job-queue';
import { config } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

// 食物替换处理器
class FoodReplacementProcessor {
  async process(jobData: any): Promise<{ imageUrl: string; width: number; height: number }> {
    console.log('FoodReplacementProcessor jobData keys:', Object.keys(jobData));

    // Extract the actual payload from the job data
    const payload = jobData.payload;
    console.log('Actual payload keys:', Object.keys(payload));

    const { sourceImageBuffer, targetImageBuffer, prompt } = payload;

    console.log('Extracted values:', {
      sourceImageBuffer: sourceImageBuffer ? 'present' : 'undefined',
      targetImageBuffer: targetImageBuffer ? 'present' : 'undefined',
      prompt: prompt ? 'present' : 'undefined'
    });

    if (!sourceImageBuffer || !targetImageBuffer) {
      throw new Error('Missing image buffers in payload');
    }

    // Convert base64 strings back to Buffers
    const sourceBuffer = Buffer.from(sourceImageBuffer, 'base64');
    const targetBuffer = Buffer.from(targetImageBuffer, 'base64');
    const apiClient = new ProductRefineApiClient();

    // 转换Buffer为base64 data URL
    const sourceImageBase64 = `data:image/png;base64,${sourceBuffer.toString('base64')}`;
    const targetImageBase64 = `data:image/png;base64,${targetBuffer.toString('base64')}`;

    // 调用API进行食物替换
    const response = await apiClient.replaceFoodInBowl({
      sourceImage: sourceImageBase64,
      targetImage: targetImageBase64,
      prompt: prompt
    });

    console.log('Food replacement response:', {
      hasData: !!response.data,
      dataLength: response.data?.length,
      firstItem: response.data?.[0] ? Object.keys(response.data[0]) : 'none'
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No replacement image generated');
    }

    const imageData = response.data[0];
    console.log('Image data structure:', {
      hasUrl: !!imageData.url,
      hasB64Json: !!imageData.b64_json,
      urlType: typeof imageData.url
    });

    // 检查不同的数据格式
    let base64Data: string;
    if (imageData.b64_json) {
      base64Data = imageData.b64_json;
    } else if (imageData.url && imageData.url.startsWith('data:')) {
      base64Data = imageData.url.split(',')[1];
    } else {
      throw new Error('No valid image data found in response');
    }

    // 保存生成的图片
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const filename = `${uuidv4()}.png`;
    const generatedDir = path.join(process.cwd(), 'public', 'generated');
    const filepath = path.join(generatedDir, filename);

    // 确保目录存在
    await mkdir(generatedDir, { recursive: true });
    await writeFile(filepath, imageBuffer);

    return {
      imageUrl: `/generated/${filename}`,
      width: 1200,
      height: 900
    };
  }
}

// Register the processor
jobRunner.registerProcessor('food-replacement', new FoodReplacementProcessor());

export async function POST(request: NextRequest) {
  try {
    console.log('Food replacement request from:', request.ip);

    const formData = await request.formData();
    const sourceImage = formData.get('sourceImage') as File;
    const targetImage = formData.get('targetImage') as File;
    const targetImageUrl = formData.get('targetImageUrl') as string;

    if (!sourceImage) {
      return NextResponse.json(
        { error: 'Source image is required' },
        { status: 400 }
      );
    }

    if (!targetImage && !targetImageUrl) {
      return NextResponse.json(
        { error: 'Target image or target image URL is required' },
        { status: 400 }
      );
    }

    // 检查源图片文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(sourceImage.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG and WebP images are supported for source image' },
        { status: 400 }
      );
    }

    // 检查源图片文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (sourceImage.size > maxSize) {
      return NextResponse.json(
        { error: 'Source image size must be less than 10MB' },
        { status: 400 }
      );
    }

    // 如果有目标图片文件，也检查其类型和大小
    if (targetImage) {
      if (!allowedTypes.includes(targetImage.type)) {
        return NextResponse.json(
          { error: 'Only JPEG, PNG and WebP images are supported for target image' },
          { status: 400 }
        );
      }
      if (targetImage.size > maxSize) {
        return NextResponse.json(
          { error: 'Target image size must be less than 10MB' },
          { status: 400 }
        );
      }
    }

    // 获取用户IP进行并发控制
    const userIp = request.ip || 'unknown';

    // 检查用户并发限制
    if (!JobQueue.canUserCreateJob(userIp, config.jobs.maxConcurrentPerUser)) {
      return NextResponse.json(
        { error: '并发任务过多，请等待现有任务完成后再试' },
        { status: 429 }
      );
    }

    // 食物替换专用提示词
    const prompt = `Please perform precise food replacement between two images:
1. ONLY extract the FOOD CONTENTS from inside the bowl in the first image (source image)
2. DO NOT extract or copy the bowl itself, plate, or any container from the source image
3. Place ONLY the extracted food contents into the existing bowl in the second image (target image)
4. Keep the target image's bowl, plate, and background completely unchanged
5. Adjust the food's size, angle, and lighting to naturally fit inside the target bowl
6. Ensure realistic shadows, reflections, and perspective matching for the food only
7. Blend the food edges seamlessly with the target bowl's interior
8. The final result should show the target bowl filled with the source food, but the bowl itself remains the original target bowl
9. Maintain the food's original texture and color while adapting to the target image's lighting conditions
10. Return the final composite image with natural food placement`;

    // 转换源图片为Buffer
    const sourceImageBuffer = Buffer.from(await sourceImage.arrayBuffer());

    // 获取目标图片Buffer
    let targetImageBuffer: Buffer;
    if (targetImage) {
      // 使用上传的文件
      targetImageBuffer = Buffer.from(await targetImage.arrayBuffer());
    } else {
      // 使用模板URL - 从文件系统直接读取
      try {
        // 从URL中提取文件名
        const urlParts = targetImageUrl.split('/');
        const filename = decodeURIComponent(urlParts[urlParts.length - 1]);
        const templatePath = path.join(process.cwd(), '目标图片模板', filename);

        // 检查文件是否存在
        if (!fs.existsSync(templatePath)) {
          throw new Error(`Template file not found: ${filename}`);
        }

        // 直接从文件系统读取
        targetImageBuffer = await readFile(templatePath);
      } catch (error) {
        console.error('Failed to load template image:', error);
        return NextResponse.json(
          { error: 'Failed to load template image' },
          { status: 400 }
        );
      }
    }

    // Create job
    const job = JobQueue.createJob('food-replacement', {
      sourceImageBuffer: sourceImageBuffer.toString('base64'), // base64 string
      targetImageBuffer: targetImageBuffer.toString('base64'), // base64 string
      prompt: prompt.trim(),
    }, userIp);

    // Start job processing
    console.log(`Starting food replacement job processing for ${job.id}`);
    jobRunner.runJob(job.id);

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    console.error('Food replacement error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
