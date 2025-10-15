import { NextRequest, NextResponse } from 'next/server';
import { ProductRefineApiClient } from '@/lib/api/clients/ProductRefineApiClient';
import { FileManager } from '@/lib/upload';
import { withRetry, rateLimiter, handleApiError } from '@/lib/api-client';
import { config } from '@/lib/config';

// 强制使用 Node.js Runtime
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

// 图片去食物处理器
class RemoveFoodProcessor {
  private geminiClient = new ProductRefineApiClient();

  async process(imageBuffer: Buffer, imageMimeType: string, originalWidth: number, originalHeight: number): Promise<{
    imageUrl: string;
    width: number;
    height: number;
  }> {
    console.log('Remove Food Processing:', {
      mimeType: imageMimeType,
      originalSize: `${originalWidth}×${originalHeight}`
    });

    // 转换为base64 data URL
    const imageDataUrl = `data:${imageMimeType};base64,${imageBuffer.toString('base64')}`;

    // 创建去食物提示词
    const prompt = this.createRemoveFoodPrompt();

    console.log('Remove Food Prompt:', prompt.substring(0, 100) + '...');

    // 调用Gemini API进行食物移除
    let response;
    let lastError;
    for (let retry = 0; retry < 3; retry++) {
      try {
        console.log(`Remove Food - Attempt ${retry + 1}/3`);
        response = await this.geminiClient.enhanceProduct({
          image: imageDataUrl,
          prompt: prompt
        });
        console.log(`Remove Food - Successfully processed on attempt ${retry + 1}`);
        break;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`Remove Food - Attempt ${retry + 1} failed:`, errorMessage);
        if (retry < 2) {
          console.log(`Remove Food - Waiting 2 seconds before retry ${retry + 2}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!response) {
      const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
      console.log(`Remove Food - All 3 attempts failed, final error:`, errorMessage);
      throw lastError;
    }

    if (!response.data || response.data.length === 0) {
      throw new Error('No image generated from Remove Food process');
    }

    const imageData = response.data[0];

    // 处理图片数据
    let resultImageBuffer: Buffer;
    if (imageData.url.startsWith('data:')) {
      // Gemini返回的是data URL格式
      const base64Data = imageData.url.split(',')[1];
      resultImageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // 如果是HTTP URL,需要下载
      resultImageBuffer = await this.downloadImage(imageData.url);
    }

    // 保存处理后的图片（不进行尺寸调整，保持AI生成的原始尺寸）
    const savedFile = await FileManager.saveBuffer(
      resultImageBuffer,
      `remove-food-${Date.now()}.png`,
      'image/png',
      true
    );

    // 返回上传图片的原始尺寸
    return {
      imageUrl: savedFile.url,
      width: originalWidth,
      height: originalHeight
    };
  }

  // 创建去食物提示词
  private createRemoveFoodPrompt(): string {
    return `图片编辑任务：彻底移除所有食物，只保留绝对干净的空器皿和背景。

核心要求：
1. **完全移除所有食物元素**：
   - 所有固体食物：米饭、面条、菜肴、肉类、海鲜、配菜、点心等
   - 所有液体：汤汁、酱汁、汤水、油、调料液等
   - 所有残留物：食物碎屑、汤渍、油渍、水渍、污迹等
   - 所有食物痕迹：食物留下的水印、油印、颜色残留等

2. **器皿必须绝对干净**：
   - 器皿内部：光洁如新，完全没有任何食物、汤汁、油渍、水渍的痕迹
   - 器皿外部：保持原有的干净状态，没有汤汁溅出的痕迹
   - 清洁标准：像刚从消毒柜拿出来的新餐具一样干净、明亮
   - 特别注意：碗边、盘边不能有任何食物残留或油渍痕迹
   - 器皿表面：要保持陶瓷/玻璃/金属原有的光泽和质感

3. **完整保留器皿本身**：
   - 保持碗、盘子、碟子、杯子等容器的形状、样式、颜色、花纹
   - 保持器皿原有的光泽、质感、材质特征
   - 不改变器皿的位置、角度、透视关系

4. **完整保留背景和装饰**：
   - 保留桌面、桌布、背景墙等所有背景元素
   - 保留餐具、筷子、勺子、叉子等餐具（如果有）
   - 保留装饰物、餐巾、托盘等所有非食物元素

5. **100%保留所有文字**：
   - 店名、品牌名称、商标Logo
   - 价格标签、促销信息、特价标签
   - 菜品名称、食品说明、营养信息
   - 标语、口号、广告语
   - 任何印刷文字、手写文字、标签文字
   - 文字的字体、颜色、大小、位置、清晰度都必须保持原样

6. **保持自然真实**：
   - 光影效果要自然协调
   - 器皿的高光、阴影、反光要真实
   - 整体色调和氛围要与原图一致
   - 不要添加任何新的元素或效果

7. **构图完整性**：
   - 不裁剪图片，保持原有尺寸比例
   - 保持原有的拍摄角度和视角
   - 保持所有元素的相对位置关系

重点强调：
- ❌ 不允许：器皿内有任何食物残留、汤汁残留、油渍痕迹、水渍印记、颜色残留
- ✅ 必须：器皿内部完全干净、光洁、明亮，像全新的餐具一样
- ✅ 必须：所有文字内容100%完整清晰保留
- ✅ 必须：保持器皿原有的材质光泽和质感
- ✅ 必须：背景和非食物装饰元素完全不变

清洁标准参考：
想象这个器皿刚刚在专业餐厅的洗碗机中清洗并消毒完毕，然后用干净的布擦干，放在干净的桌面上拍照，没有任何食物接触过的痕迹。`;
  }

  private async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download generated image');
    }
    return Buffer.from(await response.arrayBuffer());
  }
}

// GET方法处理 - 返回API信息
export async function GET() {
  return NextResponse.json({
    name: 'Remove Food API',
    version: '1.0.0',
    description: '智能移除图片中的食物，保留空器皿、背景和文字',
    method: 'POST',
    requiredFields: ['image'],
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    maxFileSize: '10MB'
  });
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown';

    // 应用速率限制
    const canProceed = await rateLimiter.checkLimit(
      `remove-food:${clientIp}`,
      config.rateLimit.perUser.requests,
      config.rateLimit.perUser.windowMs
    );

    if (!canProceed) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const width = formData.get('width');
    const height = formData.get('height');

    if (!imageFile) {
      return NextResponse.json(
        { error: '请上传图片' },
        { status: 400 }
      );
    }

    if (!width || !height) {
      return NextResponse.json(
        { error: '缺少图片尺寸信息' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: '只支持 JPG、PNG、WebP 格式' },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (imageFile.size > config.upload.maxFileSize) {
      return NextResponse.json(
        { error: '图片大小不能超过 10MB' },
        { status: 400 }
      );
    }

    // 转换文件为Buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const imageWidth = parseInt(width as string, 10);
    const imageHeight = parseInt(height as string, 10);

    // 处理图片
    const processor = new RemoveFoodProcessor();
    const result = await processor.process(imageBuffer, imageFile.type, imageWidth, imageHeight);

    return NextResponse.json({
      ok: true,
      data: result,
      message: '处理成功'
    });

  } catch (error: any) {
    console.error('Remove Food API error:', error);

    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: 500 }
    );
  }
}
