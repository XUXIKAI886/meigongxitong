import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadIcon, XIcon, RefreshCwIcon } from 'lucide-react';
import { DropzoneRootProps, DropzoneInputProps } from 'react-dropzone';
import BatchCutoutButton from './BatchCutoutButton';
import SingleCutoutButton from './SingleCutoutButton';
import ApplyCutoutButton from './ApplyCutoutButton';

interface SourceImageUploadProps {
  isBatchMode: boolean;
  // 单张模式
  sourceImage?: File | null;
  sourceImagePreview?: string;
  sourceDropzone?: {
    getRootProps: () => DropzoneRootProps;
    getInputProps: () => DropzoneInputProps;
    isDragActive: boolean;
  };
  // 批量模式
  sourceImages?: File[];
  sourceImagePreviews?: string[];
  batchSourceDropzone?: {
    getRootProps: () => DropzoneRootProps;
    getInputProps: () => DropzoneInputProps;
    isDragActive: boolean;
  };
  onRemoveBatchImage?: (index: number) => void;
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
  sourceDropzone,
  sourceImages = [],
  sourceImagePreviews = [],
  batchSourceDropzone,
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
  if (isBatchMode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="w-5 h-5" />
            上传源图片 (批量模式)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* 上传区域 */}
          <div
            {...(batchSourceDropzone?.getRootProps() || {})}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${batchSourceDropzone?.isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <input {...(batchSourceDropzone?.getInputProps() || {})} />
            <UploadIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">
              {batchSourceDropzone?.isDragActive
                ? '松开以上传图片'
                : '拖拽图片到此处或点击上传 (最多10张)'}
            </p>
          </div>

          {sourceImages.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">已上传的源图片 ({sourceImages.length}张)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {sourceImagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={preview}
                        alt={`源图片 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onRemoveBatchImage?.(index)}
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      {index + 1}
                    </div>
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
                            onLoad={() => console.log(`✓ 抠图结果 ${index + 1} 加载成功`)}
                            onError={(e) => {
                              console.error(`✗ 抠图结果 ${index + 1} 加载失败:`, e);
                              console.error(`图片URL: ${preview}`);
                            }}
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
                                disabled={recutingIndex !== -1}
                                className={`pointer-events-auto ${
                                  recutingIndex !== -1
                                    ? 'bg-gray-400 cursor-not-allowed opacity-50'
                                    : 'bg-white hover:bg-gray-100 text-gray-800'
                                }`}
                                title={recutingIndex !== -1 ? '正在处理其他图片，请稍候...' : '重新抠图'}
                              >
                                <RefreshCwIcon className="w-4 h-4 mr-1" />
                                {recutingIndex !== -1 ? '请稍候...' : '重新抠图'}
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadIcon className="w-5 h-5" />
          上传源图片
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {/* 上传区域 */}
        <div
          {...(sourceDropzone?.getRootProps() || {})}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${sourceDropzone?.isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...(sourceDropzone?.getInputProps() || {})} />
          {sourceImagePreview ? (
            <div className="space-y-4">
              <img
                src={sourceImagePreview}
                alt="源图片预览"
                className="max-h-48 mx-auto rounded-lg"
              />
              <p className="text-sm text-gray-500">
                已上传: {sourceImage?.name}
              </p>
            </div>
          ) : (
            <>
              <UploadIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">
                {sourceDropzone?.isDragActive
                  ? '松开以上传图片'
                  : '拖拽图片到此处或点击上传'}
              </p>
            </>
          )}
        </div>

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
                      onLoad={() => console.log('✓ 抠图结果加载成功')}
                      onError={(e) => {
                        console.error('✗ 抠图结果加载失败:', e);
                        console.error(`图片URL: ${cutoutResultPreviews[0]}`);
                      }}
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
                          disabled={recutingIndex !== -1}
                          className={`pointer-events-auto ${
                            recutingIndex !== -1
                              ? 'bg-gray-400 cursor-not-allowed opacity-50'
                              : 'bg-white hover:bg-gray-100 text-gray-800'
                          }`}
                          title={recutingIndex !== -1 ? '正在处理中，请稍候...' : '重新抠图'}
                        >
                          <RefreshCwIcon className="w-4 h-4 mr-1" />
                          {recutingIndex !== -1 ? '请稍候...' : '重新抠图'}
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
      </CardContent>
    </Card>
  );
}