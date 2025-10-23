import { NextRequest, NextResponse } from 'next/server';
import { ProductRefineApiClient } from '@/lib/api-client';
import { jobRunner, JobQueue } from '@/lib/job-queue';
import { FileManager } from '@/lib/upload';
import { resolveTemplateFromUrl } from '@/lib/template-path';
import { Job } from '@/types';
import { readFile } from 'fs/promises';
import fs from 'fs';


// 强制使用 Node.js Runtime (Vercel部署必需)
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

interface BatchBackgroundFusionJobPayload {
  sourceImageBuffers: Buffer[];
  targetImageBuffer: Buffer;
  prompt: string;
}

interface BatchBackgroundFusionResult {
  sourceImageIndex: number;
  status: 'success' | 'failed';
  imageUrl?: string;
  width?: number;
  height?: number;
  error?: string;
}

// Job processor for batch background fusion
class BatchBackgroundFusionProcessor {
  async process(jobData: Job) {
    const { sourceImageBuffers, targetImageBuffer, prompt } = jobData.payload as BatchBackgroundFusionJobPayload;
    const client = new ProductRefineApiClient();
    
    const results: BatchBackgroundFusionResult[] = [];
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
        let response: Awaited<ReturnType<ProductRefineApiClient[''replaceFoodInBowl'']>> | null = null;
        let lastError: unknown = null;
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

    if (targetImage) {
      // 使用上传的文件
      targetImageBuffer = Buffer.from(await targetImage.arrayBuffer());
    } else {
      try {
        const templatePath = resolveTemplateFromUrl(targetImageUrl, [
          { prefix: '/api/eleme-background-templates/', rootDir: '����ô�����ں�' },
          { prefix: '/api/background-fusion/templates/', rootDir: 'shiwutihuangongju' },
        ]);

        console.log('Batch background fusion template:', {
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
        console.error('Failed to load template image:', error);
        return NextResponse.json(
          { error: '无法加载模板图片' },
          { status: 400 }
        );
      }
    }

    // 优化的背景融合提示词 - 量化版本（与单张处理相同）
    const prompt = `背景融合任务：将源图片中的产品完美融合到目标背景场景中

核心要求：提取源图片的产品主体，融合到目标背景中，控制合理尺寸占比，并进行专业级视觉美化。

1. 产品提取与融合规则：
   - 智能识别并提取源图片中的产品主体(包括产品+包装/容器,如果有)
   - 自动去除源图片的原始背景、杂物、装饰等无关元素
   - 将提取的产品主体无缝融合到目标背景场景中
   - 保持产品的完整性、原始形态和真实质感
   - 确保产品与目标背景的透视、比例、角度自然协调

2. 产品尺寸与位置控制 (非常重要!!!)：
   **严格尺寸要求**：
   - 产品在最终图片中的占比必须为画面的 **30-35%** (约1/3)
   - 产品不能太小（避免占比小于25%）
   - 产品不能太大（避免占比超过40%）
   - 产品应放置在画面的视觉焦点位置（通常为中心偏下或黄金分割点）

   **尺寸计算方式**：
   - 测量产品的实际像素宽度和高度
   - 产品面积 = 产品宽度 × 产品高度
   - 画面面积 = 画面总宽度 × 画面总高度
   - 确保：产品面积 / 画面面积 ≈ 0.30-0.35 (30-35%)

   **位置布局**：
   - 优先放置在画面中心偏下位置（视觉重心）
   - 确保产品四周有足够的呼吸空间
   - 产品底部留白约占画面高度的15-20%
   - 产品顶部留白约占画面高度的20-25%
   - 产品左右两侧留白各约占画面宽度的30-35%

3. 产品色彩增强 (量化指令 - 非常重要!!!)：
   ✨ 具体产品色彩调整 (必须执行)：
   - 包装色彩：增强品牌色饱和度+40-50%，让包装颜色更鲜艳醒目
   - 产品主体：提升整体亮度+30-40%，消除暗淡效果
   - 金属质感：增强高光和反射效果，让金属部分更有光泽
   - 透明材质：优化透明度和折射效果，让液体/玻璃更通透
   - 文字/标识：确保文字清晰可读，适当增强对比度

   ✨ 整体色彩优化：
   - **整体亮度提升**：将产品整体亮度提高30-40%，消除暗淡灰暗效果
   - **色彩饱和度**：大幅增加产品的色彩饱和度，让颜色更加浓郁鲜艳
   - **色彩对比度**：适当增加色彩对比度，让产品更有层次感和立体感
   - **色温调整**：根据产品类型调整色温（食品饮料偏暖色，其他产品保持真实色温）

4. 专业摄影效果强化 (必须执行)：
   ✨ 高光与光泽效果：
   - **高光效果**：为产品表面添加适当的高光点，增强立体感和质感
   - **光泽增强**：为光滑表面添加自然光泽（玻璃/金属/塑料包装）
   - **反光处理**：增强产品表面的反光效果，提升视觉吸引力

   ✨ 质感与细节优化：
   - 包装材质：呈现真实的材质质感（纸盒/塑料/金属/玻璃）
   - 印刷文字：确保商标、文字清晰锐利，颜色准确
   - 产品细节：保留产品的所有细节特征，不过度模糊
   - 边缘处理：产品边缘清晰自然，与背景完美融合

   ✨ 光影三维效果：
   - 添加专业的三维光照效果，增强产品的深度和体积感
   - 强化明暗对比，让高光区域更明亮，阴影区域更深邃
   - 增强产品的立体感和层次感，避免平面化
   - 优化环境光与反射光，营造专业影棚效果

   ✨ 商业级精修：
   - 去除所有瑕疵、划痕、斑点等不完美细节
   - 提升材质质感，增强产品的高级感和品质感
   - 调整整体明度和亮度，保持自然色彩平衡
   - 应用商业级后期处理，达到广告摄影标准

5. 背景融合技术要求：
   - 完美的边缘融合，绝对无缝衔接，无任何生硬边界
   - 匹配目标背景的光照条件、色温、环境氛围
   - 统一整体色调和亮度，确保产品与背景和谐一致
   - 添加适当的阴影、反射和环境光效果，增强真实感
   - 保持目标背景的景深、透视和空间关系
   - 确保产品看起来自然地存在于背景场景中
   - **严格控制产品尺寸**：产品占比保持在30-35%，不能过大或过小

6. 最终输出要求：
   - **专业级产品摄影质量**：达到商业广告摄影标准
   - **合理的视觉占比**：产品在画面中占比约1/3（30-35%），视觉平衡完美
   - **自然真实性**：场景构图自然可信，像真实拍摄的照片
   - **视觉冲击力**：增强产品吸引力，与背景完美融合
   - **商用级成品**：可直接用于营销推广的高质量视觉呈现
   - **量化色彩提升**：显著增强产品色泽的鲜艳度和亮度(按上述量化指标执行)
   - **专业摄影效果**：模拟专业产品摄影的光线、色彩和质感处理
   - **精准尺寸控制**：确保产品既不过小（避免被忽视）也不过大（避免压迫感），占比稳定在30-35%

关键原则：提取产品主体，**严格控制尺寸占比30-35%（约1/3）**，完美融合背景，量化色彩增强(饱和度+40-50%,亮度+30-40%)，专业摄影级光影效果，商业广告级视觉呈现。`;

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
