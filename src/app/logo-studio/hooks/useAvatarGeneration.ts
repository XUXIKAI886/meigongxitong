'use client';

import { useCallback, useRef, useState } from 'react';
import { startJobPolling } from './pollers';
import type { LogoTemplate, LogoStudioJobStatus } from '../types';

interface UseAvatarGenerationParams {
  storeName: string;
  templateStoreName: string;
  dishImage: File | null;
  avatarTemplate: LogoTemplate | null;
}

interface AvatarGenerationState {
  avatarResult: string | null;
  avatarStep1Result: string | null;
  avatarStep1Generating: boolean;
  avatarStep2Generating: boolean;
  generateAvatarStep1: () => Promise<void>;
  generateAvatarStep2: () => Promise<void>;
  setAvatarResult: (value: string | null) => void;
}

export function useAvatarGeneration({
  storeName,
  templateStoreName,
  dishImage,
  avatarTemplate,
}: UseAvatarGenerationParams): AvatarGenerationState {
  const [avatarResult, setAvatarResult] = useState<string | null>(null);
  const [avatarStep1Result, setAvatarStep1Result] = useState<string | null>(null);
  const [avatarStep1Generating, setAvatarStep1Generating] = useState(false);
  const [avatarStep2Generating, setAvatarStep2Generating] = useState(false);
  const shouldStopRef = useRef(false);

  const validateCommon = useCallback(() => {
    if (!dishImage) {
      alert('请上传菜品图片后再生成头像。');
      return false;
    }
    if (!avatarTemplate) {
      alert('请选择品牌头像的模板。');
      return false;
    }
    return true;
  }, [avatarTemplate, dishImage]);

  const generateAvatarStep1 = useCallback(async () => {
    if (!validateCommon()) {
      return;
    }

    setAvatarStep1Generating(true);
    setAvatarStep1Result(null);
    setAvatarResult(null);
    shouldStopRef.current = false;

    try {
      const formData = new FormData();
      formData.append('storeName', '占位门店');
      formData.append('templateStoreName', '占位门店');
      formData.append('generateType', 'avatar');
      formData.append('avatarStage', 'step1');
      formData.append('dishImage', dishImage!);

      const avatarResponse = await fetch(avatarTemplate!.url);
      const avatarBlob = await avatarResponse.blob();
      formData.append('avatarTemplate', avatarBlob, `avatar-${avatarTemplate!.id}.png`);
      formData.append('avatarTemplateId', avatarTemplate!.id);

      const response = await fetch('/api/logo-studio/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('头像第一步生成失败');
      }

      const data = await response.json();

      if (data.data?.avatarUrl) {
        setAvatarStep1Result(data.data.avatarUrl);
        setAvatarStep1Generating(false);
        return;
      }

      startJobPolling({
        jobId: data.jobId,
        shouldStop: () => shouldStopRef.current,
        onStop: () => {
          shouldStopRef.current = true;
          setAvatarStep1Generating(false);
        },
        onSuccess: (status) => {
          if (status.result?.avatarUrl) {
            setAvatarStep1Result(status.result.avatarUrl);
            setAvatarResult(null);
          }
        },
        onError: (message) => alert(`头像第一步失败：${message}`),
      });
    } catch (error) {
      console.error('头像第一步生成失败:', error);
      alert('头像第一步生成失败，请稍后重试。');
      setAvatarStep1Generating(false);
    }
  }, [avatarTemplate, dishImage, validateCommon]);

  const generateAvatarStep2 = useCallback(async () => {
    if (!avatarStep1Result) {
      alert('请先完成第一步菜品替换。');
      return;
    }
    if (!storeName.trim()) {
      alert('请输入门店名称。');
      return;
    }
    if (!templateStoreName.trim()) {
      alert('请输入模板中的原始店名。');
      return;
    }
    if (!validateCommon()) {
      return;
    }

    setAvatarStep2Generating(true);
    shouldStopRef.current = false;

    try {
      const formData = new FormData();
      formData.append('storeName', storeName.trim());
      formData.append('templateStoreName', templateStoreName.trim());
      formData.append('generateType', 'avatar');
      formData.append('avatarStage', 'step2');
      formData.append('step1ResultUrl', avatarStep1Result);
      formData.append('dishImage', dishImage!);

      const avatarResponse = await fetch(avatarTemplate!.url);
      const avatarBlob = await avatarResponse.blob();
      formData.append('avatarTemplate', avatarBlob, `avatar-${avatarTemplate!.id}.png`);
      formData.append('avatarTemplateId', avatarTemplate!.id);

      const response = await fetch('/api/logo-studio/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('头像第二步生成失败');
      }

      const data = await response.json();

      if (data.data?.avatarUrl) {
        setAvatarResult(data.data.avatarUrl);
        setAvatarStep1Result(null);
        setAvatarStep2Generating(false);
        return;
      }

      startJobPolling({
        jobId: data.jobId,
        shouldStop: () => shouldStopRef.current,
        onStop: () => {
          shouldStopRef.current = true;
          setAvatarStep2Generating(false);
        },
        onSuccess: (status) => {
          if (status.result?.avatarUrl) {
            setAvatarResult(status.result.avatarUrl);
            setAvatarStep1Result(null);
          }
        },
        onError: (message) => alert(`头像第二步失败：${message}`),
      });
    } catch (error) {
      console.error('头像第二步生成失败:', error);
      alert('头像第二步生成失败，请稍后重试。');
      setAvatarStep2Generating(false);
    }
  }, [avatarStep1Result, avatarTemplate, dishImage, storeName, templateStoreName, validateCommon]);

  return {
    avatarResult,
    avatarStep1Result,
    avatarStep1Generating,
    avatarStep2Generating,
    generateAvatarStep1,
    generateAvatarStep2,
    setAvatarResult,
  };
}
