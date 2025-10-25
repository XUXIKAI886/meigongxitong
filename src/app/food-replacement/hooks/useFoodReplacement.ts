import { useState, useCallback, useEffect, useRef } from 'react';
import { JobStatus, FoodReplacementResult } from '../types';

export function useFoodReplacement() {
  // 模式状态
  const [isBatchMode, setIsBatchMode] = useState(false);

  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [shouldStopPolling, setShouldStopPolling] = useState(false);
  const [completedResults, setCompletedResults] = useState<FoodReplacementResult[]>([]);

  // 保存当前任务的原始文件名映射
  const [currentJobFileNames, setCurrentJobFileNames] = useState<string[]>([]);
  const fileNamesRef = useRef<string[]>([]);

  // 清除历史结果 - 仅清空当前会话的状态
  const clearHistoryResults = useCallback(() => {
    setCompletedResults([]);
  }, []);

  // 轮询作业状态
  const pollJobStatus = useCallback(async (jobId: string, fileNames?: string[]) => {
    // 如果提供了文件名数组，保存它
    if (fileNames) {
      console.log('pollJobStatus - 保存原始文件名:', fileNames);
      setCurrentJobFileNames(fileNames);
      fileNamesRef.current = fileNames;
    }
    let pollCount = 0;
    const maxPollCount = 120; // 最多轮询2分钟

    const poll = async () => {
      if (shouldStopPolling) return;

      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();

        if (data.ok && data.job) {
          setJobStatus(data.job);

          if (data.job.status === 'succeeded') {
            // 处理成功结果
            const results = data.job.result?.results || [data.job.result];
            console.log('处理成功结果 - 当前文件名数组 (state):', currentJobFileNames);
            console.log('处理成功结果 - 当前文件名数组 (ref):', fileNamesRef.current);
            console.log('处理成功结果 - 原始结果:', results);

            const newResults = results
              .filter((r: any) => r && r.imageUrl)
              .map((r: any, index: number) => {
                // 根据sourceImageIndex获取原始文件名
                const sourceIndex = r.sourceImageIndex !== undefined ? r.sourceImageIndex : index;
                const originalFileName = fileNamesRef.current[sourceIndex];

                console.log(`处理结果 ${index}: sourceIndex=${sourceIndex}, fileName=${originalFileName}`);

                const resultObj = {
                  id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 15)}`,
                  imageUrl: r.imageUrl,
                  width: r.width,
                  height: r.height,
                  sourceImageIndex: r.sourceImageIndex,
                  sourceFileName: originalFileName,
                  processedAt: new Date().toISOString(),
                };

                console.log('创建结果对象:', resultObj);
                return resultObj;
              });

            setCompletedResults(prevResults => [...prevResults, ...newResults]);
            setIsProcessing(false);
            return;
          }

          if (data.job.status === 'failed') {
            setIsProcessing(false);
            return;
          }

          // 继续轮询
          if (pollCount < maxPollCount) {
            pollCount++;
            setTimeout(poll, 2000);
          } else {
            setIsProcessing(false);
            setJobStatus({
              ...data.job,
              status: 'failed',
              error: '处理超时，请重试'
            });
          }
        }
      } catch (error) {
        console.error('轮询作业状态失败:', error);
        console.error('轮询错误详情:', error instanceof Error ? error.message : error);
        if (pollCount < maxPollCount) {
          pollCount++;
          console.log(`轮询重试 ${pollCount}/${maxPollCount}`);
          setTimeout(poll, 2000);
        } else {
          console.error('轮询达到最大重试次数，停止处理');
          setIsProcessing(false);
          setJobStatus({
            id: jobId,
            status: 'failed',
            progress: 0,
            error: '网络连接超时，请检查网络连接后重试'
          });
        }
      }
    };

    poll();
  }, [shouldStopPolling]);

  // 添加结果的方法 - 仅在当前会话中保存，不持久化
  const addResults = useCallback((newResults: FoodReplacementResult[]) => {
    setCompletedResults(prevResults => [...prevResults, ...newResults]);
  }, []);

  // 更新单个结果的方法
  const updateResult = useCallback((index: number, updatedResult: FoodReplacementResult) => {
    setCompletedResults(prevResults => {
      const newResults = [...prevResults];
      newResults[index] = updatedResult;
      return newResults;
    });
  }, []);

  return {
    // 状态
    isBatchMode,
    isProcessing,
    jobStatus,
    completedResults,
    currentJobFileNames,

    // 操作
    setIsBatchMode,
    setIsProcessing,
    setJobStatus,
    setShouldStopPolling,
    clearHistoryResults,
    pollJobStatus,
    setCurrentJobFileNames,
    addResults, // 新增: 添加结果的方法
    updateResult, // 新增: 更新单个结果的方法
  };
}