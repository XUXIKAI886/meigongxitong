'use client';

import { Card, CardContent } from '@/components/ui/card';

export type UploadMode = 'manual' | 'ai';

interface DishUploadModeSelectorProps {
  mode: UploadMode;
  onChange: (mode: UploadMode) => void;
}

/**
 * DishUploadModeSelector
 * 菜品图上传方式选择组件
 *
 * 提供两种模式：
 * - 手动上传图片
 * - AI智能生成
 */
export function DishUploadModeSelector({ mode, onChange }: DishUploadModeSelectorProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="mb-4 text-sm font-medium text-gray-700">请选择菜品图上传方式：</p>
        <div className="space-y-3">
          {/* 手动上传选项 */}
          <button
            type="button"
            onClick={() => onChange('manual')}
            className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
              mode === 'manual'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <div className={`mr-3 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                mode === 'manual' ? 'border-blue-500' : 'border-gray-300'
              }`}>
                {mode === 'manual' && (
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">📤 手动上传图片</p>
                <p className="text-xs text-gray-500">
                  选择本地菜品图片上传（推荐有现成图片的商家）
                </p>
              </div>
            </div>
          </button>

          {/* AI生成选项 */}
          <button
            type="button"
            onClick={() => onChange('ai')}
            className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
              mode === 'ai'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center">
              <div className={`mr-3 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                mode === 'ai' ? 'border-purple-500' : 'border-gray-300'
              }`}>
                {mode === 'ai' && (
                  <div className="h-3 w-3 rounded-full bg-purple-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">✨ AI智能生成</p>
                <p className="text-xs text-gray-500">
                  通过AI描述生成专业菜品图（适合没有图片或想要全新设计的商家）
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* 提示信息 */}
        {mode === 'ai' && (
          <div className="mt-4 rounded-md bg-purple-50 p-3 text-xs text-purple-700">
            💡 提示：AI生成模式可以根据简单的菜品描述自动生成高质量菜品图，支持上传参考图优化效果。
          </div>
        )}
      </CardContent>
    </Card>
  );
}
