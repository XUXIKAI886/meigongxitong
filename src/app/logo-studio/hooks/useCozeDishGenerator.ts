'use client';

import { useState, useCallback } from 'react';

export interface UseCozeDishGeneratorParams {
  onGenerationComplete?: (imageUrl: string, imageBase64?: string) => void;
  onError?: (error: string) => void;
}

interface GenerationResult {
  imageUrl?: string;
  imageBase64?: string;
}

/**
 * useCozeDishGenerator
 * 管理菜品图生成的流式API调用
 *
 * 功能：
 * 1. 调用/api/coze/generate-dish (SSE流式接口)
 * 2. 显示加载状态
 * 3. 处理生成结果(URL或base64)
 * 4. 支持重新生成和取消
 */
export function useCozeDishGenerator(params?: UseCozeDishGeneratorParams) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 保存最后一次的提示词，用于重新生成
  const [lastPrompt, setLastPrompt] = useState<string>('');

  // AbortController用于取消请求
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  /**
   * 生成菜品图（流式响应）
   * @param prompt - 优化后的提示词
   */
  const generateDishImage = useCallback(async (prompt: string) => {
    // 取消之前的请求
    if (abortController) {
      abortController.abort();
    }

    const controller = new AbortController();
    setAbortController(controller);

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setLastPrompt(prompt); // 保存以便重新生成

    try {
      console.log('[useCozeDishGenerator] 开始生成菜品图（流式）');

      const response = await fetch('/api/coze/generate-dish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // 检查是否是流式响应
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('text/event-stream')) {
        throw new Error('响应类型错误：期待SSE流，收到 ' + contentType);
      }

      console.log('[useCozeDishGenerator] SSE流已建立');

      // 读取SSE流
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[useCozeDishGenerator] SSE流读取完成');
          break;
        }

        // 解码数据
        buffer += decoder.decode(value, { stream: true });

        // 按行处理
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();

            // 检查是否是流结束标记
            if (dataStr === '[DONE]') {
              console.log('[useCozeDishGenerator] 收到流结束标记');
              break;
            }

            try {
              const data = JSON.parse(dataStr);

              // 收到图片数据
              if (data.imageUrl || data.imageBase64) {
                console.log('[useCozeDishGenerator] 收到图片数据:', {
                  hasUrl: !!data.imageUrl,
                  hasBase64: !!data.imageBase64,
                });

                const result: GenerationResult = {
                  imageUrl: data.imageUrl,
                  imageBase64: data.imageBase64,
                };

                setGeneratedImage(result);

                // 调用回调
                const finalImage = result.imageUrl || result.imageBase64 || '';
                params?.onGenerationComplete?.(finalImage, result.imageBase64);
              }
            } catch (parseError) {
              console.warn('[useCozeDishGenerator] JSON解析失败:', dataStr, parseError);
            }
          }
        }
      }

      console.log('[useCozeDishGenerator] 菜品图生成完成');
    } catch (err: any) {
      // 忽略取消错误
      if (err.name === 'AbortError') {
        console.log('[useCozeDishGenerator] 请求已取消');
        return;
      }

      console.error('[useCozeDishGenerator] 生成失败:', err);
      const errorMessage = err.message || '生成菜品图失败，请稍后重试';
      setError(errorMessage);
      params?.onError?.(errorMessage);
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  }, [params, abortController]);

  /**
   * 取消生成
   */
  const cancel = useCallback(() => {
    if (abortController) {
      console.log('[useCozeDishGenerator] 取消生成');
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
    }
  }, [abortController]);

  /**
   * 重新生成（使用上次的提示词）
   */
  const regenerate = useCallback(async () => {
    if (!lastPrompt) {
      setError('没有可重新生成的提示词');
      return;
    }

    console.log('[useCozeDishGenerator] 重新生成菜品图');
    await generateDishImage(lastPrompt);
  }, [lastPrompt, generateDishImage]);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    cancel(); // 取消正在进行的请求
    setIsGenerating(false);
    setGeneratedImage(null);
    setError(null);
    setLastPrompt('');
  }, [cancel]);

  /**
   * 获取最终图片URL（优先返回imageUrl，否则返回base64）
   */
  const getFinalImageUrl = useCallback((): string | null => {
    if (!generatedImage) return null;
    return generatedImage.imageUrl || generatedImage.imageBase64 || null;
  }, [generatedImage]);

  return {
    isGenerating,
    generatedImage,
    error,
    generateDishImage,
    regenerate,
    cancel,
    reset,
    getFinalImageUrl,
  };
}
