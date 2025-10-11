import axios, { AxiosInstance } from 'axios';
import { ImageGenerationParams, ChatCompletionParams } from '@/types';

// Image generation API client
export class ImageApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.IMAGE_API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${process.env.IMAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds
    });
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

    console.log('Image API Request:', {
      url: this.client.defaults.baseURL,
      model: requestBody.model,
      prompt: requestBody.prompt?.substring(0, 100) + '...',
      size: requestBody.size,
      promptLength: requestBody.prompt?.length
    });

    try {
      const response = await this.client.post('', requestBody);
      console.log('Image API Response:', {
        status: response.status,
        hasData: !!response.data,
        dataLength: response.data?.data?.length
      });
      return response.data;
    } catch (error: any) {
      console.error('Image API Error Details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        fullPrompt: requestBody.prompt
      });
      throw error;
    }
  }

  async generateImageWithImage(params: {
    image: string; // base64 or URL
    prompt: string;
    size: string;
    mask?: string; // for inpainting
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

    // Add optional parameters
    if (params.n) {
      // Note: n parameter might not be supported in this API
      // We'll use sequential_image_generation instead
    }

    // Debug logging
    console.log('API Request:', {
      url: this.client.defaults.baseURL,
      model: requestBody.model,
      prompt: requestBody.prompt,
      imageSize: params.image.length,
      size: requestBody.size,
    });

    const response = await this.client.post('', requestBody);
    return response.data;
  }
}

// Chat completion API client
export class ChatApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.CHAT_API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${process.env.CHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });
  }

  async createCompletion(params: ChatCompletionParams) {
    console.log('Chat API Request:', {
      url: this.client.defaults.baseURL,
      model: params.model,
      messagesCount: params.messages.length,
      maxTokens: params.max_tokens,
      temperature: params.temperature
    });

    try {
      const response = await this.client.post('', params);
      console.log('Chat API Response:', {
        status: response.status,
        hasData: !!response.data,
        usage: response.data?.usage
      });
      return response.data;
    } catch (error: any) {
      console.error('Chat API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }
}

// Retry utility with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx)
      if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Rate limiting utility
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  async checkLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= limit) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
}

export const rateLimiter = new RateLimiter();

// Error handling utility
export function handleApiError(error: any): { message: string; status?: number } {
  if (axios.isAxiosError(error)) {
    const response = error.response;
    let message = error.message;

    if (response) {
      // Try to extract detailed error message
      if (response.data?.error?.message) {
        message = response.data.error.message;
      } else if (response.data?.message) {
        message = response.data.message;
      } else if (response.data?.error) {
        message = typeof response.data.error === 'string' ? response.data.error : JSON.stringify(response.data.error);
      } else if (response.statusText) {
        message = `${response.status} ${response.statusText}`;
      }

      // Add response data for debugging
      console.error('API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
      });
    }

    return {
      message,
      status: response?.status,
    };
  }

  return {
    message: error.message || 'Unknown error occurred',
  };
}

// Product Image API Client (专门用于单品图，使用Gemini原生格式)
export class ProductImageApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'http://jeniya.top/v1beta/models/gemini-2.5-flash-image-preview:generateContent',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds
    });
  }

  async generateImageWithImage(params: {
    image: string; // base64 data URL format
    prompt: string;
    size: string;
    mask?: string; // for inpainting
    n?: number;
  }) {
    // Extract base64 data from data URL
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

    // Debug logging
    console.log('Product Image API Request (Gemini Native):', {
      url: this.client.defaults.baseURL,
      model: 'nano-banana',
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

      console.log('Product Image API Response (Gemini Native):', {
        status: response.status,
        hasData: !!response.data,
        candidatesCount: response.data?.candidates?.length
      });

      // Debug: Log the full response structure
      console.log('Full Gemini Response:', JSON.stringify(response.data, null, 2));

      // Convert Gemini response format to our expected format
      return this.convertGeminiResponse(response.data);
    } catch (error: any) {
      console.error('Product Image API Error (Gemini Native):', {
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
      console.log('Processing candidate:', JSON.stringify(candidate, null, 2));
      const parts = candidate.content?.parts || [];
      console.log('Parts count:', parts.length);

      for (const part of parts) {
        console.log('Processing part:', JSON.stringify(part, null, 2));

        // Check for different possible image data formats
        if (part.inline_data || part.inlineData) {
          // Handle both possible naming conventions
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

          // Create a data URL that can be processed by our existing code
          const dataUrl = `data:${mimeType};base64,${base64Data}`;

          imageData.push({
            url: dataUrl, // This will be processed by our existing download logic
            b64_json: base64Data // Also provide raw base64 for direct use
          });
        } else if (part.text && part.text.includes('data:image')) {
          // Sometimes the image might be embedded in text as a data URL
          const dataUrlMatch = part.text.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
          if (dataUrlMatch) {
            const dataUrl = dataUrlMatch[0];
            const base64Data = dataUrl.split(',')[1];

            console.log('Found image in text:', {
              base64Length: base64Data?.length
            });

            if (base64Data && base64Data.length > 0) {
              imageData.push({
                url: dataUrl,
                b64_json: base64Data
              });
            }
          }
        } else if (part.text) {
          // Log text parts for debugging
          console.log('Text part found:', part.text.substring(0, 100) + '...');
        }
      }
    }

    console.log('Converted image data count:', imageData.length);

    // Additional validation
    if (imageData.length === 0) {
      console.error('No image data found in Gemini response');
      console.error('Full response structure:', JSON.stringify(geminiResponse, null, 2));
    }

    return {
      data: imageData
    };
  }
}

// Product Refine API Client (专门用于产品精修，使用OpenAI兼容格式)
export class ProductRefineApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.PRODUCT_REFINE_API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${process.env.PRODUCT_REFINE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 120 seconds for large image processing
    });
  }

  async refineProduct(params: {
    image: string; // base64 data URL format
    prompt: string;
  }) {
    // Extract base64 data from data URL
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
        responseModalities: ['TEXT', 'IMAGE'],
        imageGenerationConfig: {
          aspectRatio: '4:3', // 1200x900 比例
          includeRaiFiltering: false,
          personGeneration: 'DONT_ALLOW'
        }
      }
    };

    // Debug logging
    console.log('Product Refine API Request (Gemini Native):', {
      url: this.client.defaults.baseURL,
      model: 'nano-banana',
      prompt: params.prompt.substring(0, 100) + '...',
      imageSize: base64Data.length,
      mimeType: mimeType
    });

    try {
      const response = await this.client.post('', requestBody, {
        params: {
          key: process.env.PRODUCT_REFINE_API_KEY
        }
      });

      console.log('Product Refine API Response (Gemini Native):', {
        status: response.status,
        hasData: !!response.data,
        candidatesCount: response.data?.candidates?.length
      });

      // Debug: Log the full response structure
      console.log('Full Gemini Refine Response:', JSON.stringify(response.data, null, 2));

      // Convert Gemini response format to our expected format
      return this.convertGeminiResponse(response.data);
    } catch (error: any) {
      console.error('Product Refine API Error (Gemini Native):', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  // 多图融合专用方法 - 支持多张源图片输入
  async fusionMultipleImages(params: {
    sourceImages: string[]; // base64 data URL format array - 包含要融合的多张图片
    targetImage: string; // base64 data URL format - 包含目标背景的图片
    prompt: string;
  }) {
    // 确保目标图片是完整的 data URL 格式
    const targetImageUrl = params.targetImage.startsWith('data:')
      ? params.targetImage
      : `data:image/png;base64,${params.targetImage}`;

    // 构建 content 数组：prompt + 所有源图片 + 目标图片
    const contentArray: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      {
        type: 'text',
        text: params.prompt
      }
    ];

    // 添加所有源图片
    params.sourceImages.forEach((sourceImage) => {
      const sourceImageUrl = sourceImage.startsWith('data:')
        ? sourceImage
        : `data:image/png;base64,${sourceImage}`;

      contentArray.push({
        type: 'image_url',
        image_url: {
          url: sourceImageUrl
        }
      });
    });

    // 添加目标背景图片
    contentArray.push({
      type: 'image_url',
      image_url: {
        url: targetImageUrl
      }
    });

    // OpenAI兼容格式的请求体
    const requestBody = {
      model: process.env.PRODUCT_REFINE_MODEL_NAME || 'gemini-2.5-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: contentArray
        }
      ],
      max_tokens: 4096,
      temperature: 0.7
    };

    // Debug logging
    console.log('Multi-Image Fusion API Request (OpenAI Compatible):', {
      url: this.client.defaults.baseURL,
      model: requestBody.model,
      prompt: params.prompt.substring(0, 100) + '...',
      sourceImagesCount: params.sourceImages.length,
      targetImageUrlLength: targetImageUrl.length
    });

    try {
      const response = await this.client.post('', requestBody, {
        timeout: 120000 // 增加到2分钟超时
      });

      console.log('Multi-Image Fusion API Response (OpenAI Compatible):', {
        status: response.status,
        hasData: !!response.data,
        choicesCount: response.data?.choices?.length
      });

      // 使用OpenAI响应转换器
      return await this.convertOpenAIResponse(response.data);
    } catch (error: any) {
      console.error('Multi-Image Fusion API Error (OpenAI Compatible):', {
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
      model: process.env.PRODUCT_REFINE_MODEL_NAME || 'gemini-2.5-flash-image-preview',
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

    // Debug logging
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

      // Convert OpenAI response format to our expected format
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

      // 检查content是否包含图片数据或URL
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

            console.log('Downloaded and converted image:', {
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
          console.log('Found direct image URL:', imageUrl);

          try {
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const base64Data = Buffer.from(response.data, 'binary').toString('base64');
            const contentType = response.headers['content-type'] || 'image/png';
            const dataUrl = `data:${contentType};base64,${base64Data}`;

            imageData.push({
              url: dataUrl,
              b64_json: base64Data
            });
          } catch (error) {
            console.error('Failed to download image from URL:', imageUrl, error);
            throw new Error(`Failed to download image from ${imageUrl}: ${error}`);
          }
        }
        // 3. 检查 data URL 格式
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

  private convertGeminiResponse(geminiResponse: any) {
    console.log('Converting Gemini Response...');
    console.log('Candidates:', geminiResponse.candidates?.length || 0);

    const candidates = geminiResponse.candidates || [];
    const imageData = [];

    for (const candidate of candidates) {
      console.log('Processing candidate:', JSON.stringify(candidate, null, 2));
      const parts = candidate.content?.parts || [];
      console.log('Parts count:', parts.length);

      for (const part of parts) {
        console.log('Processing part:', JSON.stringify(part, null, 2));

        // Check for different possible image data formats
        if (part.inline_data || part.inlineData) {
          // Handle both possible naming conventions
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

          // Create a data URL that can be processed by our existing code
          const dataUrl = `data:${mimeType};base64,${base64Data}`;

          imageData.push({
            url: dataUrl, // This will be processed by our existing download logic
            b64_json: base64Data // Also provide raw base64 for direct use
          });
        } else if (part.text && part.text.includes('data:image')) {
          // Sometimes the image might be embedded in text as a data URL
          const dataUrlMatch = part.text.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
          if (dataUrlMatch) {
            const dataUrl = dataUrlMatch[0];
            const base64Data = dataUrl.split(',')[1];

            console.log('Found image in text:', {
              base64Length: base64Data?.length
            });

            if (base64Data && base64Data.length > 0) {
              imageData.push({
                url: dataUrl,
                b64_json: base64Data
              });
            }
          }
        } else if (part.text) {
          // Log text parts for debugging
          console.log('Text part found:', part.text.substring(0, 100) + '...');
        }
      }
    }

    console.log('Converted image data count:', imageData.length);

    // Additional validation
    if (imageData.length === 0) {
      console.error('No image data found in Gemini response');
      console.error('Full response structure:', JSON.stringify(geminiResponse, null, 2));
    }

    return {
      data: imageData
    };
  }
}
