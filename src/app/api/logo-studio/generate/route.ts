import { NextRequest, NextResponse } from 'next/server';
// 更新导入以修复方法调用问题
import { JobQueue, jobRunner } from '@/lib/job-queue';
import { ImageApiClient } from '@/lib/api/clients/ImageApiClient';
import { ChatApiClient } from '@/lib/api/clients/ChatApiClient';
import { ProductRefineApiClient } from '@/lib/api/clients/ProductRefineApiClient';
import { withRetry, rateLimiter, handleApiError } from '@/lib/api-client';
import { FileManager } from '@/lib/upload';
import { config } from '@/lib/config';
import { createReversePromptRequestWithBase64 } from '@/lib/prompt-templates';
import { ApiResponse } from '@/types';

// Logo设计工作室处理器
class LogoStudioProcessor {
  private imageClient = new ImageApiClient();
  private chatClient = new ChatApiClient();

  async process(job: any): Promise<{
    avatarUrl: string;
    storefrontUrl: string;
    posterUrl: string;
    reversePrompt: string;
    finalPrompt: string;
  }> {
    const { storeName, originalLogoBuffer, originalLogoType, templateStoreName, isTemplate } = job.payload;

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
      `请分析这个餐饮类logo的设计风格、色彩搭配、字体特点、图形元素等，生成简洁准确的中文设计提示词，专门用于豆包AI图像生成。要求：1）使用中文描述 2）简洁明确，避免冗长分析 3）突出关键设计元素（颜色、字体、图形、布局等） 4）**特别重要：必须详细识别和描述所有食物元素**（菜品、食材、餐具、摆盘等）5）适合豆包等中文AI图像生成模型使用 6）确保描述专业、清晰、易于理解 7）重点描述视觉风格特征和食物细节`
    );

    console.log('Reverse prompt request created:', {
      messagesCount: reversePromptRequest.messages.length,
      systemMessageLength: reversePromptRequest.messages[0]?.content?.toString().length,
      userMessageType: typeof reversePromptRequest.messages[1]?.content
    });

    const reversePromptResponse = await withRetry(async () => {
      return await this.chatClient.createChatCompletion({
        model: config.chat.modelName,
        messages: reversePromptRequest.messages,
        max_tokens: 1500, // 增加token限制，确保获得完整的设计提示词
        temperature: 0.7,
      });
    });

    const reversePrompt = reversePromptResponse.choices[0]?.message?.content || '';
    console.log('Reverse prompt generated:', reversePrompt.substring(0, 200) + '...');

    // 步骤2: 使用反推提示词，进行精确或智能的店铺名称替换
    const finalPrompt = this.createMinimalPrompt(reversePrompt, storeName, isTemplate, templateStoreName);
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
      avatarUrl: logoResult.url,
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

  // 创建精简的提示词，针对中文AI模型优化，支持精确店铺名替换
  private createMinimalPrompt(reversePrompt: string, storeName: string, isTemplate: boolean, templateStoreName?: string): string {
    let enhancedPrompt = reversePrompt.trim();

    console.log('Original reverse prompt:', enhancedPrompt.substring(0, 200) + '...');

    // 清理可能的分析性文字，保留核心设计描述
    const analysisPatterns = [
      /^这个logo.*?特点如下：/,
      /^从图像中可以看出.*?：/,
      /^分析这个logo.*?：/,
      /^设计一个类似风格的logo：/,
      /^Logo设计提示词：/,
      /^根据分析.*?，提示词为：/,
      /^综合分析.*?：/,
      /^该logo.*?特征：/
    ];

    for (const pattern of analysisPatterns) {
      enhancedPrompt = enhancedPrompt.replace(pattern, '').trim();
    }

    // 智能处理店铺名称，确保中文提示词格式正确
    if (isTemplate && templateStoreName?.trim()) {
      // 模板模式：精确替换模板中的店铺名称
      console.log(`Template mode: replacing "${templateStoreName}" with "${storeName}"`);

      // 精确替换模板店铺名
      const templateNameRegex = new RegExp(templateStoreName.trim(), 'g');
      if (templateNameRegex.test(enhancedPrompt)) {
        enhancedPrompt = enhancedPrompt.replace(templateNameRegex, storeName);
        console.log('Template store name replaced successfully');
      } else {
        // 如果反推提示词中没有找到模板店铺名，则进行智能替换
        console.log('Template store name not found in prompt, using intelligent replacement');
        enhancedPrompt = `为"${storeName}"设计logo，参考模板风格。${enhancedPrompt}`;
      }
    } else {
      // 上传模式：智能识别和替换
      if (!enhancedPrompt.includes(storeName)) {
        // 查找并替换可能的店铺名称占位符
        const namePlaceholders = [
          /店铺名称|商店名称|品牌名称|企业名称/g,
          /\[店名\]|\[商店\]|\[品牌\]|\[企业\]/g
        ];

        let nameReplaced = false;
        for (const placeholder of namePlaceholders) {
          if (placeholder.test(enhancedPrompt)) {
            enhancedPrompt = enhancedPrompt.replace(placeholder, `"${storeName}"`);
            nameReplaced = true;
            break;
          }
        }

        // 如果没有找到占位符，在开头添加店铺名称
        if (!nameReplaced) {
          enhancedPrompt = `为"${storeName}"设计logo。${enhancedPrompt}`;
        }
      }
    }

    // 确保提示词适合豆包模型
    if (!enhancedPrompt.includes('logo') && !enhancedPrompt.includes('标志') && !enhancedPrompt.includes('商标')) {
      enhancedPrompt = `logo设计：${enhancedPrompt}`;
    }

    console.log('Enhanced prompt for Chinese AI:', enhancedPrompt.substring(0, 200) + '...');
    return enhancedPrompt;
  }

  private addStyleConsistencyInstructions(basePrompt: string, storeName: string): string {
    return `${basePrompt}

【重要：保持品牌一致性约束】
CRITICAL: 无论生成什么类型的设计（Logo、店招、海报），都必须严格遵守以下一致性原则：
1. 使用完全相同的色彩方案和配色比例
2. 使用完全相同的字体风格和排版方式
3. 保持相同的整体设计风格和视觉语言
4. 店铺名称"${storeName}"的字体、颜色、效果必须完全一致
5. 背景风格、装饰元素、图案必须保持高度统一
6. 只允许改变画布比例和布局，不允许改变核心设计元素
7. 生成的设计必须让人一眼看出是同一个品牌的不同应用形式`;
  }

  private async generateLogo(prompt: string, storeName: string) {
    // Logo设计：使用中文反推提示词，添加质量控制指令
    const basePrompt = this.addStyleConsistencyInstructions(prompt, storeName);
    const logoPrompt = `${basePrompt}

【Logo设计要求】：
- 确保图像高清晰度，无马赛克和模糊效果
- 店铺名称"${storeName}"必须清晰可读
- 专业logo设计，构图简洁明了
- 色彩搭配合理，对比度适中
- 适合商业使用的标志设计
- 方形比例，800x800像素，作为核心品牌标识`;

    console.log('Generating Logo with differentiated prompt:', logoPrompt.substring(0, 200) + '...');

    const response = await withRetry(async () => {
      return await this.imageClient.generateImage({
        prompt: logoPrompt,
        size: config.images.sizes.logo,
        n: 1,
        quality: 'hd', // 高质量模式
        style: 'natural', // 自然风格，避免过度艺术化
      });
    });

    const imageData = response.data[0];
    const imageBuffer = await this.downloadImage(imageData.url);
    const savedFile = await FileManager.saveBuffer(
      imageBuffer,
      `logo-${Date.now()}.png`,
      'image/png',
      true  // 使用public/generated目录，实现统一存储
    );

    return { url: savedFile.url };
  }

  private async generateStorefront(prompt: string, storeName: string) {
    // 线上店招设计：适配外卖平台的店铺横幅图片
    const basePrompt = this.addStyleConsistencyInstructions(prompt, storeName);
    const storefrontPrompt = `${basePrompt}

【店招设计要求】：
- 保持与Logo完全相同的设计风格、色彩搭配、字体风格和视觉元素
- 店铺名称"${storeName}"必须醒目突出，字体样式与Logo保持一致
- 横版布局，1280x720像素，适合外卖平台店铺展示
- 在Logo基础上进行横向扩展，不改变核心设计元素
- 背景、图案、装饰元素与Logo保持高度一致
- 整体视觉效果必须让人一眼认出是同一品牌`;

    console.log('Generating Storefront with consistent style prompt:', storefrontPrompt.substring(0, 200) + '...');

    const response = await withRetry(async () => {
      return await this.imageClient.generateImage({
        prompt: storefrontPrompt,
        size: config.images.sizes.storefront,
        n: 1,
        quality: 'hd', // 高质量模式
        style: 'natural', // 自然风格，避免过度艺术化
      });
    });

    const imageData = response.data[0];
    const imageBuffer = await this.downloadImage(imageData.url);
    const savedFile = await FileManager.saveBuffer(
      imageBuffer,
      `storefront-${Date.now()}.png`,
      'image/png',
      true  // 使用public/generated目录，实现统一存储
    );

    return { url: savedFile.url };
  }

  private async generatePoster(prompt: string, storeName: string) {
    // 海报设计：保持Logo风格，但适配超宽横幅布局
    const basePrompt = this.addStyleConsistencyInstructions(prompt, storeName);
    const posterPrompt = `${basePrompt}

【海报设计要求】：
- 保持与Logo完全相同的设计风格、色彩搭配、字体风格和视觉元素
- 店铺名称"${storeName}"必须醒目突出，字体样式与Logo保持一致
- 超宽横幅布局，1440x480像素，适合宣传展示
- 在Logo基础上进行横向扩展，不改变核心设计元素
- 背景、图案、装饰元素与Logo保持高度一致
- 整体视觉效果必须让人一眼认出是同一品牌
- 适合广告宣传的横幅海报效果`;

    console.log('Generating Poster with consistent style prompt:', posterPrompt.substring(0, 200) + '...');

    const response = await withRetry(async () => {
      return await this.imageClient.generateImage({
        prompt: posterPrompt,
        size: config.images.sizes.poster,
        n: 1,
        quality: 'hd', // 高质量模式
        style: 'natural', // 自然风格，避免过度艺术化
      });
    });

    const imageData = response.data[0];
    const imageBuffer = await this.downloadImage(imageData.url);
    const savedFile = await FileManager.saveBuffer(
      imageBuffer,
      `poster-${Date.now()}.png`,
      'image/png',
      true  // 使用public/generated目录，实现统一存储
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

// Logo设计工作室融合处理器
class LogoStudioFusionProcessor {
  private imageClient = new ImageApiClient();
  private chatClient = new ChatApiClient();
  private geminiClient = new ProductRefineApiClient();

  async process(job: { payload: any }): Promise<{
    storefrontUrl?: string;
    posterUrl?: string;
    avatarUrl?: string;
    fusionPrompts?: {
      storefront?: string;
      poster?: string;
      avatar?: string;
    };
  }> {
    const {
      storeName,
      templateStoreName,
      dishImageBuffer,
      dishImageType,
      generateType,
      template,
      storefrontTemplate,
      posterTemplate,
      avatarTemplate
    } = job.payload;

    console.log('Logo Studio Fusion processing:', {
      storeName,
      templateStoreName,
      hasDishImage: !!dishImageBuffer,
      dishImageType,
      generateType,
      isSingleType: !!generateType,
      hasTemplate: !!template,
      hasAllTemplates: !!(storefrontTemplate && posterTemplate && avatarTemplate)
    });

    // 转换菜品图为完整data URL
    const dishImageDataUrl = this.bufferToBase64(Buffer.from(dishImageBuffer, 'base64'), dishImageType);

    // 根据生成类型处理
    if (generateType && ['avatar', 'storefront', 'poster'].includes(generateType)) {
      // 单个类型生成模式
      console.log(`生成单个类型: ${generateType}`);
      const result = await this.generateFusionImage(
        dishImageDataUrl,
        template,
        storeName,
        templateStoreName,
        generateType as 'storefront' | 'poster' | 'avatar'
      );

      const response: any = { fusionPrompts: {} };
      response[`${generateType}Url`] = result.url;
      response.fusionPrompts[generateType] = result.prompt;

      return response;
    } else {
      // 兼容性：全量生成模式（保持原有逻辑）
      console.log('生成全部三种类型');
      // 智能并行生成策略：先尝试并行，如果失败则串行重试
      let results;
      try {
        console.log('尝试并行生成三种融合设计...');
        // 并行生成三种设计
        const [storefrontResult, posterResult, avatarResult] = await Promise.all([
          this.generateFusionImage(dishImageDataUrl, storefrontTemplate, storeName, templateStoreName, 'storefront'),
          this.generateFusionImage(dishImageDataUrl, posterTemplate, storeName, templateStoreName, 'poster'),
          this.generateFusionImage(dishImageDataUrl, avatarTemplate, storeName, templateStoreName, 'avatar')
        ]);

        results = { storefrontResult, posterResult, avatarResult };
        console.log('并行生成成功完成');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log('并行生成失败，切换为串行模式重试...', errorMessage);

        // 串行生成，减少服务器压力
        const storefrontResult = await this.generateFusionImage(dishImageDataUrl, storefrontTemplate, storeName, templateStoreName, 'storefront');
        console.log('店招生成完成');

        const posterResult = await this.generateFusionImage(dishImageDataUrl, posterTemplate, storeName, templateStoreName, 'poster');
        console.log('海报生成完成');

        const avatarResult = await this.generateFusionImage(dishImageDataUrl, avatarTemplate, storeName, templateStoreName, 'avatar');
        console.log('头像生成完成');

        results = { storefrontResult, posterResult, avatarResult };
        console.log('串行生成成功完成');
      }

      return {
        storefrontUrl: results.storefrontResult.url,
        posterUrl: results.posterResult.url,
        avatarUrl: results.avatarResult.url,
        fusionPrompts: {
          storefront: results.storefrontResult.prompt,
          poster: results.posterResult.prompt,
          avatar: results.avatarResult.prompt
        }
      };
    }
  }

  private bufferToBase64(buffer: Buffer, mimeType: string): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  private async generateFusionImage(
    dishImageDataUrl: string,
    template: { buffer: string; type: string; id: string },
    storeName: string,
    templateStoreName: string,
    type: 'storefront' | 'poster' | 'avatar'
  ) {
    console.log(`Starting ${type} template fusion generation`);

    // 转换模板图为base64 data URL
    const templateImageDataUrl = this.bufferToBase64(Buffer.from(template.buffer, 'base64'), template.type);

    // 直接生成融合提示词，无需复杂分析
    const fusionPrompt = this.createSimpleFusionPrompt(
      storeName,
      templateStoreName,
      type
    );

    console.log(`Generating ${type} fusion image:`, {
      storeName,
      templateStoreName,
      promptLength: fusionPrompt.length,
      hasDishImage: !!dishImageDataUrl,
      hasTemplateImage: !!templateImageDataUrl,
      usingGemini: type === 'storefront' || type === 'poster'
    });

    let response;
    let stage1ImageDataUrl: string | null = null;  // 存储阶段1生成的图片

    // 头像使用两阶段处理：阶段1(Gemini食物替换) + 阶段2(Doubao店名替换)
    if (type === 'avatar') {
      console.log('===== 头像两阶段处理开始 =====');

      // ===== 阶段1: 使用Gemini API替换食物 =====
      console.log('阶段1: 使用Gemini API替换食物');
      const foodReplacementPrompt = this.createFoodReplacementPrompt();
      console.log('阶段1提示词:', foodReplacementPrompt.substring(0, 100) + '...');

      let stage1Response;
      let lastError;
      for (let retry = 0; retry < 3; retry++) {
        try {
          console.log(`阶段1 - Attempt ${retry + 1}/3`);
          stage1Response = await this.geminiClient.replaceFoodInBowl({
            sourceImage: dishImageDataUrl,      // 图片2: 主推菜品图
            targetImage: templateImageDataUrl,  // 图片1: 模板图
            prompt: foodReplacementPrompt
          });
          console.log(`阶段1 - Successfully processed on attempt ${retry + 1}`);
          break;
        } catch (error: any) {
          lastError = error;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`阶段1 - Attempt ${retry + 1} failed:`, errorMessage);
          if (retry < 2) {
            console.log(`阶段1 - Waiting 2 seconds before retry ${retry + 2}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!stage1Response) {
        const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
        console.log(`阶段1 - All 3 attempts failed, final error:`, errorMessage);
        throw lastError;
      }

      // 获取阶段1生成的图片(data URL格式)
      if (stage1Response.data && stage1Response.data.length > 0) {
        stage1ImageDataUrl = stage1Response.data[0].url;
        console.log('阶段1完成,图片格式:', stage1ImageDataUrl.substring(0, 30) + '...');
      } else {
        throw new Error('阶段1: No image generated from Gemini');
      }

      // ===== 阶段2: 使用Doubao API替换店名 =====
      console.log('阶段2: 使用Doubao API替换店名');
      const storeNamePrompt = this.createStoreNameReplacementPrompt(storeName, templateStoreName);
      console.log('阶段2提示词:', storeNamePrompt.substring(0, 100) + '...');

      const sizeMap = {
        avatar: config.images.sizes.logo  // 800x800
      };

      response = await withRetry(async () => {
        return await this.imageClient.generateImageWithMultipleImages({
          images: [stage1ImageDataUrl!], // 使用阶段1生成的图片
          prompt: storeNamePrompt,
          size: sizeMap[type]
        });
      });

      console.log('阶段2完成');
      console.log('===== 头像两阶段处理结束 =====');

    } else if (type === 'storefront' || type === 'poster') {
      // 店招和海报：仅使用Gemini API进行食物替换
      console.log(`Using Gemini API for ${type} generation`);
      let lastError;
      for (let retry = 0; retry < 3; retry++) {
        try {
          console.log(`${type} generation - Attempt ${retry + 1}/3`);
          response = await this.geminiClient.replaceFoodInBowl({
            sourceImage: dishImageDataUrl,      // 图片2: 主推菜品图
            targetImage: templateImageDataUrl,  // 图片1: 模板图
            prompt: fusionPrompt
          });
          console.log(`${type} generation - Successfully processed on attempt ${retry + 1}`);
          break;
        } catch (error: any) {
          lastError = error;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`${type} generation - Attempt ${retry + 1} failed:`, errorMessage);
          if (retry < 2) {
            console.log(`${type} generation - Waiting 2 seconds before retry ${retry + 2}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!response) {
        const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
        console.log(`${type} generation - All 3 attempts failed, final error:`, errorMessage);
        throw lastError;
      }
    }

    if (!response.data || response.data.length === 0) {
      throw new Error('No fusion image generated');
    }

    const imageData = response.data[0];

    // 处理图片数据
    let imageBuffer: Buffer;
    if (imageData.url.startsWith('data:')) {
      // Gemini返回的是data URL格式
      const base64Data = imageData.url.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Doubao返回的是HTTP URL，需要下载
      imageBuffer = await this.downloadImage(imageData.url);
    }

    const savedFile = await FileManager.saveBuffer(
      imageBuffer,
      `${type}-fusion-${Date.now()}.png`,
      'image/png',
      true
    );

    return {
      url: savedFile.url,
      prompt: fusionPrompt
    };
  }

  // 阶段1：创建食物替换提示词(Gemini API专用)
  private createFoodReplacementPrompt(): string {
    return `图片融合任务:
1. 从图片2中仅提取食物本身(米饭、青菜、辣椒、肉丝、汤汁、配菜等),不要提取盛放食物的容器(碗、盘子、碟子等器皿)
2. 在图片1中找到食物位置,仅删除食物部分,保留图片1原有的容器(碗、盘子、碟子等)
3. 把图片2提取的食物放入图片1保留的容器中,调整大小、角度和位置,使食物自然地盛放在容器里
4. 保持图片1的背景、文字、装饰、容器完全不变

食物提取要求:
- 只提取图片2中的纯食物部分:米饭、菜、肉、汤汁、配菜、调料等
- 严格排除图片2中的所有容器:碗、盘子、碟子、勺子、筷子等餐具
- 提取的食物要完整,包含所有食材细节

菜品美化要求:
- 提升菜品的色泽鲜亮度,让颜色更加鲜艳诱人
- 增强菜品的清晰度和细节,呈现高清质感
- 让食物看起来更有食欲,色彩饱满、光泽自然
- 保持食物的真实性,不要过度处理

容器保留要求:
- 必须保留图片1原有的所有容器(碗、盘子、碟子等),不能删除或替换
- 提取的食物要自然地放入图片1的容器中,符合容器的形状和深度
- 食物与容器的融合要真实自然,就像食物本来就盛放在这个容器里

关键要求:
- 图片2: 只提取食物,不提取容器
- 图片1: 只替换食物,保留容器
- 食物必须100%来自图片2,包含所有食材细节(颜色、形态、配菜、青菜、肉丝、汤汁)
- 不要修改图片1的文字、背景、装饰、容器`;
  }

  // 阶段2：创建店名替换提示词(Doubao API专用)
  private createStoreNameReplacementPrompt(storeName: string, templateStoreName: string): string {
    return `文字替换任务：
1. 仔细观察图片中的所有文字
2. 如果找到"${templateStoreName}"文字，将其替换为"${storeName}"
3. 保持原有的字体样式、大小、颜色、位置、效果完全不变
4. 不要修改图片中的任何其他内容(食物、背景、装饰等)

关键要求：
- 只替换店铺名文字，其他内容完全保持不变
- 新文字必须与原文字风格完全一致
- 如果图片中没有"${templateStoreName}"文字，则返回原图不做任何修改`;
  }

  // 创建融合提示词 - 根据类型区分处理
  private createSimpleFusionPrompt(
    storeName: string,
    templateStoreName: string,
    type: 'storefront' | 'poster' | 'avatar'
  ): string {
    // 店招和海报：仅食物替换,保留容器
    if (type === 'storefront' || type === 'poster') {
      return `图片融合任务：
1. 从图片2中仅提取食物本身(米饭、青菜、辣椒、肉丝、汤汁、配菜等),不要提取盛放食物的容器(碗、盘子、碟子等器皿)
2. 在图片1中找到食物位置,仅删除食物部分,保留图片1原有的容器(碗、盘子、碟子等)
3. 把图片2提取的食物放入图片1保留的容器中,调整大小、角度和位置,使食物自然地盛放在容器里
4. 保持图片1的背景、文字、装饰、容器完全不变

食物提取要求：
- 只提取图片2中的纯食物部分:米饭、菜、肉、汤汁、配菜、调料等
- 严格排除图片2中的所有容器:碗、盘子、碟子、勺子、筷子等餐具
- 提取的食物要完整,包含所有食材细节

容器保留要求：
- 必须保留图片1原有的所有容器(碗、盘子、碟子等),不能删除或替换
- 提取的食物要自然地放入图片1的容器中,符合容器的形状和深度
- 食物与容器的融合要真实自然,就像食物本来就盛放在这个容器里

关键要求：
- 图片2: 只提取食物,不提取容器
- 图片1: 只替换食物,保留容器
- 必须使用图片2的实际食物,包含所有食材细节(颜色、形态、配菜、青菜、肉丝、汤汁)
- 不要修改图片1的文字、背景、装饰、容器`;
    }

    // 头像：返回阶段1的食物替换提示词(后续会进行两阶段处理)
    return this.createFoodReplacementPrompt();
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
jobRunner.registerProcessor('logo-studio-fusion', new LogoStudioFusionProcessor());

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

    // ✅ 融合模式：解析表单数据
    const formData = await request.formData();
    const storeName = formData.get('storeName') as string;
    const templateStoreName = formData.get('templateStoreName') as string;

    // 主推菜品图
    const dishImageFile = formData.get('dishImage') as File;
    const generateType = formData.get('generateType') as string; // 新增：指定生成类型

    // 根据生成类型获取对应的模板文件
    let templateFile: File | null = null;
    let templateId: string | null = null;
    let storefrontTemplateFile: File | null = null;
    let posterTemplateFile: File | null = null;
    let avatarTemplateFile: File | null = null;
    let storefrontTemplateId: string | null = null;
    let posterTemplateId: string | null = null;
    let avatarTemplateId: string | null = null;

    if (generateType && ['avatar', 'storefront', 'poster'].includes(generateType)) {
      // 单个类型生成模式
      if (generateType === 'avatar') {
        templateFile = formData.get('avatarTemplate') as File;
        templateId = formData.get('avatarTemplateId') as string;
      } else if (generateType === 'storefront') {
        templateFile = formData.get('storefrontTemplate') as File;
        templateId = formData.get('storefrontTemplateId') as string;
      } else if (generateType === 'poster') {
        templateFile = formData.get('posterTemplate') as File;
        templateId = formData.get('posterTemplateId') as string;
      }
    } else {
      // 兼容性：全量生成模式（保持原有逻辑）
      storefrontTemplateFile = formData.get('storefrontTemplate') as File;
      posterTemplateFile = formData.get('posterTemplate') as File;
      avatarTemplateFile = formData.get('avatarTemplate') as File;
      storefrontTemplateId = formData.get('storefrontTemplateId') as string;
      posterTemplateId = formData.get('posterTemplateId') as string;
      avatarTemplateId = formData.get('avatarTemplateId') as string;
    }

    // 验证必填字段
    if (!storeName?.trim()) {
      return NextResponse.json(
        { error: '请填写店铺名称' },
        { status: 400 }
      );
    }

    if (!dishImageFile) {
      return NextResponse.json(
        { error: '请上传主推菜品图' },
        { status: 400 }
      );
    }

    // 根据生成类型验证模板
    if (generateType && ['avatar', 'storefront', 'poster'].includes(generateType)) {
      // 单个类型生成模式
      if (!templateFile) {
        const typeNames = {
          avatar: '头像',
          storefront: '店招',
          poster: '海报'
        };
        return NextResponse.json(
          { error: `请选择${typeNames[generateType as keyof typeof typeNames]}模板` },
          { status: 400 }
        );
      }
    } else {
      // 兼容性：全量生成模式
      if (!storefrontTemplateFile || !posterTemplateFile || !avatarTemplateFile) {
        return NextResponse.json(
          { error: '请选择完整的三个模板（店招、海报、头像）' },
          { status: 400 }
        );
      }
    }

    // 转换文件为base64格式
    const dishImageBuffer = Buffer.from(await dishImageFile.arrayBuffer());

    let jobPayload: any = {
      storeName: storeName.trim(),
      templateStoreName: templateStoreName.trim(),
      dishImageBuffer: dishImageBuffer.toString('base64'),
      dishImageType: dishImageFile.type,
    };

    if (generateType && ['avatar', 'storefront', 'poster'].includes(generateType)) {
      // 单个类型生成模式
      const templateBuffer = Buffer.from(await templateFile!.arrayBuffer());
      jobPayload.generateType = generateType;
      jobPayload.template = {
        buffer: templateBuffer.toString('base64'),
        type: templateFile!.type,
        id: templateId
      };
    } else {
      // 兼容性：全量生成模式（保持原有逻辑）
      const storefrontTemplateBuffer = Buffer.from(await storefrontTemplateFile!.arrayBuffer());
      const posterTemplateBuffer = Buffer.from(await posterTemplateFile!.arrayBuffer());
      const avatarTemplateBuffer = Buffer.from(await avatarTemplateFile!.arrayBuffer());

      jobPayload.storefrontTemplate = {
        buffer: storefrontTemplateBuffer.toString('base64'),
        type: storefrontTemplateFile!.type,
        id: storefrontTemplateId
      };
      jobPayload.posterTemplate = {
        buffer: posterTemplateBuffer.toString('base64'),
        type: posterTemplateFile!.type,
        id: posterTemplateId
      };
      jobPayload.avatarTemplate = {
        buffer: avatarTemplateBuffer.toString('base64'),
        type: avatarTemplateFile!.type,
        id: avatarTemplateId
      };
    }

    // 创建融合任务，传递base64数据
    const job = JobQueue.createJob('logo-studio-fusion', jobPayload, clientIp);

    // 启动任务处理
    console.log(`Starting job processing for ${job.id}`);
    jobRunner.runJob(job.id);

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      message: '融合设计任务已创建，正在生成店招、海报、头像三种图片...',
      requestId: job.id,
      durationMs: 0
    });

  } catch (error: any) {
    console.error('Logo studio API error:', error);
    
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { error: errorResponse.message },
      { status: 500 }
    );
  }
}
