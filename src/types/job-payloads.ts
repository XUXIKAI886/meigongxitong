import type { Buffer } from 'buffer';
import type {
  PictureWallResponse,
  ReversePromptResponse,
  GenerateProductRequest,
} from './index';

export interface ImageJobResult {
  imageUrl: string;
  width: number;
  height: number;
}

export interface FoodReplacementJobPayload {
  sourceImageBuffer: string;
  targetImageBuffer: string;
  prompt: string;
}

export type FoodReplacementJobResult = ImageJobResult;

export interface BatchFoodReplacementJobPayload {
  sourceImageBuffers: string[];
  sourceImageTypes: string[];
  targetImageBuffer: string;
  targetImageType: string;
  prompt: string;
}

export interface BatchFoodReplacementResultItem {
  sourceImageIndex: number;
  imageUrl?: string;
  width?: number;
  height?: number;
  error?: string;
  originalSourceType: string;
}

export interface BatchFoodReplacementJobResult {
  processedCount: number;
  results: BatchFoodReplacementResultItem[];
}

export interface ReversePromptJobPayload {
  sourceImageBuffer: string;
  sourceImageType: string;
  scene: 'logo' | 'avatar';
  shopName: string;
  category: string;
  slogan?: string;
  extraDirectives?: string;
}

export type ReversePromptJobResult = ReversePromptResponse;

export interface GeneratePromptJobPayload {
  prompt: string;
  shopName: string;
  category: string;
  slogan?: string;
}

export type GenerateImageJobResult = ImageJobResult;

export interface PictureWallJobPayload {
  avatarImageBuffer: string;
  avatarImageType: string;
}

export type PictureWallJobResult = PictureWallResponse;

export type GenerateProductJobPayload = Pick<
  GenerateProductRequest,
  'sourceImageBuffer' | 'sourceImageType' | 'background' | 'enhance' | 'outputSize'
>;

export type ProductGenerationJobResult = ImageJobResult;

export interface ProductRefineJobPayload {
  sourceImageBuffer: string;
  sourceImageType: string;
  prompt: string;
}

export type ProductRefineJobResult = ImageJobResult;

export interface BatchProductRefineJobPayload {
  sourceImageBuffers: string[];
  sourceImageTypes: string[];
  prompt: string;
  outputFolder: string;
}

export interface BatchProductRefineResultItem {
  index: number;
  fileName?: string;
  filePath?: string;
  success: boolean;
  error?: string;
}

export interface BatchProductRefineJobResult {
  processedCount: number;
  outputFolder: string;
  results: BatchProductRefineResultItem[];
}

export interface SignboardReplaceTextJobPayload {
  sourceImageBuffer: string;
  sourceImageType: string;
  originalText: string;
  newText: string;
}

export type SignboardReplaceTextJobResult = ImageJobResult;

export interface MultiFusionJobPayload {
  sourceImageBuffers: Buffer[];
  targetImageBuffer: Buffer;
  prompt: string;
}

export type MultiFusionJobResult = ImageJobResult;

export interface BackgroundFusionJobPayload {
  sourceImageBuffer: Buffer;
  targetImageBuffer: Buffer;
  prompt: string;
}

export type BackgroundFusionJobResult = ImageJobResult;

export interface BatchBackgroundFusionJobPayload {
  sourceImageBuffers: Buffer[];
  targetImageBuffer: Buffer;
  prompt: string;
}

export interface BatchBackgroundFusionResultItem {
  sourceImageIndex: number;
  status: 'success' | 'failed';
  imageUrl?: string;
  width?: number;
  height?: number;
  error?: string;
}

export interface BatchBackgroundFusionJobResult {
  processedCount: number;
  results: BatchBackgroundFusionResultItem[];
}

export interface LogoStudioJobTemplate {
  buffer: string;
  type: string;
  id: string | null;
}

export interface LogoStudioJobPayload {
  storeName: string;
  templateStoreName: string;
  dishImageBuffer: string | null;
  dishImageType: string | undefined;
  avatarStage?: string | null;
  step1ResultUrl?: string | null;
  generateType?: 'avatar' | 'storefront' | 'poster';
  template?: LogoStudioJobTemplate;
  storefrontTemplate?: LogoStudioJobTemplate;
  posterTemplate?: LogoStudioJobTemplate;
  avatarTemplate?: LogoStudioJobTemplate;
}

export interface LogoStudioJobResult {
  avatarUrl: string;
  storefrontUrl: string;
  posterUrl: string;
  reversePrompt: string;
  finalPrompt: string;
}

export interface LogoStudioFusionJobResult {
  storefrontUrl?: string;
  posterUrl?: string;
  avatarUrl?: string;
  fusionPrompts?: {
    storefront?: string;
    poster?: string;
    avatar?: string;
  };
}
