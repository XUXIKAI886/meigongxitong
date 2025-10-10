import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadIcon, SparklesIcon } from 'lucide-react';
import { DropzoneRootProps, DropzoneInputProps } from 'react-dropzone';
import { Template } from '../types';

interface TargetImageUploadProps {
  isBatchMode: boolean;
  // 单张模式
  targetImage?: File | null;
  targetImagePreview?: string;
  targetDropzone?: {
    getRootProps: () => DropzoneRootProps;
    getInputProps: () => DropzoneInputProps;
    isDragActive: boolean;
  };
  // 批量模式
  batchTargetImage?: File | null;
  batchTargetImagePreview?: string;
  batchTargetDropzone?: {
    getRootProps: () => DropzoneRootProps;
    getInputProps: () => DropzoneInputProps;
    isDragActive: boolean;
  };
  // 模板相关
  selectedTemplate?: Template | null;
  onShowTemplateSelector?: () => void;
}

export default function TargetImageUpload({
  isBatchMode,
  targetImage,
  targetImagePreview,
  targetDropzone,
  batchTargetImage,
  batchTargetImagePreview,
  batchTargetDropzone,
  selectedTemplate,
  onShowTemplateSelector,
}: TargetImageUploadProps) {
  const currentImage = isBatchMode ? batchTargetImage : targetImage;
  const currentPreview = isBatchMode ? batchTargetImagePreview : targetImagePreview;
  const currentDropzone = isBatchMode ? batchTargetDropzone : targetDropzone;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadIcon className="w-5 h-5" />
          选择目标食物
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 模板选择按钮 */}
        <Button
          variant="outline"
          onClick={onShowTemplateSelector}
          className="w-full flex items-center gap-2 h-12"
        >
          <SparklesIcon className="w-5 h-5" />
          {selectedTemplate ? `已选择: ${selectedTemplate.name}` : '选择预设模板'}
        </Button>

        <div className="text-center text-sm text-gray-500">或</div>

        {/* 上传区域 */}
        <div
          {...(currentDropzone?.getRootProps() || {})}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${currentDropzone?.isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...(currentDropzone?.getInputProps() || {})} />
          {currentPreview ? (
            <div className="space-y-4">
              <img
                src={currentPreview}
                alt={selectedTemplate ? '模板预览' : '目标图片预览'}
                className="max-h-48 mx-auto rounded-lg"
              />
              <p className="text-sm text-gray-500">
                {selectedTemplate
                  ? `模板: ${selectedTemplate.name}`
                  : `已上传: ${currentImage?.name}`
                }
              </p>
            </div>
          ) : (
            <>
              <UploadIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">
                {currentDropzone?.isDragActive
                  ? '松开以上传图片'
                  : '上传自定义目标食物图片'}
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}