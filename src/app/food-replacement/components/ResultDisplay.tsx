import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DownloadIcon, TrashIcon, PackageIcon } from 'lucide-react';
import { FoodReplacementResult } from '../types';

interface ResultDisplayProps {
  results: FoodReplacementResult[];
  onClearHistory: () => void;
}

export default function ResultDisplay({ results, onClearHistory }: ResultDisplayProps) {
  if (results.length === 0) return null;

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      // 动态导入下载工具函数 - 兼容 Web 和 Tauri 环境
      const { downloadRemoteImage } = await import('@/lib/image-download');
      await downloadRemoteImage(imageUrl, filename);
    } catch (error) {
      console.error('下载图片失败:', error);
    }
  };

  // 批量下载所有图片
  const downloadAllImages = async () => {
    if (results.length === 0) return;

    console.log('批量下载 - 所有结果:', results);

    try {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        console.log(`批量下载 - 第${i+1}张图片:`, result);
        console.log(`批量下载 - 原始文件名:`, result.sourceFileName);

        // 使用原始文件名或生成默认名称
        let filename = `food-replacement-batch-${i + 1}-${Date.now()}.png`;
        if (result.sourceFileName) {
          // 使用完全相同的原始文件名
          filename = result.sourceFileName;
          console.log(`批量下载 - 使用原始文件名:`, filename);
        } else {
          console.log(`批量下载 - 使用默认文件名:`, filename);
        }

        await downloadImage(result.imageUrl, filename);

        // 添加小延迟避免浏览器限制并发下载
        if (i < results.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      console.error('批量下载失败:', error);
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
                variant="default"
                size="sm"
                onClick={downloadAllImages}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <PackageIcon className="w-4 h-4" />
                批量下载
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onClearHistory}
              className="flex items-center gap-2"
            >
              <TrashIcon className="w-4 h-4" />
              清除历史
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((result, index) => (
            <div key={result.id || `result-${index}`} className="group relative">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
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

              {/* 悬停时显示下载按钮 */}
              <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-10 transition-all duration-300 rounded-lg flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // 使用原始文件名或生成默认名称
                    let filename = `food-replacement-${index + 1}-${Date.now()}.png`;
                    console.log('单张下载 - 结果对象:', result);
                    console.log('单张下载 - 原始文件名:', result.sourceFileName);

                    if (result.sourceFileName) {
                      // 使用完全相同的原始文件名
                      filename = result.sourceFileName;
                      console.log('单张下载 - 使用原始文件名:', filename);
                    } else {
                      console.log('单张下载 - 使用默认文件名:', filename);
                    }
                    downloadImage(result.imageUrl, filename);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white hover:bg-gray-100 text-gray-800 shadow-lg"
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  下载
                </Button>
              </div>

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
            提示: 悬停在图片上可以下载高清版本
          </p>
        </div>
      </CardContent>
    </Card>
  );
}