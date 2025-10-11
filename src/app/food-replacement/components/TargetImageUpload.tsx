import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadIcon, Grid, Loader2 } from 'lucide-react';
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
  showTemplateSelector: boolean;
  templates: Template[];
  loadingTemplates: boolean;
  onToggleTemplateSelector: (show: boolean) => void;
  onSelectTemplate: (template: Template) => void;
  onClearTemplate: () => void;
  onLoadTemplates: () => void;
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
  showTemplateSelector,
  templates,
  loadingTemplates,
  onToggleTemplateSelector,
  onSelectTemplate,
  onClearTemplate,
  onLoadTemplates,
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
        {/* 模式切换按钮 */}
        <div className="flex space-x-2">
          <button
            onClick={() => onToggleTemplateSelector(false)}
            className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors flex-1 justify-center ${
              !showTemplateSelector
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <UploadIcon className="w-4 h-4 mr-1" />
            上传图片
          </button>
          <button
            onClick={() => {
              onToggleTemplateSelector(true);
              if (templates.length === 0) {
                onLoadTemplates();
              }
            }}
            className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors flex-1 justify-center ${
              showTemplateSelector
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Grid className="w-4 h-4 mr-1" />
            选择模板
          </button>
        </div>

        {showTemplateSelector ? (
          // 模板选择器
          <div>
            {selectedTemplate ? (
              <div className="text-center">
                <img
                  src={selectedTemplate.url}
                  alt={`模板: ${selectedTemplate.name}`}
                  className="mx-auto max-h-32 rounded mb-2"
                />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">已选择模板: {selectedTemplate.name}</p>
                  <button
                    onClick={() => {
                      onClearTemplate();
                      onToggleTemplateSelector(true);
                    }}
                    className="flex items-center justify-center w-full px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    <Grid className="w-4 h-4 mr-1" />
                    重新选择
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {loadingTemplates ? (
                  <div className="text-center py-8">
                    <Loader2 className="mx-auto h-8 w-8 text-orange-500 animate-spin mb-2" />
                    <p className="text-sm text-gray-600">加载模板中...</p>
                  </div>
                ) : templates.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {templates.map((template, index) => (
                      <div
                        key={index}
                        className="group relative cursor-pointer"
                        onClick={() => onSelectTemplate(template)}
                      >
                        <img
                          src={template.url}
                          alt={template.name}
                          className="w-full h-24 object-cover rounded border group-hover:border-orange-400 transition-colors"
                        />
                        <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-30 rounded transition-all duration-200 flex items-center justify-center">
                          <button className="bg-orange-500 text-white px-3 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            选择
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 truncate">{template.name}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">暂无可用模板</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          // 文件上传区域
          <div
            {...(currentDropzone?.getRootProps() || {})}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${currentDropzone?.isDragActive ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <input {...(currentDropzone?.getInputProps() || {})} />
            {currentPreview && !selectedTemplate ? (
              <div className="space-y-4">
                <img
                  src={currentPreview}
                  alt="目标图片预览"
                  className="max-h-32 mx-auto rounded-lg"
                />
                <p className="text-sm text-gray-500">
                  已上传: {currentImage?.name}
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
                <p className="text-xs text-gray-400 mt-2">支持 JPEG、PNG、WebP，最大 10MB</p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}