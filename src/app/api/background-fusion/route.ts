import { NextRequest, NextResponse } from 'next/server';
import { ProductRefineApiClient } from '@/lib/api-client';
import { jobRunner, JobQueue } from '@/lib/job-queue';
import { config } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

// Job processor for background fusion
class BackgroundFusionProcessor {
  async process(jobData: any) {
    const { sourceImageBuffer, targetImageBuffer, prompt } = jobData.payload;

    const client = new ProductRefineApiClient(config.apiKey, config.baseUrl);

    // 转换Buffer为base64 data URL
    const sourceImageBase64 = `data:image/png;base64,${sourceImageBuffer.toString('base64')}`;
    const targetImageBase64 = `data:image/png;base64,${targetImageBuffer.toString('base64')}`;

    // 使用 generateImageWithImage 方法进行背景融合
    // 将源图片作为基础图片，通过提示词描述如何融合到目标背景
    const enhancedPrompt = `${prompt}

Target background reference: Use the style, lighting, and environment from the target background image to create the perfect fusion scene.`;

    const response = await client.generateImageWithImage({
      image: sourceImageBase64,
      prompt: enhancedPrompt,
      size: '1200x900',
      n: 1
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
    } else {
      throw new Error('No valid image data found in response');
    }

    // 保存生成的图片
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const filename = `background-fusion-${uuidv4()}.png`;
    const outputDir = path.join(process.cwd(), 'public', 'generated');

    // 确保输出目录存在
    await mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, filename);
    await writeFile(outputPath, imageBuffer);

    return {
      imageUrl: `/generated/${filename}`,
      width: 1200,
      height: 900
    };
  }
}

// 注册处理器
jobRunner.registerProcessor('background-fusion', new BackgroundFusionProcessor());

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || 'unknown';
    console.log('Background fusion request from:', userAgent);

    const formData = await request.formData();
    const sourceImage = formData.get('sourceImage') as File;
    const targetImage = formData.get('targetImage') as File;
    const targetImageUrl = formData.get('targetImageUrl') as string;

    if (!sourceImage) {
      return NextResponse.json(
        { error: '请上传源图片' },
        { status: 400 }
      );
    }

    if (!targetImage && !targetImageUrl) {
      return NextResponse.json(
        { error: '请上传目标图片或选择模板' },
        { status: 400 }
      );
    }

    // 处理源图片
    const sourceImageBuffer = Buffer.from(await sourceImage.arrayBuffer());

    // 处理目标图片
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
    }

    // 优化的背景融合提示词
    const prompt = `Create a stunning food background fusion by seamlessly integrating the food from the source image into the target background scene. Focus on:

VISUAL APPEAL & APPETITE ENHANCEMENT:
- Enhance food colors to be vibrant, rich, and appetizing with perfect saturation
- Add natural glossy highlights and textures that make food look fresh and irresistibly delicious
- Optimize contrast and lighting to create mouth-watering visual impact
- Ensure food appears perfectly cooked, fresh, and at its most appealing state
- Make the food look so appetizing that viewers immediately want to taste it

PERFECT BACKGROUND INTEGRATION:
- Seamlessly blend the food into the target background environment with flawless transitions
- Match lighting conditions, shadows, and reflections perfectly throughout the scene
- Maintain consistent perspective, scale, and depth of field for natural composition
- Create realistic interactions between food and background elements
- Ensure the food appears naturally placed within the scene, not artificially imposed

COMMERCIAL-GRADE PRODUCT REFINEMENT:
- Perform professional product retouching to remove all imperfections, scratches, and blemishes
- Enhance material textures with strong contrast between light and shadow areas
- Create dramatic three-dimensional lighting effects with pronounced depth and volume
- Strengthen material definition with enhanced highlights and deep shadows for premium feel
- Increase overall brightness and luminosity while maintaining natural color balance
- Apply commercial-grade finishing that elevates the product's luxury and premium appearance

TECHNICAL EXCELLENCE:
- Achieve flawless edge blending with absolutely no visible seams or artifacts
- Match color temperature and ambient lighting consistently across the entire image
- Add appropriate shadows, highlights, and environmental reflections for realism
- Maintain photorealistic quality with commercial-grade professional finish
- Ensure perfect color harmony between food and background elements

FINAL RESULT REQUIREMENTS:
- Professional food photography quality suitable for commercial use
- Irresistibly appetizing appearance that triggers immediate food cravings
- Natural and believable scene composition that looks authentically photographed
- Maximum visual impact with enhanced food appeal and perfect background integration
- Ready for marketing and advertising with stunning visual presentation

Generate a single, perfectly fused image that combines the best qualities of both source and target images while making the food look absolutely delicious and naturally integrated into the background scene.`;

    // 创建任务
    const job = JobQueue.createJob('background-fusion', {
      sourceImageBuffer,
      targetImageBuffer,
      prompt,
    });

    // 启动任务处理
    jobRunner.runJob(job.id);

    return NextResponse.json({
      jobId: job.id,
      message: '背景融合任务已创建',
    });

  } catch (error) {
    console.error('Background fusion error:', error);
    return NextResponse.json(
      { error: '背景融合失败' },
      { status: 500 }
    );
  }
}
