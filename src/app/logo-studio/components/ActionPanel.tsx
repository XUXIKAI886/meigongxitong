'use client';

import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, Store, FileImage } from 'lucide-react';

interface ActionPanelProps {
  avatarStep1Generating: boolean;
  avatarStep2Generating: boolean;
  storefrontGenerating: boolean;
  posterGenerating: boolean;
  avatarStep1Result: string | null;
  canGenerateAvatarStep1: boolean;
  canGenerateAvatarStep2: boolean;
  canGenerateStorefront: boolean;
  canGeneratePoster: boolean;
  onAvatarStep1: () => void;
  onAvatarStep2: () => void;
  onGenerateStorefront: () => void;
  onGeneratePoster: () => void;
}

export function ActionPanel({
  avatarStep1Generating,
  avatarStep2Generating,
  storefrontGenerating,
  posterGenerating,
  avatarStep1Result,
  canGenerateAvatarStep1,
  canGenerateAvatarStep2,
  canGenerateStorefront,
  canGeneratePoster,
  onAvatarStep1,
  onAvatarStep2,
  onGenerateStorefront,
  onGeneratePoster,
}: ActionPanelProps) {
  return (
    <div className="space-y-3">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">选择要生成的设计类型</h3>
        <p className="text-sm text-gray-600">点击对应按钮生成单个类型的设计图片</p>
      </div>

      <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="text-sm font-medium text-purple-800 mb-2">👤 头像设计生成 (两步骤)</div>

        <Button
          onClick={onAvatarStep1}
          disabled={!canGenerateAvatarStep1 || avatarStep1Generating}
          className="w-full h-12 text-base bg-purple-500 hover:bg-purple-600 text-white"
        >
          {avatarStep1Generating ? (
            <>
              <Wand2 className="w-4 h-4 mr-2 animate-spin" />
              步骤1进行中：AI食物替换...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              步骤1：食物替换 (Gemini)
            </>
          )}
        </Button>

        {avatarStep1Result && (
          <div className="flex items-center justify-center text-xs text-green-600 bg-green-50 py-2 px-3 rounded">
            ✓ 步骤1已完成，可以进行步骤2
          </div>
        )}

        <Button
          onClick={onAvatarStep2}
          disabled={!canGenerateAvatarStep2 || avatarStep2Generating}
          className="w-full h-12 text-base bg-purple-700 hover:bg-purple-800 text-white"
        >
          {avatarStep2Generating ? (
            <>
              <Wand2 className="w-4 h-4 mr-2 animate-spin" />
              步骤2进行中：AI店名替换...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              步骤2：店名替换 (seedream-4)
            </>
          )}
        </Button>

        <p className="text-xs text-purple-600 text-center">
          💡 先点击"步骤1"进行食物替换，完成后再点击"步骤2"替换店铺名
        </p>
      </div>

      <Button
        onClick={onGenerateStorefront}
        disabled={!canGenerateStorefront || storefrontGenerating}
        className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 text-white"
      >
        {storefrontGenerating ? (
          <>
            <Wand2 className="w-5 h-5 mr-2 animate-spin" />
            AI生成店招中...
          </>
        ) : (
          <>
            <Store className="w-5 h-5 mr-2" />
            🏪 生成店招设计 (1280×720)
          </>
        )}
      </Button>

      <Button
        onClick={onGeneratePoster}
        disabled={!canGeneratePoster || posterGenerating}
        className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white"
      >
        {posterGenerating ? (
          <>
            <Wand2 className="w-5 h-5 mr-2 animate-spin" />
            AI生成海报中...
          </>
        ) : (
          <>
            <FileImage className="w-5 h-5 mr-2" />
            📢 生成海报设计 (1440×480)
          </>
        )}
      </Button>
    </div>
  );
}
