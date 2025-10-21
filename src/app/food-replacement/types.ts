// 食物替换功能相关类型定义
export interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  progress: number;
  error?: string;
  result?: {
    imageUrl?: string;
    width?: number;
    height?: number;
    processedCount?: number;
    results?: Array<{
      sourceImageIndex: number;
      imageUrl?: string;
      width?: number;
      height?: number;
      error?: string;
      originalSourceType: string;
    }>;
  };
}

export interface Template {
  id: string;
  name: string;
  url: string;
  category?: string;
  platform?: 'meituan' | 'eleme'; // 平台标识：美团或饿了么
}

export interface FoodReplacementResult {
  id: string;
  imageUrl: string;
  width?: number;
  height?: number;
  sourceImageIndex?: number;
  sourceFileName?: string;
  processedAt: string;
}