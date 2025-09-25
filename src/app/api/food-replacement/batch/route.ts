import { NextRequest, NextResponse } from 'next/server';
import { ProductRefineApiClient } from '@/lib/api-client';
import { jobRunner, JobQueue } from '@/lib/job-queue';
import { config } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

// Job processor for batch food replacement
class BatchFoodReplacementProcessor {
  private apiClient: ProductRefineApiClient;

  constructor() {
    this.apiClient = new ProductRefineApiClient();
  }

  async process(jobData: any): Promise<{ processedCount: number; results: any[] }> {
    const payload = jobData.payload;
    const { sourceImageBuffers, sourceImageTypes, targetImageBuffer, targetImageType, prompt } = payload;

    console.log(`Starting batch food replacement for ${sourceImageBuffers.length} source images`);
    
    const results = [];
    let processedCount = 0;

    // 确保输出目录存在
    const generatedDir = path.join(process.cwd(), 'public', 'generated');
    await mkdir(generatedDir, { recursive: true });

    for (let i = 0; i < sourceImageBuffers.length; i++) {
      try {
        // 更新进度
        const progress = Math.round(((i + 1) / sourceImageBuffers.length) * 100);
        JobQueue.updateJob(jobData.id, { progress });

        console.log(`Processing source image ${i + 1}/${sourceImageBuffers.length}, size: ${sourceImageBuffers[i].length} bytes`);

        // 转换为base64格式
        const sourceImageBase64 = `data:${sourceImageTypes[i]};base64,${sourceImageBuffers[i]}`;
        const targetImageBase64 = `data:${targetImageType};base64,${targetImageBuffer}`;

        console.log(`Food Replacement API Request for image ${i + 1}:`, {
          sourceImageSize: sourceImageBuffers[i].length,
          targetImageSize: targetImageBuffer.length,
          prompt: prompt.substring(0, 100) + '...'
        });

        // 重试机制：最多重试3次
        let response;
        let lastError;
        for (let retry = 0; retry < 3; retry++) {
          try {
            console.log(`Attempt ${retry + 1}/3 for image ${i + 1}`);
            response = await this.apiClient.replaceFoodInBowl({
              sourceImage: sourceImageBase64,
              targetImage: targetImageBase64,
              prompt: prompt
            });
            break; // 成功则跳出重试循环
          } catch (error) {
            lastError = error;
            console.log(`Attempt ${retry + 1} failed for image ${i + 1}:`, error.message);
            if (retry < 2) {
              // 等待2秒后重试
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

        if (!response) {
          throw lastError || new Error(`Failed to process image ${i + 1} after 3 attempts`);
        }

        console.log(`Food replacement response for image ${i + 1}:`, {
          hasData: !!response.data,
          dataLength: response.data?.length,
          firstItem: response.data?.[0] ? Object.keys(response.data[0]) : 'none'
        });

        if (!response.data || response.data.length === 0) {
          throw new Error(`No replacement image generated for source image ${i + 1}`);
        }

        const imageData = response.data[0];
        console.log(`Image data structure for image ${i + 1}:`, {
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
          throw new Error(`No valid image data found in response for source image ${i + 1}`);
        }

        // 保存生成的图片
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const filename = `food-replacement-${i + 1}-${uuidv4()}.png`;
        const filepath = path.join(generatedDir, filename);
        
        await writeFile(filepath, imageBuffer);

        const result = {
          sourceImageIndex: i,
          imageUrl: `/generated/${filename}`,
          width: 1200,
          height: 900,
          originalSourceType: sourceImageTypes[i]
        };

        results.push(result);
        processedCount++;

        console.log(`Successfully processed source image ${i + 1}, saved as ${filename}`);

      } catch (error) {
        console.error(`Error processing source image ${i + 1}:`, error);
        
        // 记录失败的图片，但继续处理其他图片
        results.push({
          sourceImageIndex: i,
          error: error instanceof Error ? error.message : 'Unknown error',
          originalSourceType: sourceImageTypes[i]
        });
      }
    }

    console.log(`Batch food replacement completed. Processed: ${processedCount}/${sourceImageBuffers.length}`);

    return {
      processedCount,
      results
    };
  }
}

// 注册批量食物替换处理器
jobRunner.registerProcessor('batch-food-replacement', new BatchFoodReplacementProcessor());

export async function POST(request: NextRequest) {
  try {
    // 获取客户端IP
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    console.log('Batch food replacement request from:', clientIp);

    // 检查并发限制
    if (!JobQueue.canUserCreateJob(clientIp, config.jobs.maxConcurrentPerUser)) {
      return NextResponse.json(
        { error: `您已达到最大并发任务数限制 (${config.jobs.maxConcurrentPerUser})，请等待当前任务完成后再试` },
        { status: 429 }
      );
    }

    // 解析表单数据
    const formData = await request.formData();
    const sourceImageFiles = formData.getAll('sourceImages') as File[];
    const targetImageFile = formData.get('targetImage') as File;
    const targetImageUrl = formData.get('targetImageUrl') as string;
    const prompt = formData.get('prompt') as string ||
      `Please perform precise and COMPLETE food replacement between two images with STRICT CONTAINER RULES:

CRITICAL FOOD EXTRACTION REQUIREMENTS BY TYPE:

1. FOR RICE BOWLS (盖浇饭) ONLY:
   - Extract food + bowl together (this is the ONLY exception)
   - Include the rice, toppings, and the serving bowl as one complete unit
   - This applies ONLY to rice bowls with toppings (盖浇饭)

2. FOR ALL OTHER FOODS - ABSOLUTELY NO CONTAINERS:
   - Noodles/Pasta: Extract ONLY the noodles, sauce, and ingredients - NO bowls, NO plates
   - Soup: Extract ONLY the soup liquid and ingredients - NO bowls, NO containers
   - Stir-fry dishes: Extract ONLY the food - NO plates, NO containers
   - Salads: Extract ONLY the vegetables and ingredients - NO plates, NO bowls
   - Meat dishes: Extract ONLY the meat and sauce - NO plates, NO containers
   - Any liquid foods: Extract ONLY the liquid and solid ingredients - NO containers

3. STRICT CONTAINER EXCLUSION (except rice bowls):
   - ABSOLUTELY EXCLUDE: bowls, plates, cups, boxes, containers, packaging
   - ABSOLUTELY EXCLUDE: chopsticks, spoons, forks, utensils, napkins
   - ABSOLUTELY EXCLUDE: background, tables, surfaces, decorative items
   - ONLY extract the pure food contents in their natural form

4. SPECIAL HANDLING FOR LIQUID/SEMI-LIQUID FOODS:
   - For noodle soups: Extract noodles + broth + ingredients as floating/suspended elements
   - For saucy dishes: Extract food + sauce as naturally flowing/coating elements
   - For soups: Extract liquid + ingredients in natural liquid form
   - Make these foods appear naturally placed in the target bowl without source containers

5. PLACEMENT IN TARGET BOWL:
   - Place extracted food contents naturally in the target bowl
   - For liquid foods: make them appear as if poured into the target bowl
   - Maintain natural food physics and appearance
   - Ensure realistic volume and proportions

6. VISUAL QUALITY & FOOD ENHANCEMENT:
   - ENHANCE food colors to make them vibrant and appetizing
   - BRIGHTEN overall food appearance while maintaining natural look
   - INCREASE saturation and contrast to make food more appealing
   - ADD subtle gloss/sheen to wet foods (soups, sauces, glazed items)
   - MAKE vegetables appear fresh and crisp with vivid colors
   - ENHANCE meat colors to look juicy and well-cooked
   - BRIGHTEN rice to appear fluffy and fresh (not dull or gray)
   - IMPROVE overall food presentation to restaurant-quality standards
   - Adjust lighting, shadows, and reflections to match target environment
   - Blend edges seamlessly with target bowl interior
   - Create natural, realistic food placement with professional visual appeal

REMEMBER: Only rice bowls (盖浇饭) can include containers. ALL other foods must be extracted WITHOUT any containers, bowls, plates, or utensils.

Return the final image with properly extracted food contents placed naturally in the target bowl.`;

    if (!sourceImageFiles || sourceImageFiles.length === 0) {
      return NextResponse.json(
        { error: '请上传至少一张源图片' },
        { status: 400 }
      );
    }

    if (!targetImageFile && !targetImageUrl) {
      return NextResponse.json(
        { error: '请上传目标图片或选择模板' },
        { status: 400 }
      );
    }

    if (sourceImageFiles.length > 10) {
      return NextResponse.json(
        { error: '最多支持同时处理10张源图片' },
        { status: 400 }
      );
    }

    // 转换所有源图片为base64格式
    const sourceImageBuffers = [];
    const sourceImageTypes = [];

    for (const file of sourceImageFiles) {
      const imageBuffer = Buffer.from(await file.arrayBuffer());
      sourceImageBuffers.push(imageBuffer.toString('base64'));
      sourceImageTypes.push(file.type);
    }

    // 获取目标图片Buffer
    let targetImageBuffer: Buffer;
    let targetImageType: string;

    if (targetImageFile) {
      // 使用上传的文件
      targetImageBuffer = Buffer.from(await targetImageFile.arrayBuffer());
      targetImageType = targetImageFile.type;
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

    // 创建任务
    const job = JobQueue.createJob('batch-food-replacement', {
      sourceImageBuffers,
      sourceImageTypes,
      targetImageBuffer: targetImageBuffer.toString('base64'),
      targetImageType,
      prompt: prompt.trim(),
    }, clientIp);

    // 开始任务处理
    console.log(`Starting batch food replacement job processing for ${job.id} with ${sourceImageFiles.length} source images`);
    jobRunner.runJob(job.id);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: `批量食物替换任务已创建，正在处理 ${sourceImageFiles.length} 张源图片...`
    });

  } catch (error) {
    console.error('Batch food replacement error:', error);
    return NextResponse.json(
      { error: '批量食物替换请求失败' },
      { status: 500 }
    );
  }
}
