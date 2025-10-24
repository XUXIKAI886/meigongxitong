'use client';

import { useState, useCallback, useRef } from 'react';

export interface UseCozePromptOptimizerParams {
  onOptimizationComplete?: (optimizedPrompt: string) => void;
  onError?: (error: string) => void;
}

/**
 * useCozePromptOptimizer
 * 管理提示词优化的流式响应处理
 *
 * 功能：
 * 1. 调用/api/coze/optimize-prompt (SSE流式接口)
 * 2. 实时解析Server-Sent Events事件流
 * 3. 逐字追加到optimizedText状态
 * 4. 提供给父组件用于实时覆盖输入框内容
 */
export function useCozePromptOptimizer(params?: UseCozePromptOptimizerParams) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedText, setOptimizedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 使用ref跟踪当前请求，用于取消
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 开始优化提示词（流式响应）
   * @param description - 菜品描述
   * @param imageBase64 - 可选的原图base64（不含data:前缀）
   */
  const optimizePrompt = useCallback(async (
    description: string,
    imageBase64?: string
  ) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsOptimizing(true);
    setOptimizedText('');
    setError(null);

    try {
      console.log('[useCozePromptOptimizer] 开始优化提示词（流式）');

      const response = await fetch('/api/coze/optimize-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          imageBase64,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('响应体不存在');
      }

      // 处理SSE流
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[useCozePromptOptimizer] SSE流读取完成');
          break;
        }

        // 解码新数据
        buffer += decoder.decode(value, { stream: true });

        // 按行分割SSE事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一个不完整的行

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const dataStr = line.substring(6).trim();

          // 检查结束标记
          if (dataStr === '[DONE]') {
            console.log('[useCozePromptOptimizer] 收到结束标记');
            setIsOptimizing(false);
            params?.onOptimizationComplete?.(accumulatedText);
            return;
          }

          try {
            const data = JSON.parse(dataStr);

            if (data.content) {
              // 追加新内容
              accumulatedText += data.content;
              setOptimizedText(accumulatedText);
            }
          } catch (parseError) {
            console.warn('[useCozePromptOptimizer] SSE数据解析失败:', dataStr);
          }
        }
      }

      // 流读取完成（即使没收到[DONE]标记）
      setIsOptimizing(false);
      if (accumulatedText) {
        params?.onOptimizationComplete?.(accumulatedText);
      }
    } catch (err: any) {
      // 忽略手动取消的错误
      if (err.name === 'AbortError') {
        console.log('[useCozePromptOptimizer] 请求已取消');
        setIsOptimizing(false);
        return;
      }

      console.error('[useCozePromptOptimizer] 优化失败:', err);
      const errorMessage = err.message || '优化提示词失败，请稍后重试';
      setError(errorMessage);
      setIsOptimizing(false);
      params?.onError?.(errorMessage);
    }
  }, [params]);

  /**
   * 取消当前优化请求
   */
  const cancelOptimization = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsOptimizing(false);
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    cancelOptimization();
    setOptimizedText('');
    setError(null);
  }, [cancelOptimization]);

  return {
    isOptimizing,
    optimizedText,
    error,
    optimizePrompt,
    cancelOptimization,
    reset,
  };
}
