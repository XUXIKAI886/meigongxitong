import { BaseApiClient } from '../base/BaseApiClient';
import axios, { AxiosInstance } from 'axios';

// 产品精修API客户端 (使用OpenAI兼容格式 - 新API)
export class ProductRefineApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.PRODUCT_REFINE_API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${process.env.PRODUCT_REFINE_API_KEY}`,
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
    // 确保使用完整的 data URL 格式
    const imageUrl = params.image.startsWith('data:')
      ? params.image
      : `data:image/png;base64,${params.image}`;

    // OpenAI兼容格式的请求体
    const requestBody = {
      model: process.env.PRODUCT_REFINE_MODEL_NAME || 'nano-banana',
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

    console.log('Product Refine API Request (OpenAI Compatible):', {
      url: this.client.defaults.baseURL,
      model: requestBody.model,
      prompt: params.prompt.substring(0, 100) + '...',
      imageUrlLength: imageUrl.length
    });

    try {
      const response = await this.client.post('', requestBody);

      console.log('Product Refine API Response (OpenAI Compatible):', {
        status: response.status,
        hasData: !!response.data,
        choicesCount: response.data?.choices?.length
      });

      return await this.convertOpenAIResponse(response.data);
    } catch (error: any) {
      console.error('Product Refine API Error (OpenAI Compatible):', {
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
    // 确保两张图片都是完整的 data URL 格式
    const sourceImageUrl = params.sourceImage.startsWith('data:')
      ? params.sourceImage
      : `data:image/png;base64,${params.sourceImage}`;

    const targetImageUrl = params.targetImage.startsWith('data:')
      ? params.targetImage
      : `data:image/png;base64,${params.targetImage}`;

    // OpenAI兼容格式 - 多图输入
    const requestBody = {
      model: process.env.PRODUCT_REFINE_MODEL_NAME || 'nano-banana',
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
                url: sourceImageUrl
              }
            },
            {
              type: 'image_url',
              image_url: {
                url: targetImageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.7
    };

    console.log('Food Replacement API Request (OpenAI Compatible):', {
      url: this.client.defaults.baseURL,
      model: requestBody.model,
      prompt: params.prompt.substring(0, 100) + '...',
      sourceImageLength: sourceImageUrl.length,
      targetImageLength: targetImageUrl.length
    });

    try {
      const response = await this.client.post('', requestBody);

      console.log('Food Replacement API Response (OpenAI Compatible):', {
        status: response.status,
        hasData: !!response.data,
        choicesCount: response.data?.choices?.length
      });

      return await this.convertOpenAIResponse(response.data);
    } catch (error: any) {
      console.error('Food Replacement API Error (OpenAI Compatible):', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  private async convertOpenAIResponse(openAIResponse: any) {
    console.log('Converting OpenAI Compatible Response...');
    console.log('Choices:', openAIResponse.choices?.length || 0);

    const choices = openAIResponse.choices || [];
    const imageData = [];

    for (const choice of choices) {
      const content = choice.message?.content || choice.delta?.content || '';

      console.log('Content type:', typeof content);
      console.log('Content preview:', content.substring(0, 200));

      // 检查content是否包含图片数据
      if (typeof content === 'string') {
        // 1. 检查是否是Markdown格式的图片链接: ![image](URL)
        const markdownImageMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
        if (markdownImageMatch) {
          const imageUrl = markdownImageMatch[1];
          console.log('Found Markdown image URL:', imageUrl);

          try {
            // 下载图片并转换为base64
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const base64Data = Buffer.from(response.data, 'binary').toString('base64');
            const contentType = response.headers['content-type'] || 'image/png';
            const dataUrl = `data:${contentType};base64,${base64Data}`;

            console.log('Successfully downloaded and converted image:', {
              url: imageUrl,
              contentType,
              base64Length: base64Data.length
            });

            imageData.push({
              url: dataUrl,
              b64_json: base64Data
            });
          } catch (error) {
            console.error('Failed to download image from URL:', imageUrl, error);
            throw new Error(`Failed to download image from ${imageUrl}: ${error}`);
          }
        }
        // 2. 检查是否是普通的HTTP(S) URL
        else if (/^https?:\/\//i.test(content.trim())) {
          const imageUrl = content.trim();
          console.log('Found plain image URL:', imageUrl);

          try {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const base64Data = Buffer.from(response.data, 'binary').toString('base64');
            const contentType = response.headers['content-type'] || 'image/png';
            const dataUrl = `data:${contentType};base64,${base64Data}`;

            console.log('Successfully downloaded and converted image:', {
              url: imageUrl,
              contentType,
              base64Length: base64Data.length
            });

            imageData.push({
              url: dataUrl,
              b64_json: base64Data
            });
          } catch (error) {
            console.error('Failed to download image from URL:', imageUrl, error);
            throw new Error(`Failed to download image from ${imageUrl}: ${error}`);
          }
        }
        // 3. 尝试匹配 data URL 格式
        else {
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
          // 4. 如果content本身就是纯base64，添加data URL前缀
          else if (/^[A-Za-z0-9+/]+=*$/.test(content.substring(0, 100))) {
            console.log('Found pure base64 data, adding data URL prefix');
            const dataUrl = `data:image/png;base64,${content}`;
            imageData.push({
              url: dataUrl,
              b64_json: content
            });
          }
        }
      }

      if (imageData.length > 0) break;
    }

    console.log('Converted image data count:', imageData.length);

    // 如果没有找到图片数据，记录详细错误但仍然抛出异常
    if (imageData.length === 0) {
      console.error('No image data found in OpenAI compatible response');
      console.error('Full response structure:', JSON.stringify(openAIResponse, null, 2));
      throw new Error('No valid image data found in OpenAI compatible response');
    }

    return {
      data: imageData
    };
  }
}
