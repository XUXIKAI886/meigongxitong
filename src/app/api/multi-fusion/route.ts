import { NextRequest, NextResponse } from 'next/server';
import { ProductRefineApiClient } from '@/lib/api-client';
import { jobRunner, JobQueue } from '@/lib/job-queue';
import { config } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

// Job processor for multi-image fusion
class MultiFusionProcessor {
  async process(jobData: any) {
    const { sourceImageBuffers, targetImageBuffer, prompt } = jobData.payload;

    const client = new ProductRefineApiClient();

    // 转换所有源图片Buffer为base64 data URL
    const sourceImagesBase64 = sourceImageBuffers.map((buffer: Buffer) =>
      `data:image/png;base64,${buffer.toString('base64')}`
    );

    const targetImageBase64 = `data:image/png;base64,${targetImageBuffer.toString('base64')}`;

    // 构建多图融合的提示词
    const enhancedPrompt = `${prompt}

EXECUTION PROCESS:
- Extract ${sourceImagesBase64.length} food items from source images
- Place all food items prominently in the background scene
- Result: Large, visible food items as main attractions

EXTRACTION RULES:
- Bowl foods (noodles, rice, soup): Extract food + bowl together
- Plate foods: Extract food + plate if part of presentation
- Standalone foods: Extract only the food item
- Remove: tables, backgrounds, hands, utensils, decorations
- Preserve: natural food textures and serving presentation

SIZE AND INTEGRATION:
- Make food items large and dominant in the visual space
- Blend seamlessly into background lighting and atmosphere
- Create proper shadows, reflections, and environmental effects
- Match background color temperature and mood
- Add realistic details like steam or ambient lighting

FINAL GOAL:
Create a commercial-quality restaurant image where all ${sourceImagesBase64.length} food items are clearly visible, properly sized, and naturally integrated into the background scene.`;

    // 使用fusionMultipleImages方法，将所有源图片和目标背景进行融合
    const response = await client.fusionMultipleImages({
      sourceImages: sourceImagesBase64, // 使用所有源图片
      targetImage: targetImageBase64, // 目标背景
      prompt: enhancedPrompt
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No fusion image generated');
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
    } else if (imageData.url && imageData.url.startsWith('http')) {
      // 如果是HTTP URL，需要下载图片
      const imageResponse = await fetch(imageData.url);
      const arrayBuffer = await imageResponse.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
    } else {
      throw new Error('Invalid image data format');
    }

    // 保存图片到public/generated目录
    const filename = `multi-fusion-${uuidv4()}.png`;
    const publicDir = path.join(process.cwd(), 'public', 'generated');
    
    // 确保目录存在
    if (!fs.existsSync(publicDir)) {
      await mkdir(publicDir, { recursive: true });
    }
    
    const filePath = path.join(publicDir, filename);
    await writeFile(filePath, base64Data, 'base64');

    return {
      imageUrl: `/generated/${filename}`,
      width: 1200,
      height: 900
    };
  }
}

// 注册处理器
jobRunner.registerProcessor('multi-fusion', new MultiFusionProcessor());

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // 获取所有源图片
    const sourceImages = formData.getAll('sourceImages') as File[];
    if (sourceImages.length === 0) {
      return NextResponse.json({ error: 'No source images provided' }, { status: 400 });
    }

    // 限制最多8张图片
    if (sourceImages.length > 8) {
      return NextResponse.json({ error: 'Maximum 8 source images allowed' }, { status: 400 });
    }

    // 获取目标背景
    const targetImage = formData.get('targetImage') as File;
    const templateUrl = formData.get('templateUrl') as string;

    if (!targetImage && !templateUrl) {
      return NextResponse.json({ error: 'Target image or template URL required' }, { status: 400 });
    }

    // 处理源图片
    const sourceImageBuffers = await Promise.all(
      sourceImages.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        return Buffer.from(arrayBuffer);
      })
    );

    // 处理目标背景
    let targetImageBuffer: Buffer;
    if (targetImage) {
      const arrayBuffer = await targetImage.arrayBuffer();
      targetImageBuffer = Buffer.from(arrayBuffer);
    } else if (templateUrl) {
      // 使用模板URL - 从文件系统直接读取
      try {
        // 从URL中提取文件名
        const urlParts = templateUrl.split('/');
        const filename = decodeURIComponent(urlParts[urlParts.length - 1]);
        const templatePath = path.join(process.cwd(), 'shiwutihuangongju', filename);

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
    } else {
      return NextResponse.json({ error: 'Invalid target image' }, { status: 400 });
    }

    // 构建多图融合提示词
    const prompt = `Create a professional food delivery meal set by extracting ${sourceImages.length} food items and placing them in the background scene.

FOOD EXTRACTION RULES:
1. For foods in bowls/containers: Extract food + container together
2. For foods without containers: Extract only the food item
3. Remove all backgrounds, tables, utensils, and decorative elements
4. Focus on the main food item in each source image

PLACEMENT REQUIREMENTS:
5. Make food items large and prominent (60-80% of space)
6. Position as main focal points of the composition
7. Ensure all food items are clearly visible and appetizing
8. Create balanced arrangement with proper visual weight

INTEGRATION REQUIREMENTS:
9. Blend food items naturally into background lighting
10. Match shadows and reflections to background scene
11. Adjust colors to harmonize with background atmosphere
12. Add realistic environmental effects (steam, lighting)

FINAL RESULT:
Generate a high-quality restaurant-style image where all ${sourceImages.length} extracted food items are the main attractions, properly sized and seamlessly integrated into the background scene.`;

    // 创建并启动作业
    const job = JobQueue.createJob('multi-fusion', {
      sourceImageBuffers,
      targetImageBuffer,
      prompt
    }, 'anonymous');

    // 启动作业处理
    jobRunner.runJob(job.id);

    // 等待作业完成（最多等待5分钟）
    const maxWaitTime = 5 * 60 * 1000; // 5分钟
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const currentJob = JobQueue.getJob(job.id);

      if (!currentJob) {
        break; // 作业已被清理
      }

      if (currentJob.status === 'succeeded') {
        return NextResponse.json({
          success: true,
          jobId: job.id,
          result: currentJob.result,
          message: '多图融合完成'
        });
      }

      if (currentJob.status === 'failed') {
        return NextResponse.json({
          success: false,
          error: currentJob.error || '多图融合失败'
        }, { status: 500 });
      }

      // 等待100ms后再检查
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 如果超时，返回作业ID让前端轮询
    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: '多图融合任务已启动，请等待处理完成'
    });

  } catch (error) {
    console.error('Multi-fusion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
