'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface StorefrontResultCardProps {
  imageUrl: string;
  storeName: string;
  onDownloadOriginal: () => void;
  onDownloadEleme: () => Promise<void>;
}

export function StorefrontResultCard({ imageUrl, storeName, onDownloadOriginal, onDownloadEleme }: StorefrontResultCardProps) {
  const handleElemeDownload = useCallback(async () => {
    try {
      await onDownloadEleme();
    } catch (error) {
      console.error('饿了么版本下载失败:', error);
      alert('饿了么版本下载失败，请稍后重试。');
    }
  }, [onDownloadEleme]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-l-4 border-l-green-500 min-w-[400px]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center text-base">
              🏦 店招设计
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">1280×720</span>
            </CardTitle>
            <p className="text-xs text-gray-600 mt-1">适合外卖平台店铺展示</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-yellow-500 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-600 font-medium transition-all"
              onClick={onDownloadOriginal}
            >
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 200 200" fill="none">
                <rect width="200" height="200" rx="45" fill="#FFD100"/>
                <text x="100" y="135" fontSize="85" fontWeight="bold" textAnchor="middle" fill="#000">美团</text>
              </svg>
              美团版
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-blue-500 text-blue-700 hover:bg-blue-50 hover:border-blue-600 font-medium transition-all"
              onClick={handleElemeDownload}
            >
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 200 200" fill="none">
                <rect width="200" height="200" rx="45" fill="#0091FF"/>
                <circle cx="100" cy="100" r="70" stroke="white" strokeWidth="12" fill="none"/>
                <path d="M 85 85 Q 100 70, 115 85" stroke="white" strokeWidth="10" fill="none" strokeLinecap="round"/>
                <circle cx="130" cy="95" r="5" fill="white"/>
              </svg>
              饿了么版
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <img
            src={imageUrl}
            alt="店招设计"
            className="w-full h-auto rounded-lg border"
            style={{ maxWidth: '640px', margin: '0 auto', display: 'block' }}
          />
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center text-green-800">🎯 店招设计核心价值</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start">
            <span className="text-green-600 mr-2 mt-0.5">✓</span>
            <div className="text-sm">
              <span className="font-medium">入店提升：</span>
              专业门头设计让店铺在列表中更醒目，点击进店率提升25-35%
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-green-600 mr-2 mt-0.5">✓</span>
            <div className="text-sm">
              <span className="font-medium">品牌认知度：</span>
              统一门头风格形成品牌标识，品牌记忆度提升70%
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-green-600 mr-2 mt-0.5">✓</span>
            <div className="text-sm">
              <span className="font-medium">转化引导：</span>
              突出主打菜品与优惠信息，首单转化率提升20%以上
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-green-600 mr-2 mt-0.5">✓</span>
            <div className="text-sm">
              <span className="font-medium">品牌调性：</span>
              专业视觉设计提升店铺档次，在同商圈中脱颖而出
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-green-600 mr-2 mt-0.5">✓</span>
            <div className="text-sm">
              <span className="font-medium">信任背书：</span>
              精美店招展示专业实力，顾客更愿意下单
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-green-600 mr-2 mt-0.5">✓</span>
            <div className="text-sm">
              <span className="font-medium">数据支持：</span>
              基于1000+商家数据验证，转化率提升15-30%
            </div>
          </div>
          <div className="bg-green-100 bg-opacity-60 p-3 rounded-lg mt-3">
            <p className="text-xs text-green-800 font-medium leading-relaxed">
              💡 <span className="font-bold">专业建议：</span>
              店招是顾客获取第一印象的关键入口。优质门头设计已成为头部商家标配，是在激烈竞争中脱颖而出的必要投入。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
