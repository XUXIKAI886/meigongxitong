'use client';

import { Button } from '@/components/ui/button';
import { Palette, ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  onBack: () => void;
}

export function PageHeader({ onBack }: PageHeaderProps) {
  return (
    <div className="mb-8 text-center">
      <div className="mb-6 text-left">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回首页
        </Button>
      </div>
      <h1 className="mb-4 text-4xl font-bold text-gray-900">
        <Palette className="mr-3 inline-block h-10 w-10 text-blue-600" />
        Logo设计工作室
      </h1>
      <p className="text-xl text-gray-600">
        选择风格，上传菜品图，AI智能融合生成专业的店招、海报和头像设计
      </p>
    </div>
  );
}
