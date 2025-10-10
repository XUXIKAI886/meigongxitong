import { BaseApiClient } from '../base/BaseApiClient';
import { ImageGenerationParams } from '@/types';

// 图像生成API客户端
export class ImageApiClient extends BaseApiClient {
  constructor() {
    super(
      process.env.IMAGE_API_BASE_URL!,
      process.env.IMAGE_API_KEY!,
      60000
    );
  }

  async generateImage(params: ImageGenerationParams) {
    const requestBody = {
      model: process.env.IMAGE_MODEL_NAME,
      prompt: params.prompt,
      size: params.size,
      sequential_image_generation: 'disabled',
      stream: false,
      response_format: 'url',
      watermark: false,
    };

    this.logRequest('Image API', {
      model: requestBody.model,
      prompt: requestBody.prompt?.substring(0, 100) + '...',
      size: requestBody.size,
      promptLength: requestBody.prompt?.length
    });

    try {
      const response = await this.client.post('', requestBody);
      this.logResponse('Image API', response);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Image API');
    }
  }

  async generateImageWithImage(params: {
    image: string;
    prompt: string;
    size: string;
    mask?: string;
    n?: number;
  }) {
    const requestBody = {
      model: process.env.IMAGE_MODEL_NAME,
      prompt: params.prompt,
      image: params.image,
      size: params.size,
      sequential_image_generation: 'disabled',
      stream: false,
      response_format: 'url',
      watermark: false,
    };

    this.logRequest('Image API with Image', {
      model: requestBody.model,
      prompt: requestBody.prompt,
      imageSize: params.image.length,
      size: requestBody.size,
    });

    try {
      const response = await this.client.post('', requestBody);
      this.logResponse('Image API with Image', response);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Image API with Image');
    }
  }

  async generateImageWithMultipleImages(params: {
    images: string[]; // 支持多张图片的base64数据
    prompt: string;
    size: string;
    n?: number;
  }) {
    // 根据豆包API官方文档：使用image字段（单数）传递图片数组
    // image字段支持URL或Base64格式，可以是单个图片或数组
    const requestBody: any = {
      model: process.env.IMAGE_MODEL_NAME,
      prompt: params.prompt,
      size: params.size,
      sequential_image_generation: 'disabled', // 只生成一张融合图
      stream: false,
      response_format: 'url',
      watermark: false,
      n: params.n || 1,
    };

    // 豆包API使用image字段（单数）传递多张图片
    if (params.images && params.images.length > 0) {
      // 由于没有云数据库，必须使用纯base64字符串
      // 将data URL格式转换为纯base64
      const pureBase64Images = params.images.map(dataUrl => {
        if (dataUrl.startsWith('data:')) {
          // 提取纯base64部分（去掉 "data:image/xxx;base64," 前缀）
          return dataUrl.split(',')[1];
        }
        return dataUrl;
      });

      // 豆包API的image字段传递纯base64数组
      requestBody.image = pureBase64Images;

      console.log('使用豆包API多图生图：image字段传递', pureBase64Images.length, '张纯base64图片');
    }

    // 添加详细的调试日志
    console.log('豆包API多图融合请求详情:', {
      model: requestBody.model,
      promptPreview: params.prompt?.substring(0, 200) + '...',
      originalImageCount: params.images.length,
      originalImagesInfo: params.images.map((img, idx) => ({
        index: idx,
        isDataUrl: img.startsWith('data:'),
        mimeType: img.startsWith('data:') ? img.split(';')[0].split(':')[1] : 'unknown',
        sizeKB: Math.round(img.length / 1024)
      })),
      requestedSize: requestBody.size,
      hasImageField: !!requestBody.image,
      imageFieldIsArray: Array.isArray(requestBody.image),
      imageFieldCount: requestBody.image?.length,
      imageFieldSizes: requestBody.image?.map((img: string) => Math.round(img.length / 1024) + 'KB'),
    });

    // 验证base64是否正确
    if (requestBody.image && requestBody.image.length > 0) {
      console.log('Base64验证:', {
        firstImagePreview: requestBody.image[0].substring(0, 50) + '...',
        isValidBase64: /^[A-Za-z0-9+/]+=*$/.test(requestBody.image[0].replace(/\s/g, '')),
        allImagesValid: requestBody.image.every((img: string) =>
          /^[A-Za-z0-9+/]+=*$/.test(img.replace(/\s/g, ''))
        ),
      });
    }

    this.logRequest('Image API with Multiple Images', {
      model: requestBody.model,
      prompt: requestBody.prompt?.substring(0, 100) + '...',
      imageFieldType: Array.isArray(requestBody.image) ? 'array' : 'single',
      imageCount: requestBody.image?.length || 0,
      totalImageSize: requestBody.image ? requestBody.image.reduce((sum: number, img: string) => sum + img.length, 0) : 0,
      size: requestBody.size,
    });

    try {
      const response = await this.client.post('', requestBody);
      this.logResponse('Image API with Multiple Images', response);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Image API with Multiple Images');
    }
  }
}