import { NextRequest, NextResponse } from 'next/server';
import { ProductRefineApiClient } from '@/lib/api-client';
import { jobRunner, JobQueue, JobProcessor } from '@/lib/job-queue';
import { FileManager } from '@/lib/upload';
import { resolveTemplateFromUrl } from '@/lib/template-path';
import { config } from '@/lib/config';
import { readFile } from 'fs/promises';
import fs from 'fs';
import type { Job } from '@/types';
import type {
  FoodReplacementJobPayload,
  FoodReplacementJobResult,
} from '@/types/job-payloads';


// 强制使用 Node.js Runtime (Vercel部署必需)
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

// 食物替换处理器
class FoodReplacementProcessor implements JobProcessor<FoodReplacementJobPayload, FoodReplacementJobResult> {
  async process(jobData: Job<FoodReplacementJobPayload, FoodReplacementJobResult>): Promise<FoodReplacementJobResult> {
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

    // 保存生成的图片 (使用 FileManager 自动适配 Vercel)
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 获取图片尺寸 (优先使用轻量级解析，避免Sharp在Vercel环境的兼容问题)
    let actualWidth = 1200;
    let actualHeight = 900;

    try {
      // 尝试从PNG头部读取尺寸 (IHDR chunk)
      if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) { // PNG signature
        actualWidth = imageBuffer.readUInt32BE(16);
        actualHeight = imageBuffer.readUInt32BE(20);
      }
    } catch (error) {
      console.log('Failed to parse image dimensions, using defaults:', error);
    }

    const savedFile = await FileManager.saveBuffer(
      imageBuffer,
      `food-replacement-${Date.now()}.png`,
      'image/png',
      true // 使用 public/generated 目录
    );

    return {
      imageUrl: savedFile.url,
      width: actualWidth,
      height: actualHeight
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

    // 食物替换专用提示词 - 优化版：更强制、更明确
    const prompt = `⚠️ 核心任务：从源图片中提取【纯食物】，放入目标图片的空碗中。

🚫 强制规则 - 必须严格遵守（优先级最高）：

【步骤1：识别并分离】
- 仔细观察源图片，识别出【食物】和【器皿】两个独立部分
- 食物 = 可以吃的部分（米饭、面条、菜、肉、汤汁等）
- 器皿 = 不能吃的部分（碗、盘、杯、盒、餐具等）

【步骤2：只提取食物】
⛔ 强制删除以下内容（不得出现在最终图片中）：
   × 碗、盘、杯、盒、碟、盆、罐、瓶、杯子
   × 筷子、勺子、叉子、刀、餐垫、餐巾、托盘
   × 包装盒、包装袋、外卖盒、一次性餐盒
   × 桌面、桌布、背景、墙壁、装饰品
   × 水印、Logo、"美团外卖"、"饿了么"等文字

✅ 只保留以下内容：
   ✓ 米饭、面条、菜品、肉类、汤汁、酱料
   ✓ 食物本身的配料（葱花、香菜、调料等）
   ✓ 纯粹的食物内容，不包含任何容器

【步骤3：关键检查】
在生成图片前，再次确认：
1. 源图片的碗/盘/容器是否被完全移除？（必须是"是"）
2. 只剩下纯食物了吗？（必须是"是"）
3. 如果看到任何器皿边缘、碗边、盘子轮廓 → 立即删除

⚠️ 常见错误示例（绝对禁止）：
❌ 错误：提取了"食物+碗" → 碗的边缘出现在图片中
❌ 错误：提取了"食物+盘子边缘" → 看到白色/黑色的盘子轮廓
❌ 错误：保留了筷子或勺子
✅ 正确：只有食物本身，完全看不到任何器皿痕迹

【步骤4：放入目标碗中】
- 将提取的纯食物自然地放入目标图片的空碗中
- 食物份量：填满碗的70-80%，看起来丰盛饱满
- 摆放位置：食物铺满碗内空间，不只堆在中心
- 液体食物（汤、面汤）：呈现自然倾倒状态
- 固体食物（米饭、炒菜）：保持自然堆叠层次

【步骤5：美化食物】
- 色彩增强：提高食物整体亮度30-40%，增加饱和度40-50%
  * 绿色蔬菜 → 鲜嫩翠绿
  * 肉类 → 诱人红褐色
  * 米饭 → 明亮纯白色
  * 酱汁 → 浓郁诱人色
- 质感优化：添加自然光泽和高光效果，让食物看起来新鲜、油亮、诱人
- 光影匹配：调整食物光照，与目标碗的环境一致

【最终检查清单】（输出前必须确认）：
✅ 1. 源图片的碗/盘/容器已完全移除？
✅ 2. 看不到任何器皿边缘、轮廓、痕迹？
✅ 3. 只有纯食物出现在目标碗中？
✅ 4. 食物填满目标碗的70-80%？
✅ 5. 食物色彩鲜艳、有食欲？

⚠️ 核心原则：
只提取食物本身，完全删除所有器皿。目标图片中只能看到【纯食物+目标碗】，绝不能出现【源图片的器皿】。`;

    // 转换源图片为Buffer
    const sourceImageBuffer = Buffer.from(await sourceImage.arrayBuffer());

    // 获取目标图片Buffer
    let targetImageBuffer: Buffer;
    if (targetImage) {
      // 使用上传的文件
      targetImageBuffer = Buffer.from(await targetImage.arrayBuffer());
    } else {
      // 使用模板 URL 时先进行安全校验
      try {
        const templatePath = resolveTemplateFromUrl(targetImageUrl, [
          { prefix: '/api/eleme-templates/', rootDir: 'public/饿了么产品图模板' },
          { prefix: '/api/templates/', rootDir: '目标图片模板' },
        ]);

        console.log('Loading template:', {
          url: targetImageUrl,
          templatePath,
        });

        if (!fs.existsSync(templatePath)) {
          throw new Error(`Template file not found: ${templatePath}`);
        }

        targetImageBuffer = await readFile(templatePath);
      } catch (error) {
        console.error('Failed to load template image:', error);
        return NextResponse.json(
          { error: '模板路径不合法或文件不存在' },
          { status: 400 }
        );
      }
    }
    const payload: FoodReplacementJobPayload = {
      sourceImageBuffer: sourceImageBuffer.toString('base64'), // base64 string
      targetImageBuffer: targetImageBuffer.toString('base64'), // base64 string
      prompt: prompt.trim(),
    };

    // Vercel 环境检测: 同步处理而非异步作业队列
    const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isVercel) {
      // Vercel 模式: 同步处理,直接返回结果
      console.log('Vercel环境检测: 使用同步处理模式');

      const processor = new FoodReplacementProcessor();
      const jobLike: Job<FoodReplacementJobPayload, FoodReplacementJobResult> = {
        id: `vercel-${Date.now()}`,
        type: 'food-replacement',
        status: 'queued',
        payload,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await processor.process(jobLike);

      return NextResponse.json({
        ok: true,
        data: result
      });
    } else {
      // 本地模式: 异步作业队列
      const job = JobQueue.createJob<FoodReplacementJobPayload, FoodReplacementJobResult>(
        'food-replacement',
        payload,
        clientIp
      );

      console.log(`Starting food replacement job processing for ${job.id}`);
      jobRunner.runJob(job.id);

      return NextResponse.json({ ok: true, jobId: job.id });
    }
  } catch (error: unknown) {
    console.error('Food replacement error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
