import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadIcon, XIcon } from 'lucide-react';

interface SourceImageUploadProps {
  isBatchMode: boolean;
  // 单张模式
  sourceImage: File | null;
  sourceImagePreview: string;
  onFileUpload: (files: FileList | null, type: string) => void;
  // 批量模式
  sourceImages: File[];
  sourceImagePreviews: string[];
  onRemoveBatchImage: (index: number) => void;
}

export default function SourceImageUpload({
  isBatchMode,
  sourceImage,
  sourceImagePreview,
  onFileUpload,
  sourceImages,
  sourceImagePreviews,
  onRemoveBatchImage,
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
          <div>
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
                <div className="grid grid-cols-2 gap-2">
                  {sourceImagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`源图片 ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        onClick={() => onRemoveBatchImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {sourceImages[index].name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 单张模式
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onFileUpload(e.target.files, 'source')}
              className="hidden"
              id="source-upload"
            />
            <label
              htmlFor="source-upload"
              className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-orange-400 transition-colors"
            >
              {sourceImagePreview ? (
                <div>
                  <img
                    src={sourceImagePreview}
                    alt="源图片预览"
                    className="mx-auto max-h-32 rounded mb-2"
                  />
                  <p className="text-sm text-gray-600">{sourceImage?.name}</p>
                </div>
              ) : (
                <div>
                  <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">上传源图片</p>
                  <p className="text-sm text-gray-500 mt-1">点击选择图片</p>
                  <p className="text-xs text-gray-400 mt-2">支持 JPEG、PNG、WebP，最大 10MB</p>
                </div>
              )}
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
