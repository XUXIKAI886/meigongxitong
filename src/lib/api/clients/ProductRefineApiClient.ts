import { BaseApiClient } from '../base/BaseApiClient';
import axios, { AxiosInstance } from 'axios';

// 产品精修API客户端
export class ProductRefineApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'http://jeniya.top/v1beta/models/gemini-2.5-flash-image-preview:generateContent',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 180000, // 3分钟超时，用于多图融合处理
    });
  }

  async enhanceProduct(params: {
    image: string;
    prompt: string;
    size?: string;
  }) {
    const base64Data = params.image.split(',')[1];
    const mimeType = params.image.match(/data:([^;]+);/)?.[1] || 'image/png';

    const requestBody = {
      contents: [{
        parts: [
          { text: params.prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    };

    console.log('Product Refine API Request:', {
      model: 'gemini-2.5-flash-image-preview',
      prompt: params.prompt.substring(0, 100) + '...',
      imageSize: base64Data.length,
      mimeType: mimeType
    });

    try {
      const response = await this.client.post('', requestBody, {
        params: {
          key: process.env.PRODUCT_IMAGE_API_KEY
        }
      });

      console.log('Product Refine API Response:', {
        status: response.status,
        hasData: !!response.data,
        candidatesCount: response.data?.candidates?.length
      });

      return this.convertGeminiResponse(response.data);
    } catch (error: any) {
      console.error('Product Refine API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  // 食物替换专用方法 - 支持双图片输入
  async replaceFoodInBowl(params: {
    sourceImage: string; // base64 data URL format - 包含要提取食物的图片
    targetImage: string; // base64 data URL format - 包含目标碗的图片
    prompt: string;
  }) {
    // Extract base64 data from both images
    const sourceBase64 = params.sourceImage.split(',')[1];
    const sourceMimeType = params.sourceImage.match(/data:([^;]+);/)?.[1] || 'image/png';

    const targetBase64 = params.targetImage.split(',')[1];
    const targetMimeType = params.targetImage.match(/data:([^;]+);/)?.[1] || 'image/png';

    const requestBody = {
      contents: [{
        parts: [
          { text: params.prompt },
          {
            inline_data: {
              mime_type: sourceMimeType,
              data: sourceBase64
            }
          },
          {
            inline_data: {
              mime_type: targetMimeType,
              data: targetBase64
            }
          }
        ]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageGenerationConfig: {
          aspectRatio: '4:3', // 1200x900 比例
          includeRaiFiltering: false,
          personGeneration: 'DONT_ALLOW'
        }
      }
    };

    console.log('Food Replacement API Request (Gemini Native):', {
      url: this.client.defaults.baseURL,
      model: 'gemini-2.5-flash-image-preview',
      prompt: params.prompt.substring(0, 100) + '...',
      sourceImageSize: sourceBase64.length,
      targetImageSize: targetBase64.length
    });

    try {
      const response = await this.client.post('', requestBody, {
        params: {
          key: process.env.PRODUCT_REFINE_API_KEY
        }
      });

      console.log('Food Replacement API Response (Gemini Native):', {
        status: response.status,
        hasData: !!response.data,
        candidatesCount: response.data?.candidates?.length
      });

      return this.convertGeminiResponse(response.data);
    } catch (error: any) {
      console.error('Food Replacement API Error (Gemini Native):', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  private convertGeminiResponse(geminiResponse: any) {
    console.log('Converting Gemini Response...');
    console.log('Candidates:', geminiResponse.candidates?.length || 0);

    const candidates = geminiResponse.candidates || [];
    const imageData = [];

    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      console.log('Parts count:', parts.length);

      for (const part of parts) {
        // Check for different possible image data formats
        if (part.inline_data || part.inlineData) {
          const inlineData = part.inline_data || part.inlineData;
          const base64Data = inlineData.data;
          const mimeType = inlineData.mime_type || inlineData.mimeType;

          console.log('Found image data:', {
            base64Length: base64Data?.length,
            mimeType: mimeType
          });

          // Validate base64 data
          if (!base64Data || base64Data.length === 0) {
            console.warn('Empty base64 data found, skipping...');
            continue;
          }

          const dataUrl = `data:${mimeType};base64,${base64Data}`;

          imageData.push({
            url: dataUrl,
            b64_json: base64Data
          });

          break; // 找到图片后退出parts循环
        } else if (part.text) {
          console.log('Text part found (length):', part.text.length);
        }
      }

      if (imageData.length > 0) break; // 找到图片后退出candidates循环
    }

    console.log('Converted image data count:', imageData.length);

    // 如果没有找到图片数据，记录详细错误但仍然抛出异常
    if (imageData.length === 0) {
      console.error('No image data found in Gemini response');
      console.error('Full response structure:', JSON.stringify(geminiResponse, null, 2));
      throw new Error('No valid image data found in Gemini response');
    }

    return {
      data: imageData
    };
  }
}