import { BaseApiClient } from '../base/BaseApiClient';
import { ChatCompletionParams } from '@/types';

// 聊天完成API客户端
export class ChatApiClient extends BaseApiClient {
  constructor() {
    super(
      process.env.CHAT_API_BASE_URL!,
      process.env.CHAT_API_KEY!,
      60000
    );
  }

  async createChatCompletion(params: ChatCompletionParams) {
    const requestBody = {
      model: params.model || process.env.CHAT_MODEL_NAME,
      messages: params.messages,
      max_tokens: params.max_tokens || 4000,
      temperature: params.temperature || 0.7,
    };

    this.logRequest('Chat API', {
      model: requestBody.model,
      messageCount: requestBody.messages.length,
      maxTokens: requestBody.max_tokens,
      temperature: requestBody.temperature,
    });

    try {
      const response = await this.client.post('', requestBody);
      this.logResponse('Chat API', response);
      return response.data;
    } catch (error: any) {
      this.handleError(error, 'Chat API');
    }
  }

  async analyzeImageWithPrompt(imageUrl: string, prompt: string) {
    const messages = [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: prompt },
          { type: 'image_url' as const, image_url: { url: imageUrl } }
        ]
      }
    ];

    return this.createChatCompletion({
      model: process.env.CHAT_MODEL_NAME!,
      messages,
      max_tokens: 4000,
      temperature: 0.7,
    });
  }
}