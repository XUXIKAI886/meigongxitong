'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store } from 'lucide-react';

interface StoreInfoCardProps {
  storeName: string;
  templateStoreName: string;
  onStoreNameChange: (value: string) => void;
  onTemplateStoreNameChange: (value: string) => void;
}

/**
 * StoreInfoCard
 * 门店信息输入卡片
 *
 * 功能：
 * - 输入真实门店名称
 * - 输入模板风格店铺名
 */
export function StoreInfoCard({
  storeName,
  templateStoreName,
  onStoreNameChange,
  onTemplateStoreNameChange,
}: StoreInfoCardProps) {
  return (
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
  );
}
