import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XIcon, SparklesIcon } from 'lucide-react';
import { Template } from '../types';

interface TemplateSelectorProps {
  show: boolean;
  templates: Template[];
  selectedTemplate: Template | null;
  loadingTemplates: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
  onLoadTemplates: () => void;
}

export default function TemplateSelector({
  show,
  templates,
  selectedTemplate,
  loadingTemplates,
  onClose,
  onSelectTemplate,
  onLoadTemplates,
}: TemplateSelectorProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5" />
              选择食物模板
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[70vh]">
          {templates.length === 0 && !loadingTemplates ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">暂无模板，点击加载</p>
              <Button onClick={onLoadTemplates}>
                加载模板
              </Button>
            </div>
          ) : loadingTemplates ? (
            <div className="text-center py-8">
              <p className="text-gray-500">正在加载模板...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`cursor-pointer group relative rounded-lg overflow-hidden border-2 transition-all
                    ${selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => onSelectTemplate(template)}
                >
                  <div className="aspect-square bg-gray-100">
                    <img
                      src={template.url}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2 bg-white">
                    <p className="text-sm font-medium truncate">
                      {template.name}
                    </p>
                  </div>
                  {selectedTemplate?.id === template.id && (
                    <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                      <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                        ✓
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Button
              onClick={onClose}
              className="min-w-[120px]"
            >
              {selectedTemplate ? '确认选择' : '关闭'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}