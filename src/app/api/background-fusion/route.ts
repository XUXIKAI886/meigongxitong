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

// Job processor for background fusion
class BackgroundFusionProcessor {
  async process(jobData: any) {
    const { sourceImageBuffer, targetImageBuffer, prompt } = jobData.payload;

    const client = new ProductRefineApiClient();

    // 转换Buffer为base64 data URL
    const sourceImageBase64 = `data:image/png;base64,${sourceImageBuffer.toString('base64')}`;
    const targetImageBase64 = `data:image/png;base64,${targetImageBuffer.toString('base64')}`;

    // 使用 replaceFoodInBowl 方法进行背景融合
    const response = await client.replaceFoodInBowl({
      sourceImage: sourceImageBase64,
      targetImage: targetImageBase64,
      prompt,
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

    // 保存生成的图片 (使用 FileManager 自动适配 Vercel)
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const savedFile = await FileManager.saveBuffer(
      imageBuffer,
      `background-fusion-${Date.now()}.png`,
      'image/png',
      true
    );

    return {
      imageUrl: savedFile.url,
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

    // 优化的背景融合提示词 - 量化版本
    const prompt = `背景融合任务：将源图片中的食物完美融合到目标背景场景中

核心要求：提取源图片的食物主体，融合到目标背景中，并进行专业级视觉美化。

1. 食物提取与融合规则：
   - 智能识别并提取源图片中的食物主体(包括食物+容器,如果有)
   - 自动去除源图片的原始背景、杂物、装饰等无关元素
   - 将提取的食物主体无缝融合到目标背景场景中
   - 保持食物的完整性、原始形态和真实质感
   - 确保食物与目标背景的透视、比例、角度自然协调

2. 菜品色彩增强 (量化指令 - 非常重要!!!)：
   ✨ 具体食材色彩调整 (必须执行)：
   - 绿色蔬菜(青椒/青菜/生菜)→鲜嫩翠绿色(饱和度+50%,亮度+30%)
   - 肉类(牛肉/猪肉/鸡肉)→诱人红褐色/金黄色(饱和度+40%,亮度+25%)
   - 红色食材(辣椒/番茄/草莓)→鲜艳红色(饱和度+60%,亮度+20%)
   - 橙黄色食材(南瓜/胡萝卜/芒果)→明亮橙黄色(饱和度+55%,亮度+25%)
   - 白色食材(米饭/面条/豆腐)→纯净明亮白(亮度+40%)
   - 棕褐色食材(烤肉/炸物)→金黄诱人色(饱和度+45%,亮度+30%)
   - 酱汁/汤汁→浓郁诱人色(饱和度+45%,亮度+25%)

   ✨ 整体色彩优化：
   - **整体亮度提升**：将食物整体亮度提高30-40%，消除暗淡灰暗效果
   - **色彩饱和度**：大幅增加所有食材的色彩饱和度，让颜色更加浓郁鲜艳
   - **色彩对比度**：适当增加色彩对比度，让食物更有层次感和立体感
   - **色温调整**：调整为温暖色调，增强食欲感和新鲜感

3. 专业摄影效果强化 (必须执行)：
   ✨ 高光与光泽效果：
   - **高光效果**：为食物表面添加明显的高光点，模拟新鲜出锅的油亮效果
   - **光泽增强**：为湿润食物添加自然光泽(汤汁/酱料/油亮的肉类/新鲜蔬菜)
   - **反光处理**：增强食物表面的反光效果，提升视觉吸引力

   ✨ 质感与细节优化：
   - 让蔬菜呈现翠绿新鲜、水嫩脆爽的质感
   - 让肉类呈现多汁饱满、烹饪完美的色泽
   - 让米饭/面条呈现松软蓬松、颗粒/条理分明的质感
   - 让酱汁呈现浓稠诱人、自然流动的状态
   - 让炸物呈现金黄酥脆、诱人的质感

   ✨ 光影三维效果：
   - 添加戏剧性的三维光照效果，增强食物的深度和体积感
   - 强化明暗对比，让高光区域更明亮，阴影区域更深邃
   - 增强食物的立体感和层次感，避免平面化
   - 优化环境光与反射光，营造专业影棚效果

   ✨ 商业级精修：
   - 去除所有瑕疵、划痕、斑点等不完美细节
   - 提升材质质感，增强食物的高级感和奢华感
   - 调整整体明度和亮度，保持自然色彩平衡
   - 应用商业级后期处理，达到广告摄影标准

4. 背景融合技术要求：
   - 完美的边缘融合，绝对无缝衔接，无任何生硬边界
   - 匹配目标背景的光照条件、色温、环境氛围
   - 统一整体色调和亮度，确保食物与背景和谐一致
   - 添加适当的阴影、反射和环境光效果，增强真实感
   - 保持目标背景的景深、透视和空间关系
   - 确保食物看起来自然地存在于背景场景中

5. 最终输出要求：
   - **专业级美食摄影质量**：达到商业广告摄影标准
   - **极致食欲感**：让食物看起来极其诱人，观看者立即产生食欲
   - **自然真实性**：场景构图自然可信，像真实拍摄的照片
   - **视觉冲击力**：增强食物吸引力，与背景完美融合
   - **商用级成品**：可直接用于营销推广的高质量视觉呈现
   - **量化色彩提升**：显著增强食物色泽的鲜艳度和亮度(按上述量化指标执行)
   - **专业摄影效果**：模拟专业美食摄影的光线、色彩和质感处理

关键原则：提取食物主体，完美融合背景，量化色彩增强(饱和度+40-60%,亮度+20-40%)，专业摄影级光影效果，商业广告级视觉呈现。`;

    const payload = {
      sourceImageBuffer,
      targetImageBuffer,
      prompt,
    };

    // Vercel 环境检测: 同步处理而非异步作业队列
    const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

    if (isVercel) {
      // Vercel 模式: 同步处理,直接返回结果
      console.log('Vercel环境检测: 使用同步处理模式');

      const processor = new BackgroundFusionProcessor();
      const result = await processor.process({ id: `vercel-${Date.now()}`, payload } as any);

      return NextResponse.json({
        ok: true,
        data: result
      });
    } else {
      // 本地模式: 异步作业队列
      const job = JobQueue.createJob('background-fusion', payload);

      jobRunner.runJob(job.id);

      return NextResponse.json({
        jobId: job.id,
        message: '背景融合任务已创建',
      });
    }

  } catch (error) {
    console.error('Background fusion error:', error);
    return NextResponse.json(
      { error: '背景融合失败' },
      { status: 500 }
    );
  }
}
