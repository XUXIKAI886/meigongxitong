'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PosterResultCardProps {
  imageUrl: string;
  storeName: string;
  onDownloadOriginal: () => void;
  onDownloadEleme: () => Promise<void>;
}

export function PosterResultCard({ imageUrl, storeName, onDownloadOriginal, onDownloadEleme }: PosterResultCardProps) {
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
      <Card className="border-l-4 border-l-blue-500 min-w-[400px]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center text-base">
              📢 海报设计
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">1440×480</span>
            </CardTitle>
            <p className="text-xs text-gray-600 mt-1">适合广告宣传和品牌推广</p>
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
            alt="海报设计"
            className="w-full h-auto rounded-lg border"
            style={{ maxWidth: '720px', margin: '0 auto', display: 'block' }}
          />
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-sky-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center text-blue-800">📈 海报设计营销价值</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start">
            <span className="text-blue-600 mr-2 mt-0.5">✓</span>
            <div className="text-sm">
              <span className="font-medium">营销传播力：</span>
              醒目视觉设计提高3倍社交分享率，扩大品牌影响范围
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-blue-600 mr-2 mt-0.5">✓</span>
            <div className="text-sm">
              <span className="font-medium">活动转化率：</span>
              专业海报让促销活动参与度提升40%，直接拉动销售
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-blue-600 mr-2 mt-0.5">✓</span>
            <div className="text-sm">
              <span className="font-medium">品牌记忆度：</span>
              统一视觉样式加深品牌印象，提高60%复购意向
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-blue-600 mr-2 mt-0.5">✓</span>
            <div className="text-sm">
              <span className="font-medium">促销助推：</span>
              特色海报吸引眼球，新品推广成功率提升50%
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-blue-600 mr-2 mt-0.5">✓</span>
            <div className="text-sm">
              <span className="font-medium">平台权重：</span>
              优质视觉内容获得平台更多曝光机会，流量倾斜
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-blue-600 mr-2 mt-0.5">✓</span>
            <div className="text-sm">
              <span className="font-medium">竞品差异：</span>
              与同类店铺形成明显对比，占领用户心智
            </div>
          </div>
          <div className="bg-blue-100 bg-opacity-60 p-3 rounded-lg mt-3">
            <p className="text-xs text-blue-800 font-medium leading-relaxed">
              💡 <span className="font-bold">专业建议：</span>
              海报是最有效的营销工具之一。优质海报设计能让营销投入产生2-3倍回报效果，特别是在节日大促期间，优秀海报能显著提升店铺业绩。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
