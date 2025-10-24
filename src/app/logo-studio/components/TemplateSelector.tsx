'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid3x3, Sparkles } from 'lucide-react';
import type { LogoTemplate, LogoTemplateCategory } from '../types';

interface TemplateSelectorProps {
  loading: boolean;
  avatarCategory: string;
  storefrontCategory: string;
  posterCategory: string;
  setAvatarCategory: (value: string) => void;
  setStorefrontCategory: (value: string) => void;
  setPosterCategory: (value: string) => void;
  avatarTemplateCategories: LogoTemplateCategory[];
  storefrontTemplateCategories: LogoTemplateCategory[];
  posterTemplateCategories: LogoTemplateCategory[];
  currentAvatarTemplates: LogoTemplate[];
  currentStorefrontTemplates: LogoTemplate[];
  currentPosterTemplates: LogoTemplate[];
  avatarTemplate: LogoTemplate | null;
  storefrontTemplate: LogoTemplate | null;
  posterTemplate: LogoTemplate | null;
  onSelectTemplate: (template: LogoTemplate, type: 'avatar' | 'storefront' | 'poster') => void;
}

export function TemplateSelector({
  loading,
  avatarCategory,
  storefrontCategory,
  posterCategory,
  setAvatarCategory,
  setStorefrontCategory,
  setPosterCategory,
  avatarTemplateCategories,
  storefrontTemplateCategories,
  posterTemplateCategories,
  currentAvatarTemplates,
  currentStorefrontTemplates,
  currentPosterTemplates,
  avatarTemplate,
  storefrontTemplate,
  posterTemplate,
  onSelectTemplate,
}: TemplateSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Grid3x3 className="mr-2 h-5 w-5" />
          选择设计风格
        </CardTitle>
        <CardDescription>分别选择店招、海报、头像三种类型的风格</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">正在加载设计风格，请稍候...</div>
        ) : (
          <Tabs defaultValue="avatar" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 text-xs">
              <TabsTrigger value="avatar">品牌头像风格</TabsTrigger>
              <TabsTrigger value="storefront">店招风格</TabsTrigger>
              <TabsTrigger value="poster">海报风格</TabsTrigger>
            </TabsList>

            <TabsContent value="avatar" className="space-y-3">
              <CategorySelect
                value={avatarCategory}
                placeholder="请选择头像风格分类..."
                categories={avatarTemplateCategories}
                onChange={setAvatarCategory}
              />
              {avatarCategory && (
                <TemplateGrid
                  templates={currentAvatarTemplates}
                  selectedId={avatarTemplate?.id}
                  onSelect={(template) => onSelectTemplate(template, 'avatar')}
                />
              )}
            </TabsContent>

            <TabsContent value="storefront" className="space-y-3">
              <CategorySelect
                value={storefrontCategory}
                placeholder="请选择店招风格分类..."
                categories={storefrontTemplateCategories}
                onChange={setStorefrontCategory}
              />
              {storefrontCategory && (
                <TemplateGrid
                  templates={currentStorefrontTemplates}
                  selectedId={storefrontTemplate?.id}
                  onSelect={(template) => onSelectTemplate(template, 'storefront')}
                  highlight="green"
                />
              )}
            </TabsContent>

            <TabsContent value="poster" className="space-y-3">
              <CategorySelect
                value={posterCategory}
                placeholder="请选择海报风格分类..."
                categories={posterTemplateCategories}
                onChange={setPosterCategory}
              />
              {posterCategory && (
                <TemplateGrid
                  templates={currentPosterTemplates}
                  selectedId={posterTemplate?.id}
                  onSelect={(template) => onSelectTemplate(template, 'poster')}
                  highlight="blue"
                />
              )}
            </TabsContent>
          </Tabs>
        )}
        <div className="mt-4 flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          <Sparkles className="h-4 w-4 text-blue-500" />
          提示：点击风格后会自动填充模板中的店名，方便后续提示词替换。
        </div>
      </CardContent>
    </Card>
  );
}

interface CategorySelectProps {
  value: string;
  placeholder: string;
  categories: LogoTemplateCategory[];
  onChange: (value: string) => void;
}

function CategorySelect({ value, placeholder, categories, onChange }: CategorySelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
    >
      <option value="">{placeholder}</option>
      {categories.map((category) => (
        <option key={category.category} value={category.category}>
          {category.categoryDisplayName}（{category.templates.length} 套风格）
        </option>
      ))}
    </select>
  );
}

interface TemplateGridProps {
  templates: LogoTemplate[];
  selectedId?: string;
  highlight?: 'green' | 'blue' | 'purple';
  onSelect: (template: LogoTemplate) => void;
}

function TemplateGrid({ templates, selectedId, highlight = 'purple', onSelect }: TemplateGridProps) {
  const activeColor =
    highlight === 'green'
      ? 'border-green-500 bg-green-100'
      : highlight === 'blue'
      ? 'border-blue-500 bg-blue-100'
      : 'border-purple-500 bg-purple-100';

  return (
    <div className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto">
      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => onSelect(template)}
          className={`rounded-lg border-2 p-2 transition-all ${
            template.id === selectedId ? activeColor : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <img
            src={template.url}
            alt={template.name}
            className="mb-1 w-full rounded bg-gray-100 object-contain"
            style={{ height: '8rem' }}
          />
          <p className="truncate text-xs text-center">{template.name}</p>
        </button>
      ))}
    </div>
  );
}
