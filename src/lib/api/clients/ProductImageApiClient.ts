import { BaseApiClient } from '../base/BaseApiClient';
import axios, { AxiosInstance } from 'axios';

// 单品图API客户端 (使用Gemini原生格式)
export class ProductImageApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'http://jeniya.top/v1beta/models/gemini-2.5-flash-image-preview:generateContent',
      headers: {
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

    console.log('Product Image API Request (Gemini Native):', {
      url: this.client.defaults.baseURL,
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

      console.log('Product Image API Response (Gemini Native):', {
        status: response.status,
        hasData: !!response.data,
        candidatesCount: response.data?.candidates?.length
      });

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

        if (part.inline_data || part.inlineData) {
          const inlineData = part.inline_data || part.inlineData;
          const base64Data = inlineData.data;
          const mimeType = inlineData.mime_type || inlineData.mimeType;

          console.log('Found image data:', {
            base64Length: base64Data?.length,
            mimeType: mimeType
          });

          if (!base64Data || base64Data.length === 0) {
            console.warn('Empty base64 data found, skipping...');
            continue;
          }

          const dataUrl = `data:${mimeType};base64,${base64Data}`;

          imageData.push({
            url: dataUrl,
            b64_json: base64Data
          });

          console.log('Successfully processed image data');
          break;
        }
      }

      if (imageData.length > 0) break;
    }

    if (imageData.length === 0) {
      console.error('No valid image data found in response');
      throw new Error('No valid image data found in Gemini response');
    }

    return {
      data: imageData
    };
  }
}