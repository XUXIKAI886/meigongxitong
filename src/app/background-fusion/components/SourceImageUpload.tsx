import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadIcon, XIcon, RefreshCwIcon } from 'lucide-react';
import BatchCutoutButton from './BatchCutoutButton';
import SingleCutoutButton from './SingleCutoutButton';
import ApplyCutoutButton from './ApplyCutoutButton';

interface SourceImageUploadProps {
  isBatchMode: boolean;
  // 单张模式
  sourceImage: File | null;
  sourceImagePreview: string;
  onFileUpload: (files: FileList | null, type: 'source' | 'target' | 'batchSource' | 'batchTarget') => void;
  // 批量模式
  sourceImages: File[];
  sourceImagePreviews: string[];
  onRemoveBatchImage: (index: number) => void;
  // 批量抠图功能
  onStartBatchCutout?: () => void;
  isCutting?: boolean;
  cutoutProgress?: number;
  currentImageIndex?: number;
  // 抠图结果展示与应用
  cutoutResults?: (File | null)[];
  cutoutResultPreviews?: string[];
  onApplyCutout?: () => void;
  // 重新抠图
  onRecutImage?: (index: number) => void;
  recutingIndex?: number;
}

export default function SourceImageUpload({
  isBatchMode,
  sourceImage,
  sourceImagePreview,
  onFileUpload,
  sourceImages,
  sourceImagePreviews,
  onRemoveBatchImage,
  // 批量抠图props
  onStartBatchCutout,
  isCutting = false,
  cutoutProgress = 0,
  currentImageIndex = -1,
  // 抠图结果props
  cutoutResults = [],
  cutoutResultPreviews = [],
  onApplyCutout,
  // 重新抠图props
  onRecutImage,
  recutingIndex = -1,
}: SourceImageUploadProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadIcon className="w-5 h-5" />
          上传源图片
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isBatchMode ? (
          // 批量模式
          <div className="space-y-4">
            {/* 批量抠图按钮 - 位于上传区域上方 */}
            {sourceImages.length > 0 && onStartBatchCutout && (
              <div className="pb-2 border-b border-gray-200">
                <BatchCutoutButton
                  sourceImagesCount={sourceImages.length}
                  isCutting={isCutting}
                  cutoutProgress={cutoutProgress}
                  currentImageIndex={currentImageIndex}
                  onStartCutout={onStartBatchCutout}
                />
              </div>
            )}

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => onFileUpload(e.target.files, 'batchSource')}
              className="hidden"
              id="batch-source-upload"
            />
            <label
              htmlFor="batch-source-upload"
              className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-orange-400 transition-colors"
            >
              <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium">上传源图片</p>
              <p className="text-sm text-gray-500 mt-1">点击选择图片</p>
              <p className="text-xs text-gray-400 mt-2">支持 JPEG、PNG、WebP，最大 10MB，最多10张</p>
            </label>

            {sourceImages.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  已选择 {sourceImages.length} 张图片：
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {sourceImagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      {/* 1:1正方形容器 */}
                      <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-50">
                        <img
                          src={preview}
                          alt={`源图片 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => onRemoveBatchImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                        {/* 图片序号 */}
                        <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 truncate">
                        {sourceImages[index].name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 抠图结果预览区域 */}
            {cutoutResultPreviews.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h4 className="font-medium mb-3 text-green-600">
                  抠图结果预览 ({cutoutResultPreviews.filter(p => p).length}张)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {cutoutResultPreviews.map((preview, index) => (
                    preview && (
                      <div key={index} className="relative group">
                        {/* 棋盘格背景容器 - 用于显示透明图片 */}
                        <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-500 bg-white">
                          {/* 棋盘格背景 */}
                          <div
                            className="w-full h-full"
                            style={{
                              backgroundImage: `
                                linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                                linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                                linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                                linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
                              `,
                              backgroundSize: '20px 20px',
                              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                            }}
                          >
                            <img
                              src={preview}
                              alt={`抠图结果 ${index + 1}`}
                              className="w-full h-full object-contain"
                            />
                          </div>

                          {/* 重新抠图中的加载遮罩层 */}
                          {recutingIndex === index && (
                            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center">
                              <RefreshCwIcon className="w-12 h-12 text-green-600 animate-spin mb-2" />
                              <p className="text-sm font-medium text-gray-700">重新抠图中...</p>
                            </div>
                          )}

                          {/* 鼠标悬停遮罩层：仅在非抠图状态时显示 */}
                          {recutingIndex !== index && (
                            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                              {/* 重新抠图按钮 */}
                              {onRecutImage && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => onRecutImage(index)}
                                  className="pointer-events-auto bg-white hover:bg-gray-100 text-gray-800"
                                >
                                  <RefreshCwIcon className="w-4 h-4 mr-1" />
                                  重新抠图
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    )
                  ))}
                </div>

                {/* 一键应用按钮 */}
                {onApplyCutout && (
                  <ApplyCutoutButton
                    cutoutResultsCount={cutoutResults.filter(r => r !== null).length}
                    onApply={onApplyCutout}
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          // 单张模式
          <div className="space-y-4">
            {/* 单张抠图按钮 - 位于上传区域上方 */}
            {sourceImage && onStartBatchCutout && (
              <div className="pb-2 border-b border-gray-200">
                <SingleCutoutButton
                  hasSourceImage={!!sourceImage}
                  isCutting={isCutting}
                  cutoutProgress={cutoutProgress}
                  onStartCutout={onStartBatchCutout}
                />
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={(e) => onFileUpload(e.target.files, 'source')}
              className="hidden"
              id="source-upload"
            />
            {sourceImagePreview ? (
              <div className="space-y-4">
                {/* 1:1正方形预览容器 */}
                <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-50">
                  <img
                    src={sourceImagePreview}
                    alt="源图片预览"
                    className="w-full h-full object-cover"
                  />
                  {/* 图片序号 */}
                  <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    1
                  </div>
                </div>
                <p className="text-sm text-gray-600 text-center">{sourceImage?.name}</p>

                {/* 重新选择按钮 */}
                <label
                  htmlFor="source-upload"
                  className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-orange-400 transition-colors"
                >
                  <UploadIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">点击重新选择图片</p>
                </label>
              </div>
            ) : (
              <label
                htmlFor="source-upload"
                className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-orange-400 transition-colors"
              >
                <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium">上传源图片</p>
                <p className="text-sm text-gray-500 mt-1">点击选择图片</p>
                <p className="text-xs text-gray-400 mt-2">支持 JPEG、PNG、WebP，最大 10MB</p>
              </label>
            )}

            {/* 抠图结果预览区域 */}
            {cutoutResultPreviews.length > 0 && cutoutResultPreviews[0] && (
              <div className="mt-6 border-t pt-4">
                <h4 className="font-medium mb-3 text-green-600">
                  抠图结果预览
                </h4>
                <div className="mb-4">
                  <div className="relative group">
                    {/* 棋盘格背景容器 - 用于显示透明图片 */}
                    <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-500 bg-white">
                      {/* 棋盘格背景 */}
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundImage: `
                            linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
                            linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
                            linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
                          `,
                          backgroundSize: '20px 20px',
                          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                        }}
                      >
                        <img
                          src={cutoutResultPreviews[0]}
                          alt="抠图结果预览"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* 重新抠图中的加载遮罩层 */}
                      {recutingIndex === 0 && (
                        <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center">
                          <RefreshCwIcon className="w-12 h-12 text-green-600 animate-spin mb-2" />
                          <p className="text-sm font-medium text-gray-700">重新抠图中...</p>
                        </div>
                      )}

                      {/* 鼠标悬停遮罩层：仅在非抠图状态时显示 */}
                      {recutingIndex !== 0 && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                          {/* 重新抠图按钮 */}
                          {onRecutImage && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => onRecutImage(0)}
                              className="pointer-events-auto bg-white hover:bg-gray-100 text-gray-800"
                            >
                              <RefreshCwIcon className="w-4 h-4 mr-1" />
                              重新抠图
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 一键应用按钮 */}
                {onApplyCutout && cutoutResults.length > 0 && cutoutResults[0] && (
                  <ApplyCutoutButton
                    cutoutResultsCount={1}
                    onApply={onApplyCutout}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
