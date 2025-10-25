'use client';

import { useState, useCallback } from 'react';

/**
 * 图片格式转换工具函数
 */

// File对象转base64字符串（去除data:image前缀）
function fileToBase64(file: File): Promise<string> {
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

// 下载URL图片并转换为File对象（保持原始文件名）
async function downloadImageAsFile(url: string, originalFilename: string): Promise<File> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载失败: HTTP ${response.status}`);
    }
    const blob = await response.blob();
    // 使用原始文件名，不添加任何前缀
    return new File([blob], originalFilename, { type: 'image/png' });
  } catch (error) {
    console.error('下载图片失败:', error);
    throw error;
  }
}

/**
 * useBatchCutout Hook
 * 管理批量抠图的状态和流式API调用
 *
 * 功能：
 * 1. 串行处理多张图片（避免并发压力）
 * 2. 调用/api/coze/cutout-image (SSE流式接口)
 * 3. 实时更新进度状态
 * 4. 支持容错（单张失败不影响后续）
 * 5. 存储抠图结果供用户预览确认
 */
export function useBatchCutout() {
  // 抠图状态
  const [isCutting, setIsCutting] = useState(false);
  const [cutoutProgress, setCutoutProgress] = useState(0); // 0-100
  const [currentImageIndex, setCurrentImageIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  // 成功/失败统计
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [failedIndices, setFailedIndices] = useState<number[]>([]);

  // 抠图结果存储（索引对应原图索引）
  const [cutoutResults, setCutoutResults] = useState<(File | null)[]>([]);

  /**
   * 批量抠图主函数
   * @param sourceImages - 源图片数组
   */
  const batchCutout = useCallback(async (sourceImages: File[]) => {
    if (sourceImages.length === 0) {
      setError('没有需要抠图的图片');
      return;
    }

    console.log(`[useBatchCutout] 开始批量抠图: ${sourceImages.length}张图片`);

    setIsCutting(true);
    setError(null);
    setSuccessCount(0);
    setFailedCount(0);
    setFailedIndices([]);

    // 初始化抠图结果数组
    const results: (File | null)[] = new Array(sourceImages.length).fill(null);

    let tempSuccessCount = 0;
    let tempFailedCount = 0;
    const tempFailedIndices: number[] = [];

    // 串行处理每张图片
    for (let i = 0; i < sourceImages.length; i++) {
      setCurrentImageIndex(i);
      setCutoutProgress(Math.round((i / sourceImages.length) * 100));

      console.log(`[useBatchCutout] 处理第 ${i + 1}/${sourceImages.length} 张: ${sourceImages[i].name}`);

      try {
        // 1. 将图片转base64
        const imageBase64 = await fileToBase64(sourceImages[i]);
        console.log(`[useBatchCutout] 图片${i + 1}转base64成功，长度: ${imageBase64.length}`);

        // 2. 调用抠图API（SSE流式响应）
        const response = await fetch('/api/coze/cutout-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageBase64 }),
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

        console.log(`[useBatchCutout] 图片${i + 1} SSE流已建立`);

        // 3. 读取SSE流
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法获取响应流');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let cutoutImageUrl = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log(`[useBatchCutout] 图片${i + 1} SSE流读取完成`);
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
                break;
              }

              try {
                const data = JSON.parse(dataStr);

                // 收到图片数据
                if (data.imageUrl || data.imageBase64) {
                  cutoutImageUrl = data.imageUrl || data.imageBase64;
                  console.log(`[useBatchCutout] 图片${i + 1}抠图结果:`, {
                    hasUrl: !!data.imageUrl,
                    hasBase64: !!data.imageBase64,
                  });
                }
              } catch (parseError) {
                console.warn(`[useBatchCutout] 图片${i + 1} JSON解析失败:`, dataStr, parseError);
              }
            }
          }
        }

        // 4. 验证是否收到图片URL
        if (!cutoutImageUrl) {
          throw new Error('未收到抠图结果');
        }

        // 5. 下载并转换为File对象（保持原始文件名）
        console.log(`[useBatchCutout] 图片${i + 1}开始下载抠图结果...`);
        const cutoutFile = await downloadImageAsFile(
          cutoutImageUrl,
          sourceImages[i].name  // 使用原始文件名，不添加前缀
        );

        console.log(`[useBatchCutout] 图片${i + 1}下载成功:`, cutoutFile.name);

        // 6. 存储抠图结果
        results[i] = cutoutFile;

        tempSuccessCount++;
        console.log(`✓ 第 ${i + 1} 张抠图成功`);

      } catch (err: any) {
        tempFailedCount++;
        tempFailedIndices.push(i);
        console.error(`✗ 第 ${i + 1} 张抠图失败:`, err);

        // 设置错误信息但继续处理下一张
        setError(`第 ${i + 1} 张图片抠图失败: ${err.message || '未知错误'}`);
        // 继续处理下一张
      }
    }

    // 全部处理完成
    setIsCutting(false);
    setCutoutProgress(100);
    setCurrentImageIndex(-1);
    setSuccessCount(tempSuccessCount);
    setFailedCount(tempFailedCount);
    setFailedIndices(tempFailedIndices);

    // 存储抠图结果
    setCutoutResults(results);

    console.log('[useBatchCutout] 批量抠图完成:', {
      total: sourceImages.length,
      success: tempSuccessCount,
      failed: tempFailedCount,
      failedIndices: tempFailedIndices,
    });

  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setIsCutting(false);
    setCutoutProgress(0);
    setCurrentImageIndex(-1);
    setError(null);
    setSuccessCount(0);
    setFailedCount(0);
    setFailedIndices([]);
    setCutoutResults([]);
  }, []);

  /**
   * 单张图片重新抠图
   * @param index - 图片索引
   * @param sourceImage - 源图片File对象
   */
  const recutSingleImage = useCallback(async (index: number, sourceImage: File) => {
    console.log(`[useBatchCutout] 重新抠图第 ${index + 1} 张: ${sourceImage.name}`);

    try {
      // 1. 将图片转base64
      const imageBase64 = await fileToBase64(sourceImage);
      console.log(`[useBatchCutout] 图片${index + 1}转base64成功，长度: ${imageBase64.length}`);

      // 2. 调用抠图API（SSE流式响应）
      const response = await fetch('/api/coze/cutout-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64 }),
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

      console.log(`[useBatchCutout] 图片${index + 1} SSE流已建立`);

      // 3. 读取SSE流
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let cutoutImageUrl = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log(`[useBatchCutout] 图片${index + 1} SSE流读取完成`);
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
              break;
            }

            try {
              const data = JSON.parse(dataStr);

              // 收到图片数据
              if (data.imageUrl || data.imageBase64) {
                cutoutImageUrl = data.imageUrl || data.imageBase64;
                console.log(`[useBatchCutout] 图片${index + 1}抠图结果:`, {
                  hasUrl: !!data.imageUrl,
                  hasBase64: !!data.imageBase64,
                });
              }
            } catch (parseError) {
              console.warn(`[useBatchCutout] 图片${index + 1} JSON解析失败:`, dataStr, parseError);
            }
          }
        }
      }

      // 4. 验证是否收到图片URL
      if (!cutoutImageUrl) {
        throw new Error('未收到抠图结果');
      }

      // 5. 下载并转换为File对象（保持原始文件名）
      console.log(`[useBatchCutout] 图片${index + 1}开始下载抠图结果...`);
      const cutoutFile = await downloadImageAsFile(
        cutoutImageUrl,
        sourceImage.name  // 使用原始文件名
      );

      console.log(`[useBatchCutout] 图片${index + 1}下载成功:`, cutoutFile.name);

      // 6. 更新抠图结果数组中对应索引的结果
      setCutoutResults(prevResults => {
        const newResults = [...prevResults];
        newResults[index] = cutoutFile;
        return newResults;
      });

      console.log(`✓ 第 ${index + 1} 张重新抠图成功`);
      return cutoutFile;

    } catch (err: any) {
      console.error(`✗ 第 ${index + 1} 张重新抠图失败:`, err);
      throw err;
    }
  }, []);

  /**
   * 清空抠图结果
   */
  const clearCutoutResults = useCallback(() => {
    setCutoutResults([]);
  }, []);

  return {
    // 状态
    isCutting,
    cutoutProgress,
    currentImageIndex,
    error,
    successCount,
    failedCount,
    failedIndices,
    cutoutResults,  // 新增：抠图结果数组

    // 操作
    batchCutout,
    recutSingleImage,  // 新增：单张重新抠图
    reset,
    clearCutoutResults,  // 新增：清空抠图结果
  };
}
