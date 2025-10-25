import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Trash2, ImageIcon, RefreshCwIcon } from 'lucide-react';

interface BatchResult {
  sourceImageIndex: number;
  status: 'success' | 'failed';
  imageUrl?: string;
  sourceFileName?: string;
  width?: number;
  height?: number;
  error?: string;
}

interface ResultDisplayProps {
  isBatchMode: boolean;
  // 单图模式
  result: string | null;
  onDownloadSingle: () => void;
  // 批量模式
  batchResults: BatchResult[];
  historicalBatchResults: BatchResult[];
  onDownloadAll: () => void;
  onClearHistorical: () => void;
  onDownloadBatchImage: (imageUrl: string, filename: string, index: number) => void;
  // 重新生成功能
  onRegenerate?: (result: BatchResult, index: number) => void;
  regeneratingIndex?: number;
}

export default function ResultDisplay({
  isBatchMode,
  result,
  onDownloadSingle,
  batchResults,
  historicalBatchResults,
  onDownloadAll,
  onClearHistorical,
  onDownloadBatchImage,
  onRegenerate,
  regeneratingIndex = -1,
}: ResultDisplayProps) {
  // 单图模式
  if (!isBatchMode && result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            融合结果
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <img
              src={result}
              alt="背景融合结果"
              className="mx-auto max-w-full h-auto rounded-lg shadow-md mb-4"
            />
            <button
              onClick={onDownloadSingle}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center justify-center mx-auto"
            >
              <Download className="h-5 w-5 mr-2" />
              下载图片
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 批量模式
  if (isBatchMode && (batchResults.length > 0 || historicalBatchResults.length > 0)) {
    const allResults = [...batchResults, ...historicalBatchResults];
    const successCount = allResults.filter((r) => r.status === 'success').length;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              批量融合结果 ({successCount} 张成功)
            </CardTitle>
            <div className="flex space-x-2">
              <button
                onClick={onDownloadAll}
                disabled={successCount === 0}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center text-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                下载全部
              </button>
              {historicalBatchResults.length > 0 && (
                <button
                  onClick={onClearHistorical}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center text-sm"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  清空历史
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allResults.map((item, index) => {
              if (item.status !== 'success') {
                return (
                  <div key={index} className="relative group">
                    <div className="aspect-[4/3] bg-red-50 rounded-lg border-2 border-red-300 flex items-center justify-center">
                      <div className="text-center px-4">
                        <p className="text-red-600 text-base font-medium">处理失败</p>
                        <p className="text-red-500 text-sm mt-2">源图片 {item.sourceImageIndex + 1}</p>
                        {item.error && (
                          <p className="text-red-400 text-xs mt-1">{item.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={index} className="relative group">
                  <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={`融合结果 ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300"
                      onError={(e) => {
                        console.error('图片加载失败:', item.imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('图片加载成功:', item.imageUrl);
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
                          <button
                            onClick={() => onRegenerate(item, index)}
                            className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded shadow-lg font-medium flex items-center"
                          >
                            <RefreshCwIcon className="h-4 w-4 mr-2" />
                            重新生成
                          </button>
                        )}

                        {/* 下载按钮 */}
                        <button
                          onClick={() => {
                            const filename = item.sourceFileName || `background-fusion-${index + 1}.jpg`;
                            onDownloadBatchImage(item.imageUrl!, filename, index);
                          }}
                          className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded shadow-lg font-medium flex items-center"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          下载图片
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 图片序号 */}
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-sm">
                    {index + 1}
                  </div>

                  {/* 图片尺寸信息 */}
                  {item.width && item.height && (
                    <div className="absolute bottom-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-sm">
                      {item.width}×{item.height}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

