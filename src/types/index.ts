// Job management types
export interface Job {
  id: string;
  type: 'reverse-prompt' | 'generate-logo' | 'generate-storefront' | 'generate-poster' | 'generate-product' | 'signboard-replace' | 'picture-wall';
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  payload: any;
  result?: any;
  progress?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API request/response types
export interface ReversePromptRequest {
  inputImageUrl: string;
  scene: 'logo' | 'avatar';
  shopName: string;
  category: string;
  slogan?: string;
  extraDirectives?: string;
}

export interface ReversePromptResponse {
  summary: string;
  prompt: string;
  tokens: number;
}

export interface GenerateProductRequest {
  sourceImageBuffer: string; // base64 encoded image data
  sourceImageType: string; // MIME type
  background: {
    mode: 'solid' | 'gradient' | 'texture' | 'text2img';
    solidColor?: string;
    gradient?: { from: string; to: string; angle: number };
    texturePrompt?: string;
    text2imgPrompt?: string;
  };
  enhance?: {
    sharpen: boolean;
    denoise: boolean;
    beautify: boolean;
    beautifyPreset: string;
  };
  outputSize: string; // "600x450"
}

export interface GenerateProductResponse {
  imageUrl: string;
  width: number;
  height: number;
}

export interface SignboardReplaceTextRequest {
  imageUrl: string;
  mask: string; // base64 encoded mask
  newText: string;
  style: {
    fontFamily: string;
    weight: 'Regular' | 'Bold';
    color: string;
    effects: { shadow: boolean; glow: boolean; bevel: boolean };
    perspective: { skewX: number; skewY: number; depth: number };
  };
}

export interface SignboardReplaceTextResponse {
  imageUrl: string;
}

export interface PictureWallRequest {
  avatarImageUrl: string;
}

export interface PictureWallResponse {
  images: Array<{
    imageUrl: string;
    width: number;
    height: number;
  }>;
  reversePrompt?: {
    summary: string;
    prompt: string;
    enhancedPrompt: string;
  };
}

// Standard API response wrapper
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  requestId: string;
  durationMs: number;
}

// File upload types
export interface UploadedFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
}

// Business categories
export const BUSINESS_CATEGORIES = [
  '中餐',
  '西餐',
  '日韩料理',
  '东南亚菜',
  '快餐',
  '奶茶饮品',
  '咖啡',
  '甜品烘焙',
  '火锅',
  '烧烤',
  '小吃',
  '水果生鲜',
  '其他'
] as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];

// Image generation parameters
export interface ImageGenerationParams {
  prompt: string;
  size: string;
  n?: number;
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
}

// Chat completion parameters
export interface ChatCompletionParams {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
  }>;
  max_tokens?: number;
  temperature?: number;
}
