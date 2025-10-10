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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`Food Replacement Single - Attempt ${retry + 1} failed:`, errorMessage);
        if (retry < 2) {
          console.log(`Food Replacement Single - Waiting 2 seconds before retry ${retry + 2}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!response) {
      const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
      console.log(`Food Replacement Single - All 3 attempts failed, final error:`, errorMessage);
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
    const clientIp = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    console.log('Food replacement request from:', clientIp);

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

    // 检查用户并发限制
    if (!JobQueue.canUserCreateJob(clientIp, config.jobs.maxConcurrentPerUser)) {
      return NextResponse.json(
        { error: '并发任务过多，请等待现有任务完成后再试' },
        { status: 429 }
      );
    }

    // 食物替换专用提示词 - 统一版，所有食物都只提取食物本体，不提取器皿
    const prompt = `Please perform precise and COMPLETE food replacement between two images with STRICT FOOD-ONLY EXTRACTION:

核心要求：识别源图片中的食物，只提取纯食物内容，绝对不提取任何盛装食物的器皿。

1. 严格的食物提取规则 - 适用于所有食物类型：
   ✅ 只提取食物本体内容：
   - 盖浇饭：只提取米饭+浇头(肉类/蔬菜/酱汁) - 绝对不要碗
   - 面条/意面：只提取面条+汤汁+配料 - 绝对不要碗/盘
   - 汤类：只提取汤液+食材 - 绝对不要碗/容器
   - 炒菜：只提取菜品+酱汁 - 绝对不要盘子
   - 沙拉：只提取蔬菜+调料 - 绝对不要碗/盘
   - 肉类菜肴：只提取肉+酱汁+配菜 - 绝对不要盘子
   - 任何液体食物：只提取液体+固体食材 - 绝对不要容器

   ❌ 绝对排除所有器皿和杂物：
   - 绝对不要：碗、盘、杯、盒、碟、容器、包装盒
   - 绝对不要：筷子、勺子、叉子、刀、餐具、餐巾
   - 绝对不要：背景、桌子、桌布、装饰品、其他杂物
   - 原则：只提取能吃的食物内容，其他一律不要

2. 液体/半液体食物的特殊处理：
   - 面汤：提取面条+汤汁+配料，呈现为自然漂浮/悬浮状态
   - 酱汁类：提取食物+酱汁，呈现为自然流动/包裹状态
   - 汤品：提取汤液+食材，保持自然液体形态
   - 确保液体食物在目标器皿中呈现自然倾倒/盛装的效果

3. 食物放置到目标器皿的要求：
   - 将提取的纯食物内容自然放置到目标器皿中
   - 液体食物：呈现自然倾倒/盛放的效果，与器皿完美贴合
   - 固体食物：呈现自然堆放/摆放的状态，符合重力和物理特性
   - 保持食物的真实体积和合理比例
   - 确保食物与目标器皿的边缘无缝融合，自然衔接

4. 食物视觉修复与美化增强 (重点)：
   ✨ 色彩增强：
   - 大幅提升食物色彩的鲜艳度和饱和度，让食物更诱人
   - 增强色彩对比度，让食物层次更分明
   - 调整色温，让食物呈现温暖、新鲜的色调

   ✨ 质感优化：
   - 为湿润食物添加自然光泽(汤汁、酱料、油亮的肉类)
   - 让蔬菜呈现翠绿新鲜、水嫩脆爽的质感
   - 让肉类呈现多汁饱满、烹饪完美的色泽
   - 让米饭呈现松软蓬松、颗粒分明的质感(避免暗淡发灰)
   - 让酱汁呈现浓稠诱人、自然流动的状态

   ✨ 光影优化：
   - 调整食物的光照效果，使其与目标器皿环境匹配
   - 添加适当的高光和阴影，增强食物的立体感
   - 优化反射效果，让湿润食物更加真实

   ✨ 整体提升：
   - 将食物呈现提升至专业餐厅摄影级别
   - 确保食物看起来新鲜、美味、有食欲
   - 修复任何模糊、暗淡、不自然的部分
   - 让最终效果达到商业美食摄影的标准

5. 最终输出要求：
   - 返回只包含纯食物内容、完美放置在目标器皿中的最终图片
   - 确保食物与器皿的融合自然真实、毫无违和感
   - 食物色泽鲜明、质感逼真、极具食欲感
   - 达到专业美食摄影的视觉标准

关键原则：无论任何食物类型(包括盖浇饭)，都只提取食物本体，绝不提取器皿。将食物完美融合到目标器皿中，并进行专业级的视觉美化。`;

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
    }, clientIp);

    // Start job processing
    console.log(`Starting food replacement job processing for ${job.id}`);
    jobRunner.runJob(job.id);

    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (error) {
    console.error('Food replacement error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
