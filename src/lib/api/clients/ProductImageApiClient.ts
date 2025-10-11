import { BaseApiClient } from '../base/BaseApiClient';
import axios, { AxiosInstance } from 'axios';

// 单品图API客户端 (使用OpenAI兼容格式 - 新API)
export class ProductImageApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.PRODUCT_IMAGE_API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${process.env.PRODUCT_IMAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
  }

  async generateImageWithImage(params: {
    image: string;
    prompt: string;
    size: string;
    mask?: string;
    n?: number;
  }) {
    // 确保使用完整的 data URL 格式
    const imageUrl = params.image.startsWith('data:')
      ? params.image
      : `data:image/png;base64,${params.image}`;

    // OpenAI兼容格式的请求体
    const requestBody = {
      model: process.env.PRODUCT_IMAGE_MODEL_NAME || 'nano-banana',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: params.prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.7
    };

    console.log('Product Image API Request (OpenAI Compatible):', {
      url: this.client.defaults.baseURL,
      model: requestBody.model,
      prompt: params.prompt.substring(0, 100) + '...',
      imageUrlLength: imageUrl.length,
      hasImage: imageUrl.startsWith('data:image')
    });

    try {
      const response = await this.client.post('', requestBody);

      console.log('Product Image API Response (OpenAI Compatible):', {
        status: response.status,
        hasData: !!response.data,
        choicesCount: response.data?.choices?.length
      });

      return this.convertOpenAIResponse(response.data);
    } catch (error: any) {
      console.error('Product Image API Error (OpenAI Compatible):', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  private convertOpenAIResponse(openAIResponse: any) {
    console.log('Converting OpenAI Compatible Response...');
    console.log('Choices:', openAIResponse.choices?.length || 0);

    const choices = openAIResponse.choices || [];
    const imageData = [];

    for (const choice of choices) {
      console.log('Processing choice:', JSON.stringify(choice, null, 2));
      const content = choice.message?.content || choice.delta?.content || '';

      console.log('Content type:', typeof content);
      console.log('Content preview:', content.substring(0, 200));

      // 检查content是否包含base64图片数据
      if (typeof content === 'string') {
        // 尝试匹配 data URL 格式
        const dataUrlMatch = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
        if (dataUrlMatch) {
          const dataUrl = dataUrlMatch[0];
          const base64Data = dataUrl.split(',')[1];

          console.log('Found image data URL:', {
            base64Length: base64Data?.length
          });

          if (base64Data && base64Data.length > 0) {
            imageData.push({
              url: dataUrl,
              b64_json: base64Data
            });
          }
        }
        // 如果content本身就是纯base64，添加data URL前缀
        else if (/^[A-Za-z0-9+/]+=*$/.test(content.substring(0, 100))) {
          console.log('Found pure base64 data, adding data URL prefix');
          const dataUrl = `data:image/png;base64,${content}`;
          imageData.push({
            url: dataUrl,
            b64_json: content
          });
        }
      }

      if (imageData.length > 0) break;
    }

    if (imageData.length === 0) {
      console.error('No valid image data found in OpenAI response');
      console.error('Full response structure:', JSON.stringify(openAIResponse, null, 2));
      throw new Error('No valid image data found in OpenAI compatible response');
    }

    console.log('Successfully processed image data');
    return {
      data: imageData
    };
  }
}
