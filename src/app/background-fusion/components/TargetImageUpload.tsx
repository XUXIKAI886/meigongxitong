import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Grid, Loader2 } from 'lucide-react';

interface Template {
  name: string;
  filename: string;
  url: string;
}

interface TargetImageUploadProps {
  isBatchMode: boolean;
  // 风格选择相关
  showTemplateSelector: boolean;
  currentPlatform: 'meituan' | 'eleme' | null;
  selectedTemplate: Template | null;
  meituanTemplates: Template[];
  elemeTemplates: Template[];
  loadingTemplates: boolean;
  onLoadMeituanTemplates: () => void;
  onLoadElemeTemplates: () => void;
  onSelectTemplate: (template: Template) => void;
  onClearTemplateSelection: () => void;
  onShowTemplateSelector: (show: boolean) => void;
  // 文件上传相关
  targetImage: File | null;
  targetImagePreview: string;
  batchTargetImage: File | null;
  batchTargetImagePreview: string;
  onFileUpload: (files: FileList | null, type: 'source' | 'target' | 'batchSource' | 'batchTarget') => void;
}

export default function TargetImageUpload({
  isBatchMode,
  showTemplateSelector,
  currentPlatform,
  selectedTemplate,
  meituanTemplates,
  elemeTemplates,
  loadingTemplates,
  onLoadMeituanTemplates,
  onLoadElemeTemplates,
  onSelectTemplate,
  onClearTemplateSelection,
  onShowTemplateSelector,
  targetImage,
  targetImagePreview,
  batchTargetImage,
  batchTargetImagePreview,
  onFileUpload,
}: TargetImageUploadProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          目标背景 (融合背景)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          上传目标背景图片或选择风格
        </p>

        {/* 平台选择按钮 */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => {
              onShowTemplateSelector(true);
              onLoadMeituanTemplates();
            }}
            className={`flex items-center px-2 py-2 rounded-md text-sm transition-colors justify-center ${
              showTemplateSelector && currentPlatform === 'meituan'
                ? 'bg-yellow-500 text-black font-medium border-2 border-yellow-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 200 200" fill="none">
              <rect width="200" height="200" rx="45" fill="#FFD100"/>
              <text x="100" y="135" fontSize="85" fontWeight="bold" textAnchor="middle" fill="#000">美团</text>
            </svg>
            美团风格
          </button>
          <button
            onClick={() => {
              onShowTemplateSelector(true);
              onLoadElemeTemplates();
            }}
            className={`flex items-center px-2 py-2 rounded-md text-sm transition-colors justify-center ${
              showTemplateSelector && currentPlatform === 'eleme'
                ? 'bg-blue-500 text-white font-medium border-2 border-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 200 200" fill="none">
              <rect width="200" height="200" rx="45" fill="#0091FF"/>
              <circle cx="100" cy="100" r="70" stroke="white" strokeWidth="12" fill="none"/>
              <path d="M 85 85 Q 100 70, 115 85" stroke="white" strokeWidth="10" fill="none" strokeLinecap="round"/>
              <circle cx="130" cy="95" r="5" fill="white"/>
            </svg>
            饿了么风格
          </button>
          <button
            onClick={() => onShowTemplateSelector(false)}
            className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
              !showTemplateSelector
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Upload className="w-4 h-4 mr-1" />
            上传图片
          </button>
        </div>

        {showTemplateSelector ? (
          // 风格选择器
          <div>
            {selectedTemplate ? (
              <div className="text-center">
                <img
                  src={selectedTemplate.url}
                  alt={`风格: ${selectedTemplate.name}`}
                  className="mx-auto max-h-32 rounded mb-2"
                />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">已选择风格: {selectedTemplate.name}</p>
                  <button
                    onClick={() => {
                      onClearTemplateSelection();
                      onShowTemplateSelector(true);
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
                    <p className="text-sm text-gray-600">加载风格中...</p>
                  </div>
                ) : (currentPlatform === 'eleme' ? elemeTemplates : meituanTemplates).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {(currentPlatform === 'eleme' ? elemeTemplates : meituanTemplates).map((template, index) => (
                      <div
                        key={index}
                        className="group relative cursor-pointer"
                        onClick={() => onSelectTemplate(template)}
                      >
                        <img
                          src={template.url}
                          alt={template.name}
                          className={`w-full object-cover rounded border group-hover:border-orange-400 transition-colors ${
                            currentPlatform === 'eleme' ? 'aspect-square' : 'aspect-[4/3]'
                          }`}
                          onError={(e) => {
                            console.error('Template image failed to load:', template.url);
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                          }}
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
                    <p className="text-sm text-gray-500">暂无可用风格</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          // 文件上传
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onFileUpload(e.target.files, isBatchMode ? 'batchTarget' : 'target')}
              className="hidden"
              id="target-upload"
            />
            <label
              htmlFor="target-upload"
              className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-orange-400 transition-colors"
            >
              {(isBatchMode ? batchTargetImagePreview : targetImagePreview) ? (
                <div>
                  <img
                    src={isBatchMode ? batchTargetImagePreview : targetImagePreview}
                    alt="目标图片预览"
                    className="mx-auto max-h-32 rounded mb-2"
                  />
                  <p className="text-sm text-gray-600">
                    {isBatchMode ? batchTargetImage?.name : targetImage?.name}
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">上传目标图片</p>
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
