import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Trash2, ImageIcon } from 'lucide-react';

interface BatchResult {
  sourceImageIndex: number;
  status: 'success' | 'failed';
  imageUrl?: string;
  sourceFileName?: string;
  error?: string;
}

interface ResultDisplayProps {
  isBatchMode: boolean;
  // 单张模式
  result: string | null;
  onDownloadSingle: () => void;
  // 批量模式
  batchResults: BatchResult[];
  historicalBatchResults: BatchResult[];
  onDownloadAll: () => void;
  onClearHistorical: () => void;
  onDownloadBatchImage: (imageUrl: string, filename: string, index: number) => void;
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
}: ResultDisplayProps) {
  // 单张模式
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
    const successCount = allResults.filter(r => r.status === 'success').length;

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
                  清除历史
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allResults.map((result, index) => (
              <div key={index} className="relative">
                {result.status === 'success' ? (
                  <div className="relative group">
                    <img
                      src={result.imageUrl}
                      alt={`融合结果 ${index + 1}`}
                      className="w-full h-32 object-cover rounded border group-hover:border-orange-400 transition-colors"
                    />
                    <div className="absolute inset-0 rounded transition-all duration-200 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}>
                      <button
                        onClick={() => {
                          const filename = result.sourceFileName || `background-fusion-${index + 1}.jpg`;
                          onDownloadBatchImage(result.imageUrl!, filename, index);
                        }}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        下载
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">源图片 {result.sourceImageIndex + 1}</p>
                  </div>
                ) : (
                  <div className="w-full h-32 bg-red-100 border border-red-300 rounded flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-red-600 text-sm font-medium">处理失败</p>
                      <p className="text-red-500 text-xs mt-1">源图片 {result.sourceImageIndex + 1}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
