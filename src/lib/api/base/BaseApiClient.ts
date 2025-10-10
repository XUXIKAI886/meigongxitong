import axios, { AxiosInstance, AxiosResponse } from 'axios';

// 基础API客户端类
export abstract class BaseApiClient {
  protected client: AxiosInstance;

  constructor(baseURL: string, apiKey: string, timeout: number = 60000) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout,
    });
  }

  // 通用错误处理
  protected handleError(error: any, context: string): never {
    console.error(`${context} Error Details:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }

  // 通用请求日志
  protected logRequest(context: string, params: any) {
    console.log(`${context} Request:`, {
      url: this.client.defaults.baseURL,
      ...params
    });
  }

  // 通用响应日志
  protected logResponse(context: string, response: AxiosResponse) {
    console.log(`${context} Response:`, {
      status: response.status,
      hasData: !!response.data,
      dataLength: response.data?.data?.length
    });
  }
}