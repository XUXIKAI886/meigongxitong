import { NextRequest, NextResponse } from 'next/server';
import { JobQueue, jobRunner } from '@/lib/job-queue';
import { ImageApiClient, ChatApiClient, withRetry, rateLimiter, handleApiError } from '@/lib/api-client';
import { FileManager } from '@/lib/upload';
import { config } from '@/lib/config';
import { createReversePromptRequestWithBase64 } from '@/lib/prompt-templates';
import { ApiResponse } from '@/types';

// Logo设计工作室处理器
class LogoStudioProcessor {
  private imageClient = new ImageApiClient();
  private chatClient = new ChatApiClient();

  async process(job: any): Promise<{
    logoUrl: string;
    storefrontUrl: string;
    posterUrl: string;
    reversePrompt: string;
    finalPrompt: string;
  }> {
    const { storeName, originalLogoBuffer, originalLogoType } = job.payload;

    // ✅ 按照标准化文档：从base64恢复Buffer并转换为完整data URL
    const sourceBuffer = Buffer.from(originalLogoBuffer, 'base64');
    const base64Image = this.bufferToBase64(sourceBuffer, originalLogoType);

    console.log('Logo Studio processing:', {
      storeName,
      hasBuffer: !!originalLogoBuffer,
      bufferLength: originalLogoBuffer?.length,
      mimeType: originalLogoType,
      base64Preview: base64Image?.substring(0, 50) + '...'
    });

    // 步骤1: 反推原logo的设计提示词
    console.log('Creating reverse prompt request with base64 image');
    const reversePromptRequest = createReversePromptRequestWithBase64(
      base64Image,
      'logo',
      storeName,
      '美食', // 默认分类
      undefined, // slogan
      `请分析这个logo的设计风格、色彩搭配、字体特点、图形元素等，生成详细的设计提示词，用于创建类似风格的新logo设计。`
    );

    console.log('Reverse prompt request created:', {
      messagesCount: reversePromptRequest.messages.length,
      systemMessageLength: reversePromptRequest.messages[0]?.content?.toString().length,
      userMessageType: typeof reversePromptRequest.messages[1]?.content
    });

    const reversePromptResponse = await withRetry(async () => {
      return await this.chatClient.createCompletion({
        model: config.chat.modelName,
        messages: reversePromptRequest.messages,
        max_tokens: 1500, // 增加token限制，确保获得完整的设计提示词
        temperature: 0.7,
      });
    });

    const reversePrompt = reversePromptResponse.choices[0]?.message?.content || '';
    console.log('Reverse prompt generated:', reversePrompt.substring(0, 200) + '...');

    // 步骤2: 直接使用反推提示词，只进行店铺名称的自然融合
    const finalPrompt = this.createMinimalPrompt(reversePrompt, storeName);
    console.log('Final prompt created (minimal):', {
      length: finalPrompt.length,
      preview: finalPrompt.substring(0, 200) + '...'
    });

    // 步骤3: 并行生成三种设计（使用相同的精简提示词，并传递店铺名称）
    const [logoResult, storefrontResult, posterResult] = await Promise.all([
      this.generateLogo(finalPrompt, storeName),
      this.generateStorefront(finalPrompt, storeName),
      this.generatePoster(finalPrompt, storeName)
    ]);

    return {
      logoUrl: logoResult.url,
      storefrontUrl: storefrontResult.url,
      posterUrl: posterResult.url,
      reversePrompt,
      finalPrompt
    };
  }

  // ✅ 标准base64转换方法
  private bufferToBase64(buffer: Buffer, mimeType: string): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  // 创建精简的提示词，智能替换店铺名称
  private createMinimalPrompt(reversePrompt: string, storeName: string): string {
    // 智能识别并替换反推提示词中的店铺名称
    // 常见的店铺名称模式匹配和替换
    let enhancedPrompt = reversePrompt;

    // 1. 尝试替换常见的店铺名称模式
    const commonPatterns = [
      /杨四季羊肉汤/g,
      /东北四季饺子/g,
      /四季饺子/g,
      /东北.*?饺子/g,
      /.*?四季.*?/g,
      /.*?饺子.*?/g,
      /.*?羊肉汤.*?/g
    ];

    // 逐个尝试替换模式
    for (const pattern of commonPatterns) {
      if (pattern.test(enhancedPrompt)) {
        enhancedPrompt = enhancedPrompt.replace(pattern, storeName);
        console.log(`Replaced pattern ${pattern} with ${storeName}`);
        break;
      }
    }

    // 2. 如果没有找到匹配的模式，在提示词开头添加店铺名称
    if (enhancedPrompt === reversePrompt) {
      enhancedPrompt = `为"${storeName}"设计logo。${reversePrompt}`;
      console.log(`No pattern matched, prepended store name: ${storeName}`);
    }

    // 3. 确保店铺名称在提示词中被强调
    if (!enhancedPrompt.includes(storeName)) {
      enhancedPrompt = `${enhancedPrompt}。店铺名称必须是"${storeName}"。`;
    }

    return enhancedPrompt;
  }

  private async generateLogo(prompt: string, storeName: string) {
    // 为Logo生成添加特定的要求，确保店铺名称正确显示，保持原有背景风格
    const logoPrompt = `${prompt}。Logo设计，店铺名称必须显示为"${storeName}"，专业logo设计，高质量，保持原有背景风格和色彩`;
    console.log('Generating Logo with enhanced prompt:', logoPrompt.substring(0, 200) + '...');

    const response = await withRetry(async () => {
      return await this.imageClient.generateImage({
        prompt: logoPrompt,
        size: config.images.sizes.logo,
        n: 1,
      });
    });

    const imageData = response.data[0];
    const imageBuffer = await this.downloadImage(imageData.url);
    const savedFile = await FileManager.saveBuffer(
      imageBuffer,
      `logo-${Date.now()}.png`,
      'image/png'
    );

    return { url: savedFile.url };
  }

  private async generateStorefront(prompt: string, storeName: string) {
    // 为店招生成添加特定的要求，确保店铺名称正确显示
    const storefrontPrompt = `${prompt}。店招设计，店铺名称必须显示为"${storeName}"，商业店面招牌设计，高质量，专业设计`;
    console.log('Generating Storefront with enhanced prompt:', storefrontPrompt.substring(0, 200) + '...');

    const response = await withRetry(async () => {
      return await this.imageClient.generateImage({
        prompt: storefrontPrompt,
        size: config.images.sizes.storefront,
        n: 1,
      });
    });

    const imageData = response.data[0];
    const imageBuffer = await this.downloadImage(imageData.url);
    const savedFile = await FileManager.saveBuffer(
      imageBuffer,
      `storefront-${Date.now()}.png`,
      'image/png'
    );

    return { url: savedFile.url };
  }

  private async generatePoster(prompt: string, storeName: string) {
    // 为海报生成添加特定的要求，确保店铺名称正确显示
    const posterPrompt = `${prompt}。海报设计，店铺名称必须显示为"${storeName}"，宣传海报设计，高质量，专业设计`;
    console.log('Generating Poster with enhanced prompt:', posterPrompt.substring(0, 200) + '...');

    const response = await withRetry(async () => {
      return await this.imageClient.generateImage({
        prompt: posterPrompt,
        size: config.images.sizes.poster,
        n: 1,
      });
    });

    const imageData = response.data[0];
    const imageBuffer = await this.downloadImage(imageData.url);
    const savedFile = await FileManager.saveBuffer(
      imageBuffer,
      `poster-${Date.now()}.png`,
      'image/png'
    );

    return { url: savedFile.url };
  }

  private async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download generated image');
    }
    return Buffer.from(await response.arrayBuffer());
  }
}

// 注册处理器
jobRunner.registerProcessor('logo-studio', new LogoStudioProcessor());

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // 应用速率限制
    const canProceed = await rateLimiter.checkLimit(
      `logo-studio:${clientIp}`,
      config.rateLimit.perUser.requests,
      config.rateLimit.perUser.windowMs
    );

    if (!canProceed) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }

    // 检查用户并发限制
    if (!JobQueue.canUserCreateJob(clientIp, config.jobs.maxConcurrentPerUser)) {
      return NextResponse.json(
        { error: '并发任务过多，请等待现有任务完成后再试' },
        { status: 429 }
      );
    }

    // ✅ 按照标准化文档：解析表单数据
    const formData = await request.formData();
    const storeName = formData.get('storeName') as string;
    const originalLogoFile = formData.get('originalLogo') as File;

    if (!storeName?.trim()) {
      return NextResponse.json(
        { error: '请填写店铺名称' },
        { status: 400 }
      );
    }

    if (!originalLogoFile) {
      return NextResponse.json(
        { error: '请上传原logo图片' },
        { status: 400 }
      );
    }

    // ✅ 按照标准化文档：转换为base64格式
    const imageBuffer = Buffer.from(await originalLogoFile.arrayBuffer());

    // 创建任务，传递base64数据
    const job = JobQueue.createJob('logo-studio', {
      storeName: storeName.trim(),
      originalLogoBuffer: imageBuffer.toString('base64'), // base64字符串
      originalLogoType: originalLogoFile.type, // MIME类型
    }, clientIp);

    // 启动任务处理
    console.log(`Starting job processing for ${job.id}`);
    jobRunner.runJob(job.id);

    const response: ApiResponse = {
      success: true,
      jobId: job.id,
      message: 'Logo设计任务已创建，正在处理中...'
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Logo studio API error:', error);
    
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: 500 }
    );
  }
}
