'use client';

import { useCallback, useRef, useState } from 'react';
import { startJobPolling } from './pollers';
import type { LogoTemplate, LogoStudioJobStatus } from '../types';

type MaterialType = 'storefront' | 'poster';

interface UseMaterialGenerationParams {
  storeName: string;
  dishImage: File | null;
  storefrontTemplate: LogoTemplate | null;
  posterTemplate: LogoTemplate | null;
}

interface MaterialGenerationState {
  jobStatus: LogoStudioJobStatus | null;
  storefrontGenerating: boolean;
  posterGenerating: boolean;
  storefrontResult: string | null;
  posterResult: string | null;
  generateMaterial: (type: MaterialType) => Promise<void>;
  setJobStatus: (status: LogoStudioJobStatus | null) => void;
}

export function useMaterialGeneration({
  storeName,
  dishImage,
  storefrontTemplate,
  posterTemplate,
}: UseMaterialGenerationParams): MaterialGenerationState {
  const [jobStatus, setJobStatus] = useState<LogoStudioJobStatus | null>(null);
  const [storefrontGenerating, setStorefrontGenerating] = useState(false);
  const [posterGenerating, setPosterGenerating] = useState(false);
  const [storefrontResult, setStorefrontResult] = useState<string | null>(null);
  const [posterResult, setPosterResult] = useState<string | null>(null);

  const shouldStopRef = useRef(false);

  const validateInputs = useCallback(
    (type: MaterialType) => {
      if (!dishImage) {
        alert('请先上传菜品图片后再生成。');
        return false;
      }

      if (type === 'storefront' && !storefrontTemplate) {
        alert('请选择门头招牌的模板。');
        return false;
      }

      if (type === 'poster' && !posterTemplate) {
        alert('请选择促销海报的模板。');
        return false;
      }

      return true;
    },
    [dishImage, posterTemplate, storefrontTemplate]
  );

  const setGeneratingFlag = useCallback((type: MaterialType, value: boolean) => {
    if (type === 'storefront') {
      setStorefrontGenerating(value);
    } else {
      setPosterGenerating(value);
    }
  }, []);

  const applyResult = useCallback(
    (type: MaterialType, status: LogoStudioJobStatus) => {
      if (!status.result) {
        return;
      }

      if (type === 'storefront' && status.result.storefrontUrl) {
        setStorefrontResult(status.result.storefrontUrl);
      }

      if (type === 'poster' && status.result.posterUrl) {
        setPosterResult(status.result.posterUrl);
      }
    },
    []
  );

  const generateMaterial = useCallback(
    async (type: MaterialType) => {
      if (!validateInputs(type)) {
        return;
      }

      setJobStatus(null);
      setGeneratingFlag(type, true);
      shouldStopRef.current = false;

      try {
        const formData = new FormData();
        formData.append('generateType', type);
        formData.append('storeName', storeName || '占位门店');
        formData.append('templateStoreName', '占位门店');
        formData.append('dishImage', dishImage!);

        const template = type === 'storefront' ? storefrontTemplate! : posterTemplate!;
        const templateResponse = await fetch(template.url);
        const templateBlob = await templateResponse.blob();

        if (type === 'storefront') {
          formData.append('storefrontTemplate', templateBlob, `storefront-${template.id}.png`);
          formData.append('storefrontTemplateId', template.id);
        } else {
          formData.append('posterTemplate', templateBlob, `poster-${template.id}.png`);
          formData.append('posterTemplateId', template.id);
        }

        const response = await fetch('/api/logo-studio/generate', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('生成素材失败');
        }

        const data = await response.json();

        if (data.data) {
          const status: LogoStudioJobStatus = {
            id: 'sync',
            status: 'succeeded',
            progress: 100,
            result: data.data,
            error: undefined,
          };
          applyResult(type, status);
          setGeneratingFlag(type, false);
          return;
        }

        startJobPolling({
          jobId: data.jobId,
          shouldStop: () => shouldStopRef.current,
          onStop: () => {
            shouldStopRef.current = true;
            setGeneratingFlag(type, false);
          },
          onUpdate: (status) => setJobStatus(status),
          onSuccess: (status) => applyResult(type, status),
          onError: (message) => alert(`生成失败：${message}`),
        });
      } catch (error) {
        console.error('生成素材失败:', error);
        alert('生成素材失败，请稍后重试。');
        setGeneratingFlag(type, false);
      }
    },
    [
      applyResult,
      dishImage,
      posterTemplate,
      setGeneratingFlag,
      storeName,
      storefrontTemplate,
      validateInputs,
    ]
  );

  return {
    jobStatus,
    storefrontGenerating,
    posterGenerating,
    storefrontResult,
    posterResult,
    generateMaterial,
    setJobStatus,
  };
}
