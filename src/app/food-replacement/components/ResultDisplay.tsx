import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCwIcon } from 'lucide-react';
import { FoodReplacementResult } from '../types';

interface ResultDisplayProps {
  results: FoodReplacementResult[];
  onRegenerate?: (result: FoodReplacementResult, index: number) => void;
  regeneratingIndex?: number;
}

export default function ResultDisplay({
  results,
  onRegenerate,
  regeneratingIndex = -1,
}: ResultDisplayProps) {
  if (results.length === 0) return null;

  // 下载图片 - 原始尺寸
  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const { downloadRemoteImage } = await import('@/lib/image-download');
      await downloadRemoteImage(imageUrl, filename);
    } catch (error) {
      console.error('下载图片失败:', error);
    }
  };

  // 批量下载所有图片 - Tauri环境只弹一次对话框
  const downloadAllImages = async () => {
    if (results.length === 0) return;

    console.log('批量下载 - 所有结果:', results);

    try {
      const { downloadRemoteImagesBatch } = await import('@/lib/image-download');

      // 准备批量下载的图片列表
      const images = results.map((result, index) => ({
        url: result.imageUrl,
        filename: result.sourceFileName || `food-replacement-batch-${index + 1}-${Date.now()}.png`
      }));

      // 调用批量下载函数（Tauri环境只弹一次文件夹选择框）
      const { success, failed } = await downloadRemoteImagesBatch(images);

      console.log(`批量下载完成: 成功 ${success}/${images.length}, 失败 ${failed}`);
    } catch (error) {
      console.error('批量下载失败:', error);
      alert('批量下载失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            生成结果 ({results.length}张)
          </CardTitle>
          <div className="flex items-center gap-2">
            {results.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAllImages}
              >
                批量下载
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.map((result, index) => (
            <div key={result.id || `result-${index}`} className="group relative">
              <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={result.imageUrl}
                  alt={`生成结果 ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300"
                  onError={(e) => {
                    console.error('图片加载失败:', result.imageUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('图片加载成功:', result.imageUrl);
                  }}
                />
              </div>

              {/* 重新生成中的加载遮罩层 */}
              {regeneratingIndex === index && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center rounded-lg">
                  <RefreshCwIcon className="w-12 h-12 text-blue-600 animate-spin mb-2" />
                  <p className="text-sm font-medium text-gray-700">重新生成中...</p>
                </div>
              )}

              {/* 悬停时显示按钮 - 重新生成和下载 - 仅在非生成状态时显示 */}
              {regeneratingIndex !== index && (
                <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-30 transition-all duration-300 rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-3">
                    {/* 重新生成按钮 */}
                    {onRegenerate && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white shadow-lg"
                        onClick={() => onRegenerate(result, index)}
                        disabled={regeneratingIndex !== -1}
                        title={regeneratingIndex !== -1 ? '正在处理其他图片，请稍候...' : '重新生成'}
                      >
                        <RefreshCwIcon className="w-4 h-4 mr-1" />
                        {regeneratingIndex !== -1 ? '请稍候...' : '重新生成'}
                      </Button>
                    )}

                    {/* 下载按钮 */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white shadow-lg"
                      onClick={() => {
                        let filename = `food-replacement-${index + 1}-${Date.now()}.png`;
                        if (result.sourceFileName) {
                          filename = result.sourceFileName;
                        }
                        downloadImage(result.imageUrl, filename);
                      }}
                    >
                      下载图片
                    </Button>
                  </div>
                </div>
              )}

              {/* 图片序号 */}
              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-sm">
                {index + 1}
              </div>

              {/* 图片尺寸信息 */}
              {result.width && result.height && (
                <div className="absolute bottom-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-sm">
                  {result.width}×{result.height}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-4">
            提示: 悬停在图片上可下载原图
          </p>
        </div>
      </CardContent>
    </Card>
  );
}