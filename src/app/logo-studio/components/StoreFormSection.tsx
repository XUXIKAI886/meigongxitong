'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Store, FileImage } from 'lucide-react';

interface StoreFormSectionProps {
  storeName: string;
  templateStoreName: string;
  dishImagePreview: string;
  onStoreNameChange: (value: string) => void;
  onTemplateStoreNameChange: (value: string) => void;
  onDishImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function StoreFormSection({
  storeName,
  templateStoreName,
  dishImagePreview,
  onStoreNameChange,
  onTemplateStoreNameChange,
  onDishImageChange,
}: StoreFormSectionProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Store className="mr-2 h-5 w-5" />
            门店信息
          </CardTitle>
          <CardDescription>请输入真实的门店名称，系统会将其写入展示文案。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="storeName">门店名称 *</Label>
              <Input
                id="storeName"
                placeholder="例如：川味小馆"
                value={storeName}
                onChange={(event) => onStoreNameChange(event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="templateStoreName">风格店铺名 *</Label>
              <Input
                id="templateStoreName"
                placeholder="例如：风格里的参考店名"
                value={templateStoreName}
                onChange={(event) => onTemplateStoreNameChange(event.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            小贴士：请填写风格原始店名，AI 才能在提示词中精准替换为您的门店名称。
          </p>
        </CardContent>
      </Card>

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
    </div>
  );
}
