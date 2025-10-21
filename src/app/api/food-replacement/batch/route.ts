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
        } catch (error) {
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
      `图片融合任务：从源图片提取食物，替换到目标图片的器皿中

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
   - **绝对不要水印**：图片右下角或任何位置的半透明水印(如"美团外卖"、"饿了么"、品牌Logo等)
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
   - **食物份量**：提取的食物要充分填满容器，达到7-8分满的视觉效果
   - **合理摆放**：食物要自然地铺满容器内部空间，不要只集中在正中心
   - **边缘处理**：食物应适当接近容器边缘，但不溢出，营造丰盛饱满的效果
   - **立体感**：保持食物的堆叠层次感和立体感，让份量看起来充足
   - 确保食物与目标器皿的边缘无缝融合，自然衔接

4. 菜品美化要求 (非常重要!!!)：
   ✨ 色彩增强 (必须执行)：
   - **具体食材色彩调整**：
     * 青椒/青菜绿色→鲜嫩翠绿色(饱和度+50%,亮度+30%)
     * 肉丝/肉类褐色→诱人红褐色(饱和度+40%,亮度+25%)
     * 辣椒/番茄红色→鲜艳红色(饱和度+60%,亮度+20%)
     * 葱段/香菜绿色→明亮翠绿色(饱和度+50%,亮度+30%)
     * 米饭/面条白色→纯净明亮白(亮度+40%)
     * 酱汁/汤汁→浓郁诱人色(饱和度+45%,亮度+25%)
   - **整体亮度提升**：将图片整体亮度提高30-40%，消除暗淡灰暗效果
   - **色彩饱和度**：大幅增加所有食材的色彩饱和度，让颜色更加浓郁
   - **色彩对比度**：适当增加色彩对比度，让食物更有层次感和立体感

   ✨ 质感优化：
   - **高光效果**：为食物表面添加明显的高光点，模拟新鲜出锅的油亮效果
   - 为湿润食物添加自然光泽(汤汁、酱料、油亮的肉类)
   - 让蔬菜呈现翠绿新鲜、水嫩脆爽的质感
   - 让肉类呈现多汁饱满、烹饪完美的色泽
   - 让米饭呈现松软蓬松、颗粒分明的质感(避免暗淡发灰)
   - 让酱汁呈现浓稠诱人、自然流动的状态

   ✨ 光影优化：
   - 调整食物的光照效果，使其与目标器皿环境匹配
   - 添加适当的高光和阴影，增强食物的立体感
   - 优化反射效果，让湿润食物更加真实

   ✨ 专业摄影效果：
   - 将食物呈现提升至专业餐厅摄影级别
   - 模拟专业美食摄影的光线和色彩处理，让食物极具视觉冲击力
   - 确保食物看起来新鲜、美味、有食欲
   - 修复任何模糊、暗淡、不自然的部分
   - 让最终效果达到商业美食摄影的标准

5. 最终输出要求：
   - 返回只包含纯食物内容、完美放置在目标器皿中的最终图片
   - 确保食物与器皿的融合自然真实、毫无违和感
   - **份量优化**：食物要充分填满容器空间(7-8分满)，避免边缘留白过多
   - **色彩提升**：显著增强食物色泽的鲜艳度和亮度，让颜色更加明亮诱人
   - 食物色泽鲜明、质感逼真、极具食欲感
   - 达到专业美食摄影的视觉标准

关键原则：无论任何食物类型(包括盖浇饭)，都只提取食物本体，绝不提取器皿。将食物完美融合到目标器皿中，充分填满容器(7-8分满)，并进行专业级的视觉美化(量化色彩增强)。`;

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
        // 从URL中提取文件名和平台
        const urlParts = targetImageUrl.split('/');
        const filename = decodeURIComponent(urlParts[urlParts.length - 1]);

        // 根据URL路径判断是美团还是饿了么模板
        const isElemeTemplate = targetImageUrl.includes('/api/eleme-templates/');
        const templateDir = isElemeTemplate ? '饿了么产品图模板' : '目标图片模板';
        const templatePath = path.join(process.cwd(), templateDir, filename);

        console.log('Batch - Loading template:', {
          url: targetImageUrl,
          isElemeTemplate,
          templateDir,
          filename,
          fullPath: templatePath
        });

        // 检查文件是否存在
        if (!fs.existsSync(templatePath)) {
          throw new Error(`Template file not found: ${filename} in ${templateDir}`);
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

  } catch (error) {
    console.error('Batch food replacement error:', error);
    return NextResponse.json(
      { error: '批量食物替换请求失败' },
      { status: 500 }
    );
  }
}
