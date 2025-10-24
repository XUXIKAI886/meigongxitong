'use client';

import type { LogoStudioJobStatus } from '../types';

interface PollCommonOptions {
  jobId: string;
  shouldStop: () => boolean;
  onStop: () => void;
  onUpdate?: (status: LogoStudioJobStatus) => void;
  onSuccess: (status: LogoStudioJobStatus) => void;
  onError: (message: string) => void;
  maxAttempts?: number;
  intervalMs?: number;
  initialDelayMs?: number;
}

// 统一的 Job Queue 状态轮询逻辑
export function startJobPolling(options: PollCommonOptions) {
  const {
    jobId,
    shouldStop,
    onStop,
    onUpdate,
    onSuccess,
    onError,
    maxAttempts = 150,
    intervalMs = 2000,
    initialDelayMs = 1000,
  } = options;

  let attempts = 0;

  const poll = async () => {
    if (shouldStop() || attempts >= maxAttempts) {
      onStop();
      return;
    }

    attempts += 1;

    try {
      const response = await fetch(`/api/jobs/${jobId}`);

      if (response.status === 404) {
        if (attempts > 10) {
          onStop();
          return;
        }
        setTimeout(poll, intervalMs);
        return;
      }

      const apiResponse = await response.json();
      if (!apiResponse.ok || !apiResponse.job) {
        if (attempts < maxAttempts) {
          setTimeout(poll, intervalMs);
        } else {
          onError('获取任务信息失败');
          onStop();
        }
        return;
      }

      const status: LogoStudioJobStatus = apiResponse.job;
      onUpdate?.(status);

      if (status.status === 'succeeded') {
        onSuccess(status);
        onStop();
      } else if (status.status === 'failed') {
        onError(status.error || '生成任务失败');
        onStop();
      } else {
        setTimeout(poll, intervalMs);
      }
    } catch (error) {
      console.error('轮询任务失败:', error);
      if (attempts < maxAttempts) {
        setTimeout(poll, intervalMs);
      } else {
        onError('生成任务失败，请稍后再试。');
        onStop();
      }
    }
  };

  setTimeout(poll, initialDelayMs);
}
