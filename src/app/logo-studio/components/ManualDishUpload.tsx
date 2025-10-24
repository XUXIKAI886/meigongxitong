'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileImage } from 'lucide-react';

interface ManualDishUploadProps {
  dishImagePreview: string;
  onDishImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * ManualDishUpload
 * 手动上传菜品图组件
 *
 * 功能：
 * - 点击上传本地菜品图片
 * - 显示上传后的预览
 * - 支持重新上传
 */
export function ManualDishUpload({
  dishImagePreview,
  onDishImageChange,
}: ManualDishUploadProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Upload className="mr-2 h-5 w-5" />
          菜品参考图
        </CardTitle>
        <CardDescription>上传代表菜品的照片，AI 会自动识别菜品和风格进行融合。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
          <input
            id="dish-upload"
            type="file"
            accept="image/*"
            onChange={onDishImageChange}
            className="hidden"
          />
          <label htmlFor="dish-upload" className="cursor-pointer">
            {dishImagePreview ? (
              <div className="space-y-2">
                <img
                  src={dishImagePreview}
                  alt="菜品预览"
                  className="mx-auto max-h-32 max-w-full rounded"
                />
                <p className="text-sm text-gray-500">点击替换图片</p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileImage className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-gray-500">点击上传菜品图</p>
                <p className="text-xs text-gray-400">支持 JPG、PNG 格式</p>
              </div>
            )}
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
