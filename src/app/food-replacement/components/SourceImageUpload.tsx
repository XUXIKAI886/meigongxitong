import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadIcon, XIcon } from 'lucide-react';
import { DropzoneRootProps, DropzoneInputProps } from 'react-dropzone';

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
        <CardContent>
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
      <CardContent>
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
      </CardContent>
    </Card>
  );
}