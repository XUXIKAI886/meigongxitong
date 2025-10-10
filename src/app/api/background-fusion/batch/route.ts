import { NextRequest, NextResponse } from 'next/server';
import { ProductRefineApiClient } from '@/lib/api-client';
import { jobRunner, JobQueue } from '@/lib/job-queue';
import { FileManager } from '@/lib/upload';
import { config } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';


// 强制使用 Node.js Runtime (Vercel部署必需)
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

// Job processor for batch background fusion
class BatchBackgroundFusionProcessor {
  async process(jobData: any) {
    const { sourceImageBuffers, targetImageBuffer, prompt } = jobData.payload;
    const client = new ProductRefineApiClient();
    
    const results = [];
    const total = sourceImageBuffers.length;
    
    for (let i = 0; i < sourceImageBuffers.length; i++) {
      try {
        // 更新进度 (仅本地模式)
        if (!jobData.id.startsWith('vercel-')) {
          const progress = Math.round(((i + 0.5) / total) * 100);
          JobQueue.updateJob(jobData.id, { progress });
        }

        // 转换Buffer为base64 data URL
        const sourceImageBase64 = `data:image/png;base64,${sourceImageBuffers[i].toString('base64')}`;
        const targetImageBase64 = `data:image/png;base64,${targetImageBuffer.toString('base64')}`;

        console.log(`Processing image ${i + 1}/${total}, size: ${sourceImageBuffers[i].length} bytes`);

        // 重试机制：最多重试3次
        let response;
        let lastError;
        for (let retry = 0; retry < 3; retry++) {
          try {
            console.log(`Background Fusion Batch - Attempt ${retry + 1}/3 for image ${i + 1}`);
            response = await client.replaceFoodInBowl({
              sourceImage: sourceImageBase64,
              targetImage: targetImageBase64,
              prompt,
            });
            console.log(`Background Fusion Batch - Successfully processed image ${i + 1} on attempt ${retry + 1}`);
            break; // 成功则跳出重试循环
          } catch (error) {
            lastError = error;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.log(`Background Fusion Batch - Attempt ${retry + 1} failed for image ${i + 1}:`, errorMessage);
            if (retry < 2) {
              console.log(`Background Fusion Batch - Waiting 2 seconds before retry ${retry + 2} for image ${i + 1}`);
              // 等待2秒后重试
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              const finalErrorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.log(`Background Fusion Batch - All 3 attempts failed for image ${i + 1}, final error:`, finalErrorMessage);
            }
          }
        }

        if (!response) {
          throw lastError;
        }

        if (response.data && response.data.length > 0) {
          const imageData = response.data[0];

          // 检查不同的数据格式
          let base64Data: string;
          if (imageData.b64_json) {
            base64Data = imageData.b64_json;
          } else if (imageData.url && imageData.url.startsWith('data:')) {
            base64Data = imageData.url.split(',')[1];
          } else {
            throw new Error('No valid image data found in response');
          }

          // 保存生成的图片 (使用 FileManager 自动适配 Vercel)
          const imageBuffer = Buffer.from(base64Data, 'base64');
          const savedFile = await FileManager.saveBuffer(
            imageBuffer,
            `background-fusion-batch-${i + 1}-${Date.now()}.png`,
            'image/png',
            true
          );

          results.push({
            sourceImageIndex: i,
            status: 'success',
            imageUrl: savedFile.url,
            width: 1200,
            height: 900
          });

          console.log(`Successfully processed image ${i + 1}/${total}`);
        } else {
          results.push({
            sourceImageIndex: i,
            status: 'failed',
            error: 'No fusion image generated',
          });
        }

        // 更新完成进度 (仅本地模式)
        if (!jobData.id.startsWith('vercel-')) {
          const finalProgress = Math.round(((i + 1) / total) * 100);
          JobQueue.updateJob(jobData.id, { progress: finalProgress });
        }

      } catch (error) {
        console.error(`Background fusion failed for image ${i} after 3 attempts:`, error);
        results.push({
          sourceImageIndex: i,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // 即使失败也要更新进度 (仅本地模式)
        if (!jobData.id.startsWith('vercel-')) {
          const finalProgress = Math.round(((i + 1) / total) * 100);
          JobQueue.updateJob(jobData.id, { progress: finalProgress });
        }
      }
    }

    return results;
  }
}

// 注册处理器
jobRunner.registerProcessor('batch-background-fusion', new BatchBackgroundFusionProcessor());

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || 'unknown';
    console.log('Batch background fusion request from:', userAgent);

    const formData = await request.formData();
    const sourceImages = formData.getAll('sourceImages') as File[];
    const targetImage = formData.get('targetImage') as File;
    const targetImageUrl = formData.get('targetImageUrl') as string;

    console.log('Batch fusion - Source images count:', sourceImages.length);
    console.log('Batch fusion - Target image:', targetImage ? 'uploaded file' : 'template URL');
    console.log('Batch fusion - Target URL:', targetImageUrl);

    if (!sourceImages || sourceImages.length === 0) {
      return NextResponse.json(
        { error: '请上传至少一张源图片' },
        { status: 400 }
      );
    }

    if (sourceImages.length > 10) {
      return NextResponse.json(
        { error: '最多只能上传10张源图片' },
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
    const sourceImageBuffers = [];
    for (const sourceImage of sourceImages) {
      const buffer = Buffer.from(await sourceImage.arrayBuffer());
      sourceImageBuffers.push(buffer);
    }

    // 处理目标图片
    let targetImageBuffer: Buffer;
    let targetImageType = 'image/jpeg';

    if (targetImage) {
      // 使用上传的文件
      targetImageBuffer = Buffer.from(await targetImage.arrayBuffer());
      targetImageType = targetImage.type;
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

        // 从文件名推断文件类型
        const filenameLower = filename.toLowerCase();
        if (filenameLower.includes('.png')) {
          targetImageType = 'image/png';
        } else if (filenameLower.includes('.webp')) {
          targetImageType = 'image/webp';
        } else {
          targetImageType = 'image/jpeg';
        }
      } catch (error) {
        console.error('Failed to load template image:', error);
        return NextResponse.json(
          { error: '无法加载模板图片' },
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

    const payload = {
      sourceImageBuffers,
      targetImageBuffer,
      prompt,
    };

    // Vercel 环境检测: 同步处理而非异步作业队列
    const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isVercel) {
      // Vercel 模式: 同步处理,直接返回结果
      console.log('Vercel环境检测: 使用同步处理模式');

      const processor = new BatchBackgroundFusionProcessor();
      const result = await processor.process({ id: `vercel-${Date.now()}`, payload } as any);

      return NextResponse.json({
        ok: true,
        data: result
      });
    } else {
      // 本地模式: 异步作业队列
      const job = JobQueue.createJob('batch-background-fusion', payload);

      console.log('Created batch fusion job:', job.id);
      jobRunner.runJob(job.id);
      console.log('Started batch fusion job processing:', job.id);

      return NextResponse.json({
        jobId: job.id,
        message: '批量背景融合任务已创建',
        totalImages: sourceImages.length,
      });
    }

  } catch (error) {
    console.error('Batch background fusion error:', error);
    return NextResponse.json(
      { error: '批量背景融合失败' },
      { status: 500 }
    );
  }
}
