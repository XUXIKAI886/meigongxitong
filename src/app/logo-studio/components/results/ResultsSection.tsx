'use client';

import { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { JobProgressCard } from './JobProgressCard';
import { StorefrontResultCard } from './StorefrontResultCard';
import { PosterResultCard } from './PosterResultCard';
import { AvatarResultCard } from './AvatarResultCard';
import type { LogoStudioJobStatus } from '../../types';

interface ResultsSectionProps {
  jobStatus: LogoStudioJobStatus | null;
  storeName: string;
  storefrontResult: string | null;
  posterResult: string | null;
  avatarResult: string | null;
  avatarStep1Result: string | null;
  onDownloadAll: () => void;
  onDownloadElemeSet: () => void;
  onDownloadImage: (url: string, filename: string) => void;
}

export function ResultsSection({
  jobStatus,
  storeName,
  storefrontResult,
  posterResult,
  avatarResult,
  avatarStep1Result,
  onDownloadAll,
  onDownloadElemeSet,
  onDownloadImage,
}: ResultsSectionProps) {
  const hasAnyResult = Boolean(storefrontResult || posterResult || avatarResult || avatarStep1Result);
  if (!hasAnyResult) {
    return null;
  }

  const downloadStorefrontEleme = useCallback(async () => {
    if (!storefrontResult) return;
    const { downloadResizedImage } = await import('@/lib/image-download');
    await downloadResizedImage(
      storefrontResult,
      750,
      423,
      `饿了么-${storeName || '店铺'}-店招-750x423.png`
    );
  }, [storeName, storefrontResult]);

  const downloadPosterEleme = useCallback(async () => {
    if (!posterResult) return;
    const { downloadResizedImage } = await import('@/lib/image-download');
    await downloadResizedImage(
      posterResult,
      2048,
      600,
      `饿了么-${storeName || '店铺'}-海报-2048x600.png`
    );
  }, [posterResult, storeName]);

  const downloadAvatarEleme = useCallback(async () => {
    if (!avatarResult) return;
    const { downloadResizedImage } = await import('@/lib/image-download');
    await downloadResizedImage(
      avatarResult,
      800,
      800,
      `饿了么-${storeName || '店铺'}-头像-800x800.png`
    );
  }, [avatarResult, storeName]);

  const handleStorefrontOriginal = useCallback(() => {
    if (storefrontResult) {
      onDownloadImage(storefrontResult, `${storeName || '店铺'}-店招设计.png`);
    }
  }, [onDownloadImage, storefrontResult, storeName]);

  const handlePosterOriginal = useCallback(() => {
    if (posterResult) {
      onDownloadImage(posterResult, `${storeName || '店铺'}-海报设计.png`);
    }
  }, [onDownloadImage, posterResult, storeName]);

  const handleAvatarOriginal = useCallback(() => {
    if (avatarResult) {
      onDownloadImage(avatarResult, `${storeName || '店铺'}-头像设计.png`);
    }
  }, [avatarResult, onDownloadImage, storeName]);

  const handleAvatarStep1Download = useCallback(() => {
    if (avatarStep1Result) {
      onDownloadImage(avatarStep1Result, `${storeName || '头像'}-步骤1-食物替换.png`);
    }
  }, [avatarStep1Result, onDownloadImage, storeName]);

  return (
    <div className="space-y-4">
      {jobStatus && <JobProgressCard jobStatus={jobStatus} />}

      {storefrontResult && posterResult && avatarResult && (
        <Card>
          <CardContent className="flex justify-center gap-4 py-4">
            <Button
              size="lg"
              onClick={onDownloadAll}
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white shadow-lg font-semibold transition-all hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 200 200" fill="none">
                <rect width="200" height="200" rx="45" fill="white" opacity="0.95"/>
                <text x="100" y="135" fontSize="85" fontWeight="bold" textAnchor="middle" fill="#FFD100">美团</text>
              </svg>
              美团三件套下载
            </Button>
            <Button
              size="lg"
              onClick={onDownloadElemeSet}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white shadow-lg font-semibold transition-all hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 200 200" fill="none">
                <rect width="200" height="200" rx="45" fill="white" opacity="0.95"/>
                <circle cx="100" cy="100" r="70" stroke="#0091FF" strokeWidth="12" fill="none"/>
                <path d="M 85 85 Q 100 70, 115 85" stroke="#0091FF" strokeWidth="10" fill="none" strokeLinecap="round"/>
                <circle cx="130" cy="95" r="5" fill="#0091FF"/>
              </svg>
              饿了么三件套下载
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">🎉 店铺店招海报和头像设计方案已完成</h3>
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg mb-4 border border-amber-200">
          <p className="text-sm font-medium text-gray-800 mb-2">
            尊敬的 <span className="text-orange-600 font-semibold">{storeName}</span> 老板您好：
          </p>
          <p className="text-xs text-gray-700 leading-relaxed mb-2">
            您的专属品牌视觉设计方案已经完成。这套设计方案基于<span className="font-semibold">AI大数据分析</span>和<span className="font-semibold">商圈竞品研究</span>，
            已在<span className="text-orange-600 font-semibold">超过1000家</span>同类店铺验证，平均提升<span className="text-orange-600 font-semibold">35%点击率</span>和
            <span className="text-orange-600 font-semibold">28%转化率</span>。
          </p>
          <p className="text-xs text-gray-700 leading-relaxed">
            我们采用行业领先的<span className="font-semibold">视觉营销策略</span>，确保您的店铺在商圈中<span className="font-semibold">脱颖而出</span>，
            建立<span className="font-semibold">专业品牌形象</span>，有效提升<span className="text-orange-600 font-semibold">曝光度、入店率和下单转化</span>。
          </p>
          <div className="mt-3 pt-3 border-t border-amber-200">
            <p className="text-xs font-semibold text-orange-700">
              ⭐ 核心优势：商圈最优视觉方案 | 数据驱动设计 | 专业团队定制 | 即刻上线见效
            </p>
          </div>
        </div>
      </div>

      {storefrontResult && (
        <StorefrontResultCard
          imageUrl={storefrontResult}
          storeName={storeName}
          onDownloadOriginal={handleStorefrontOriginal}
          onDownloadEleme={downloadStorefrontEleme}
        />
      )}

      {posterResult && (
        <PosterResultCard
          imageUrl={posterResult}
          storeName={storeName}
          onDownloadOriginal={handlePosterOriginal}
          onDownloadEleme={downloadPosterEleme}
        />
      )}

      {(avatarStep1Result || avatarResult) && (
        <AvatarResultCard
          storeName={storeName}
          step1Result={avatarStep1Result}
          finalResult={avatarResult}
          onDownloadStep1={handleAvatarStep1Download}
          onDownloadFinal={handleAvatarOriginal}
          onDownloadEleme={downloadAvatarEleme}
        />
      )}
    </div>
  );
}
