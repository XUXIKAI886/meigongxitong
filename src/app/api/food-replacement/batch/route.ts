import { NextRequest, NextResponse } from 'next/server';
import { ProductRefineApiClient } from '@/lib/api-client';
import { jobRunner, JobQueue, JobProcessor } from '@/lib/job-queue';
import { FileManager } from '@/lib/upload';
import { resolveTemplateFromUrl } from '@/lib/template-path';
import { config } from '@/lib/config';
import { mkdir, readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import type { Job } from '@/types';
import type {
  BatchFoodReplacementJobPayload,
  BatchFoodReplacementJobResult,
  BatchFoodReplacementResultItem,
} from '@/types/job-payloads';


// 强制使用 Node.js Runtime (Vercel部署必需)
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

// Job processor for batch food replacement
class BatchFoodReplacementProcessor implements JobProcessor<BatchFoodReplacementJobPayload, BatchFoodReplacementJobResult> {
  private apiClient: ProductRefineApiClient;

  constructor() {
    this.apiClient = new ProductRefineApiClient();
  }

  async process(jobData: Job<BatchFoodReplacementJobPayload, BatchFoodReplacementJobResult>): Promise<BatchFoodReplacementJobResult> {
    const payload = jobData.payload;
    const { sourceImageBuffers, sourceImageTypes, targetImageBuffer, targetImageType, prompt } = payload;

    console.log(`Starting batch food replacement for ${sourceImageBuffers.length} source images`);

    const results: BatchFoodReplacementResultItem[] = [];
    let processedCount = 0;

    // 确保输出目录存在 (仅在非Vercel环境)
    const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
    if (!isVercel) {
      const generatedDir = path.join(process.cwd(), 'public', 'generated');
      await mkdir(generatedDir, { recursive: true });
    }

    for (let i = 0; i < sourceImageBuffers.length; i++) {
      try {
        // 更新进度 (仅本地模式)
        if (!jobData.id.startsWith('vercel-')) {
          const progress = Math.round(((i + 1) / sourceImageBuffers.length) * 100);
          JobQueue.updateJob(jobData.id, { progress });
        }

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
        let response: Awaited<ReturnType<ProductRefineApiClient['replaceFoodInBowl']>> | null = null;
        let lastError: unknown = null;
        for (let retry = 0; retry < 3; retry++) {
          try {
            console.log(`Attempt ${retry + 1}/3 for image ${i + 1}`);
            response = await this.apiClient.replaceFoodInBowl({
              sourceImage: sourceImageBase64,
              targetImage: targetImageBase64,
              prompt: prompt
            });
            break; // 成功则跳出重试循环
          } catch (error: unknown) {
            lastError = error;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.log(`Attempt ${retry + 1} failed for image ${i + 1}:`, errorMessage);
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
        } catch (error: unknown) {
          console.log(`Failed to parse image dimensions for image ${i + 1}, using defaults:`, error);
        }

        const savedFile = await FileManager.saveBuffer(
          imageBuffer,
          `food-replacement-batch-${i + 1}-${Date.now()}.png`,
          'image/png',
          true
        );

        const result = {
          sourceImageIndex: i,
          imageUrl: savedFile.url,
          width: actualWidth,
          height: actualHeight,
          originalSourceType: sourceImageTypes[i]
        };

        results.push(result);
        processedCount++;

        console.log(`Successfully processed source image ${i + 1}, saved to ${savedFile.url}`);

      } catch (error: unknown) {
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
      `⚠️ 核心任务：从源图片中提取【纯食物】，放入目标图片的空碗中。

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
      // 使用模板 URL 时先进行安全校验
      try {
        const templatePath = resolveTemplateFromUrl(targetImageUrl, [
          { prefix: '/api/eleme-templates/', rootDir: '����ô��Ʒͼģ��' },
          { prefix: '/api/templates/', rootDir: 'Ŀ��ͼƬģ��' },
        ]);

        console.log('Batch - Loading template:', {
          url: targetImageUrl,
          templatePath,
        });

        if (!fs.existsSync(templatePath)) {
          throw new Error(`Template file not found: ${templatePath}`);
        }

        targetImageBuffer = await readFile(templatePath);
        const templateFilename = path.basename(templatePath);

        // 从文件名推断文件类型
        const filenameLower = templateFilename.toLowerCase();
        if (filenameLower.includes('.png')) {
          targetImageType = 'image/png';
        } else if (filenameLower.includes('.webp')) {
          targetImageType = 'image/webp';
        } else {
          targetImageType = 'image/jpeg';
        }
      } catch (error: unknown) {
        console.error('Failed to load template image:', error);
        return NextResponse.json(
          { error: '无法加载模板图片' },
          { status: 400 }
        );
      }
    }

    const payload = {
      sourceImageBuffers,
      sourceImageTypes,
      targetImageBuffer: targetImageBuffer.toString('base64'),
      targetImageType,
      prompt: prompt.trim(),
    };

    // Vercel 环境检测: 同步处理而非异步作业队列
    const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isVercel) {
      // Vercel 模式: 同步处理,直接返回结果
      console.log('Vercel环境检测: 使用同步处理模式');

      const processor = new BatchFoodReplacementProcessor();
      const result = await processor.process({ id: `vercel-${Date.now()}`, payload } as any);

      return NextResponse.json({
        ok: true,
        data: result
      });
    } else {
      // 本地模式: 异步作业队列
      const job = JobQueue.createJob('batch-food-replacement', payload, clientIp);

      console.log(`Starting batch food replacement job processing for ${job.id} with ${sourceImageFiles.length} source images`);
      jobRunner.runJob(job.id);

      return NextResponse.json({
        ok: true,
        jobId: job.id,
        message: `批量食物替换任务已创建，正在处理 ${sourceImageFiles.length} 张源图片...`
      });
    }

  } catch (error: unknown) {
    console.error('Batch food replacement error:', error);
    return NextResponse.json(
      { error: '批量食物替换请求失败' },
      { status: 500 }
    );
  }
}
