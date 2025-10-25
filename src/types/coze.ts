// Coze API 相关类型定义

export interface CozeMessage {
  role: 'user' | 'assistant';
  content: string;
  content_type: 'text' | 'object_string';
}

export interface CozeChatRequest {
  bot_id: string;
  user_id: string;
  stream: boolean;
  auto_save_history?: boolean;
  additional_messages: CozeMessage[];
  custom_variables?: Record<string, string>;
}

export interface CozeChatResponse {
  code: number;
  msg: string;
  data: {
    conversation_id: string;
    id: string;
    messages: Array<{
      role: string;
      type: string;
      content: string;
      content_type: string;
    }>;
  };
}

export interface CozeStreamEvent {
  event: string;
  data: string;
}

export interface CozeStreamDelta {
  role: string;
  type: string;
  content: string;
}

// 提示词优化请求
export interface OptimizePromptRequest {
  description: string;
  imageBase64?: string;
}

// 菜品图生成请求
export interface GenerateDishRequest {
  prompt: string;
}

// 菜品图生成响应
export interface GenerateDishResponse {
  imageUrl?: string;
  imageBase64?: string;
}

// 抠图请求
export interface CutoutImageRequest {
  imageBase64: string;  // 原图的base64编码（不含data:image前缀）
  prompt: string;        // 抠图提示词
}

// 抠图响应
export interface CutoutImageResponse {
  imageUrl?: string;     // 抠图后的图片URL（HTTP/HTTPS）
  imageBase64?: string;  // 或base64格式（data:image/...）
}
