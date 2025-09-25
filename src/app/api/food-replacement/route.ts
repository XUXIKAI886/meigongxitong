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

    // 调用API进行食物替换 - 添加重试机制
    let response;
    let lastError;
    for (let retry = 0; retry < 3; retry++) {
      try {
        console.log(`Food Replacement Single - Attempt ${retry + 1}/3`);
        response = await apiClient.replaceFoodInBowl({
          sourceImage: sourceImageBase64,
          targetImage: targetImageBase64,
          prompt: prompt
        });
        console.log(`Food Replacement Single - Successfully processed on attempt ${retry + 1}`);
        break; // 成功则跳出重试循环
      } catch (error) {
        lastError = error;
        console.log(`Food Replacement Single - Attempt ${retry + 1} failed:`, error.message);
        if (retry < 2) {
          console.log(`Food Replacement Single - Waiting 2 seconds before retry ${retry + 2}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!response) {
      console.log(`Food Replacement Single - All 3 attempts failed, final error:`, lastError.message);
      throw lastError;
    }

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

    // 食物替换专用提示词 - 强化版，严格区分不同食物类型的容器处理规则
    const prompt = `Please perform precise and COMPLETE food replacement between two images with STRICT CONTAINER RULES:

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
