import { NextRequest, NextResponse } from 'next/server';
import { ProductRefineApiClient } from '@/lib/api/clients/ProductRefineApiClient';
import { FileManager } from '@/lib/upload';
import { withRetry, rateLimiter, handleApiError } from '@/lib/api-client';
import { config } from '@/lib/config';
import sharp from 'sharp';

// 强制使用 Node.js Runtime
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

// 图片去食物处理器
class RemoveFoodProcessor {
  private geminiClient = new ProductRefineApiClient();

  async process(imageBuffer: Buffer, imageMimeType: string): Promise<{
    imageUrl: string;
    width: number;
    height: number;
  }> {
    // 获取原图尺寸
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width || 1024;
    const originalHeight = metadata.height || 1024;

    console.log('Remove Food Processing:', {
      originalSize: `${originalWidth}×${originalHeight}`,
      mimeType: imageMimeType
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

    // 调整图片尺寸到原图大小
    const resizedBuffer = await sharp(resultImageBuffer)
      .resize(originalWidth, originalHeight, {
        fit: 'fill', // 填充模式,确保完全匹配原图尺寸
        kernel: sharp.kernel.lanczos3 // 使用高质量缩放算法
      })
      .png({ quality: 100 }) // 最高质量输出
      .toBuffer();

    // 保存处理后的图片
    const savedFile = await FileManager.saveBuffer(
      resizedBuffer,
      `remove-food-${Date.now()}.png`,
      'image/png',
      true
    );

    return {
      imageUrl: savedFile.url,
      width: originalWidth,
      height: originalHeight
    };
  }

  // 创建去食物提示词
  private createRemoveFoodPrompt(): string {
    return `图片编辑任务：
请移除图片中的所有食物，只保留干净的空器皿和背景。

具体要求：
1. 移除所有食物：米饭、菜肴、肉类、汤汁、配菜、调料等所有食物元素
2. 保留器皿：完整保留碗、盘子、碟子、杯子等所有容器，保持其原有的样式、颜色、光泽
3. 保留背景：完整保留背景、桌面、桌布、装饰品等非食物元素
4. **保留所有文字**：必须完整保留图片中的所有文字内容，包括：
   - 店名、品牌名称
   - 价格标签、促销信息
   - 菜品名称、说明文字
   - Logo、标语、口号
   - 任何其他文字元素
   - 文字的字体、颜色、位置、大小都不能改变
5. 清洁效果：器皿内部应该是干净的、空的，没有任何食物残留
6. 保持真实：器皿、背景、文字的质感、光影、颜色都要保持自然真实
7. 完整性：不要裁剪或改变图片的构图，保持原有的视角和布局

关键要点：
- 只移除食物，其他元素(器皿、背景、文字、装饰)完全保持不变
- 器皿要干净整洁，像刚洗好的新碗一样
- **特别重要**：图片中的所有文字必须100%保留，不能模糊、变形或删除
- 保持图片的整体协调性和真实感
- 不要添加任何新的元素`;
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

    if (!imageFile) {
      return NextResponse.json(
        { error: '请上传图片' },
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

    // 处理图片
    const processor = new RemoveFoodProcessor();
    const result = await processor.process(imageBuffer, imageFile.type);

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
