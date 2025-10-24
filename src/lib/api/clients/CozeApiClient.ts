import { BaseApiClient } from '../base/BaseApiClient';
import type {
  CozeChatRequest,
  CozeChatResponse,
  OptimizePromptRequest,
  GenerateDishRequest,
  GenerateDishResponse,
} from '@/types/coze';

/**
 * Coze API 客户端
 * 用于Logo设计工作室的AI菜品图生成功能
 *
 * 机器人1：菜品图生成器（bot_id: 7456823183216459803）
 * 机器人2：提示词优化器（bot_id: 7563941488246816808）
 */
export class CozeApiClient extends BaseApiClient {
  private accessToken: string;
  private botDishGenerator: string;
  private botPromptOptimizer: string;

  constructor(
    baseURL: string,
    accessToken: string,
    botDishGenerator: string,
    botPromptOptimizer: string
  ) {
    // 注意：Coze API使用自定义授权方式，不使用标准Bearer格式
    super(baseURL, accessToken, 120000); // 120秒超时
    this.accessToken = accessToken;
    this.botDishGenerator = botDishGenerator;
    this.botPromptOptimizer = botPromptOptimizer;
  }

  /**
   * 上传文件到Coze获取file_id
   *
   * @param file - File对象或Blob
   * @returns file_id字符串
   */
  async uploadFile(file: File | Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    this.logRequest('[CozeAPI] 上传文件', { fileName: file instanceof File ? file.name : 'blob', size: file.size });

    try {
      const response = await fetch(`${this.client.defaults.baseURL}/v1/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CozeAPI] 文件上传HTTP错误:', response.status, errorText);
        throw new Error(`文件上传失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.code !== 0) {
        console.error('[CozeAPI] 文件上传API错误:', result);
        throw new Error(`文件上传失败: ${result.msg || '未知错误'}`);
      }

      const fileId = result.data?.id;
      if (!fileId) {
        throw new Error('文件上传成功但未返回file_id');
      }

      console.log('[CozeAPI] 文件上传成功, file_id:', fileId);
      return fileId;
    } catch (error) {
      this.handleError(error, '[CozeAPI] 文件上传失败');
    }
  }

  /**
   * 机器人2：优化提示词（流式响应）
   *
   * @param params - 包含菜品描述和可选的原图base64
   * @returns ReadableStream 用于接收流式文本
   */
  async optimizePromptStream(params: OptimizePromptRequest): Promise<ReadableStream> {
    const { description, imageBase64 } = params;

    // 构造消息内容
    let messageContent: string;
    let contentType: 'text' | 'object_string';

    if (imageBase64) {
      // 有图片：先上传获取file_id，再构造object_string格式
      // 将base64转换为Blob（使用Buffer，兼容Node.js和浏览器）
      const buffer = Buffer.from(imageBase64, 'base64');
      const blob = new Blob([buffer], { type: 'image/jpeg' });

      // 上传文件获取file_id
      const fileId = await this.uploadFile(blob);

      // 使用file_id构造消息
      messageContent = JSON.stringify([
        { type: 'text', text: `菜品描述：${description}` },
        { type: 'image', file_id: fileId }
      ]);
      contentType = 'object_string';
    } else {
      // 无图片：纯文本
      messageContent = `菜品描述：${description}`;
      contentType = 'text';
    }

    // 构造Coze API请求
    const request: CozeChatRequest = {
      bot_id: this.botPromptOptimizer,
      user_id: `user_${Date.now()}`, // 临时用户ID
      stream: true,
      auto_save_history: false,
      additional_messages: [
        {
          role: 'user',
          content: messageContent,
          content_type: contentType,
        }
      ],
    };

    this.logRequest('[CozeAPI] 优化提示词（流式）', { description, hasImage: !!imageBase64 });

    try {
      const response = await fetch(`${this.client.defaults.baseURL}/v3/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream', // SSE流式响应
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CozeAPI] HTTP错误:', response.status, response.statusText, errorText);
        throw new Error(`Coze API请求失败: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('响应体不存在');
      }

      console.log('[CozeAPI] 流式响应已建立，Content-Type:', response.headers.get('content-type'));
      return response.body;
    } catch (error) {
      this.handleError(error, '[CozeAPI] 优化提示词流式调用失败');
    }
  }

  /**
   * 机器人1：生成菜品图（流式响应）
   *
   * @param params - 包含优化后的提示词
   * @returns ReadableStream 用于接收流式响应
   */
  async generateDishImageStream(params: GenerateDishRequest): Promise<ReadableStream> {
    const { prompt } = params;

    const request: CozeChatRequest = {
      bot_id: this.botDishGenerator,
      user_id: `user_${Date.now()}`,
      stream: true, // 使用流式响应
      auto_save_history: false,
      additional_messages: [
        {
          role: 'user',
          content: prompt,
          content_type: 'text',
        }
      ],
    };

    this.logRequest('[CozeAPI] 生成菜品图（流式）', { promptLength: prompt.length });

    try {
      const response = await fetch(`${this.client.defaults.baseURL}/v3/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CozeAPI] HTTP错误:', response.status, response.statusText, errorText);
        throw new Error(`Coze API请求失败: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('响应体不存在');
      }

      console.log('[CozeAPI] 菜品图生成流式响应已建立，Content-Type:', response.headers.get('content-type'));
      return response.body;
    } catch (error) {
      this.handleError(error, '[CozeAPI] 生成菜品图流式调用失败');
    }
  }

  /**
   * 工具方法：将File对象转换为base64字符串
   * 用于前端上传原图时的格式转换
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 去掉data:image/xxx;base64,前缀，只保留纯base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 工具方法：压缩图片到指定尺寸
   * 用于减少base64数据大小，避免请求过大
   */
  static async compressImage(file: File, maxWidth: number = 800, maxHeight: number = 800): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // 计算缩放比例
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          // 使用canvas压缩
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('无法创建canvas上下文'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('压缩失败'));
              }
            },
            'image/jpeg',
            0.85 // 质量85%
          );
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
