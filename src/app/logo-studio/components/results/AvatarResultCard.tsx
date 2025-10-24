'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AvatarResultCardProps {
  storeName: string;
  step1Result: string | null;
  finalResult: string | null;
  onDownloadStep1: () => void;
  onDownloadFinal: () => void;
  onDownloadEleme: () => Promise<void>;
}

export function AvatarResultCard({
  storeName,
  step1Result,
  finalResult,
  onDownloadStep1,
  onDownloadFinal,
  onDownloadEleme,
}: AvatarResultCardProps) {
  const handleElemeDownload = useCallback(async () => {
    try {
      await onDownloadEleme();
    } catch (error) {
      console.error('饿了么头像下载失败:', error);
      alert('饿了么头像下载失败，请稍后重试。');
    }
  }, [onDownloadEleme]);

  return (
    <div className="space-y-4">
      {step1Result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-purple-400 min-w-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center text-base">
                  👤 头像设计 - 步骤1结果
                  <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">食物替换完成</span>
                </CardTitle>
                <p className="text-xs text-gray-600 mt-1">步骤1：已完成菜品与模板的融合</p>
              </div>
              <Button variant="outline" size="sm" onClick={onDownloadStep1}>
                下载
              </Button>
            </CardHeader>
            <CardContent>
              <img
                src={step1Result}
                alt="步骤1：食物替换结果"
                className="w-full h-auto rounded-lg border"
                style={{ maxWidth: '400px', margin: '0 auto', display: 'block' }}
              />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center text-purple-800">📋 步骤1完成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start">
                <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                <div className="text-sm">已将菜品图与模板风格融合，保留原有店名与文案。</div>
              </div>
              <div className="flex items-start">
                <span className="text-purple-600 mr-2 mt-0.5">→</span>
                <div className="text-sm">下一步：点击“步骤2”按钮，替换为真实店名。</div>
              </div>
              <div className="bg-purple-100 bg-opacity-60 p-3 rounded-lg mt-3">
                <p className="text-xs text-purple-800 font-medium leading-relaxed">
                  💡 建议确认菜品细节无误后，再执行第二步店名替换。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {finalResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-l-4 border-l-purple-600 min-w-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center text-base">
                  👤 头像设计 - 最终成品
                  <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">800×800</span>
                </CardTitle>
                <p className="text-xs text-gray-600 mt-1">适用于形成品牌标识</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onDownloadFinal}>
                  <svg className="w-4 h-4 mr-1.5" viewBox="0 0 200 200" fill="none">
                    <rect width="200" height="200" rx="45" fill="#FFD100"/>
                    <text x="100" y="135" fontSize="85" fontWeight="bold" textAnchor="middle" fill="#000">美团</text>
                  </svg>
                  美团版
                </Button>
                <Button variant="outline" size="sm" onClick={handleElemeDownload}>
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
                src={finalResult}
                alt="头像设计最终成品"
                className="w-full h-auto rounded-lg border"
                style={{ maxWidth: '400px', margin: '0 auto', display: 'block' }}
              />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center text-purple-800">⭐ 头像设计核心价值</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start">
                <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                <div className="text-sm">
                  <span className="font-medium">入店率提升：</span>
                  专业头像让店铺更醒目，提高25-35%点击进店率。
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                <div className="text-sm">
                  <span className="font-medium">品牌识别度：</span>
                  独特头像形成品牌标识，增强70%品牌记忆度。
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                <div className="text-sm">
                  <span className="font-medium">新客获取：</span>
                  吸引新客尝试，首单转化率平均提升20%以上。
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                <div className="text-sm">
                  <span className="font-medium">平台曝光：</span>
                  优质头像有助于提升搜索排序，获取更多曝光。
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                <div className="text-sm">
                  <span className="font-medium">用户信任：</span>
                  专业设计传递品质保证，降低顾客犹豫。
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                <div className="text-sm">
                  <span className="font-medium">长期效应：</span>
                  持续积累品牌资产，打造差异化竞争力。
                </div>
              </div>
              <div className="bg-purple-100 bg-opacity-60 p-3 rounded-lg mt-3">
                <p className="text-xs text-purple-800 font-medium leading-relaxed">
                  💡 <span className="font-bold">专业建议：</span>
                  建议结合节日与营销活动定期更新头像，并同步至门店招牌、外卖平台和社交媒体，形成统一的品牌视觉形象。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
