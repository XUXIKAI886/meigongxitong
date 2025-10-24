'use client';

import { useCallback } from 'react';
import type { LogoTemplate } from '../types';
import { useMaterialGeneration } from './useMaterialGeneration';
import { useAvatarGeneration } from './useAvatarGeneration';

interface UseLogoStudioGenerationParams {
  storeName: string;
  templateStoreName: string;
  dishImage: File | null;
  avatarTemplate: LogoTemplate | null;
  storefrontTemplate: LogoTemplate | null;
  posterTemplate: LogoTemplate | null;
}

export function useLogoStudioGeneration(params: UseLogoStudioGenerationParams) {
  const material = useMaterialGeneration({
    storeName: params.storeName,
    dishImage: params.dishImage,
    storefrontTemplate: params.storefrontTemplate,
    posterTemplate: params.posterTemplate,
  });

  const avatar = useAvatarGeneration({
    storeName: params.storeName,
    templateStoreName: params.templateStoreName,
    dishImage: params.dishImage,
    avatarTemplate: params.avatarTemplate,
  });

  const downloadImage = useCallback(async (url: string, filename: string) => {
    try {
      const { downloadRemoteImage } = await import('@/lib/image-download');
      await downloadRemoteImage(url, filename);
    } catch (error) {
      console.error('下载图片失败:', error);
      alert('下载图片失败，请稍后再试。');
    }
  }, []);

  const downloadElemeSet = useCallback(async () => {
    if (!material.storefrontResult || !material.posterResult || !avatar.avatarResult) {
      alert('请先生成招牌、海报和头像后再导出套餐。');
      return;
    }

    try {
      const { downloadResizedImage } = await import('@/lib/image-download');
      await Promise.all([
        downloadResizedImage(
          avatar.avatarResult,
          800,
          800,
          `饿了么-${params.storeName || '品牌'}-头像-800x800.png`
        ),
        downloadResizedImage(
          material.storefrontResult,
          750,
          423,
          `饿了么-${params.storeName || '品牌'}-门头-750x423.png`
        ),
        downloadResizedImage(
          material.posterResult,
          2048,
          600,
          `饿了么-${params.storeName || '品牌'}-海报-2048x600.png`
        ),
      ]);
    } catch (error) {
      console.error('导出饿了么套餐失败:', error);
      alert('导出饿了么套餐失败，请稍后再试。');
    }
  }, [avatar.avatarResult, material.posterResult, material.storefrontResult, params.storeName]);

  const downloadAllAssets = useCallback(async () => {
    if (!material.storefrontResult || !material.posterResult || !avatar.avatarResult) {
      alert('请先生成全部素材后再批量下载。');
      return;
    }

    try {
      const { downloadRemoteImagesBatch } = await import('@/lib/image-download');
      const { success, failed } = await downloadRemoteImagesBatch([
        { url: material.storefrontResult, filename: `${params.storeName}-门店招牌.png` },
        { url: material.posterResult, filename: `${params.storeName}-促销海报.png` },
        { url: avatar.avatarResult, filename: `${params.storeName}-品牌头像.png` },
      ]);

      if (failed > 0) {
        alert(`已有 ${failed} 个文件下载失败，可稍后重试。`);
      } else if (success > 0) {
        alert('素材下载完成，欢迎继续优化设计。');
      }
    } catch (error) {
      console.error('批量下载素材失败:', error);
      alert('批量下载素材失败，请检查网络后再试。');
    }
  }, [avatar.avatarResult, material.posterResult, material.storefrontResult, params.storeName]);

  return {
    jobStatus: material.jobStatus,
    storefrontGenerating: material.storefrontGenerating,
    posterGenerating: material.posterGenerating,
    avatarStep1Generating: avatar.avatarStep1Generating,
    avatarStep2Generating: avatar.avatarStep2Generating,
    avatarStep1Result: avatar.avatarStep1Result,
    avatarResult: avatar.avatarResult,
    storefrontResult: material.storefrontResult,
    posterResult: material.posterResult,
    generateSingle: material.generateMaterial,
    generateAvatarStep1: avatar.generateAvatarStep1,
    generateAvatarStep2: avatar.generateAvatarStep2,
    downloadImage,
    downloadElemeSet,
    downloadAllAssets,
  };
}
