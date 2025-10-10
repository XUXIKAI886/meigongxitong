// 统一导出所有API客户端
export { BaseApiClient } from './base/BaseApiClient';
export { ImageApiClient } from './clients/ImageApiClient';
export { ChatApiClient } from './clients/ChatApiClient';
export { ProductImageApiClient } from './clients/ProductImageApiClient';
export { ProductRefineApiClient } from './clients/ProductRefineApiClient';

// 创建客户端实例的工厂函数
export function createImageApiClient() {
  return new ImageApiClient();
}

export function createChatApiClient() {
  return new ChatApiClient();
}

export function createProductImageApiClient() {
  return new ProductImageApiClient();
}

export function createProductRefineApiClient() {
  return new ProductRefineApiClient();
}

// 向后兼容性支持 - 重新导出辅助函数
export { withRetry, rateLimiter, handleApiError } from '../api-client';