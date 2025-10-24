'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Upload, RefreshCw, Check } from 'lucide-react';
import { useCozePromptOptimizer } from '../hooks/useCozePromptOptimizer';
import { useCozeDishGenerator } from '../hooks/useCozeDishGenerator';
import { CozeApiClient } from '@/lib/api/clients/CozeApiClient';
import { toast } from 'sonner';

interface AIDishGeneratorProps {
  onApplyImage: (imageFile: File) => void;
  onModeChange?: () => void; // 应用图片后切换模式的回调
}

/**
 * AIDishGenerator
 * AI智能生成菜品图主组件
 *
 * 功能流程：
 * 1. 用户输入菜品描述
 * 2. 可选上传原图参考
 * 3. 点击"优化提示词" → 流式优化（实时覆盖输入框）
 * 4. 点击"生成菜品图" → 生成图片
 * 5. 预览结果 → 应用此图 | 重新生成
 */
export function AIDishGenerator({ onApplyImage, onModeChange }: AIDishGeneratorProps) {
  // 菜品描述（支持实时更新）
  const [description, setDescription] = useState('');

  // 原图参考
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);

  // 提示词优化Hook
  const promptOptimizer = useCozePromptOptimizer({
    onOptimizationComplete: (optimized) => {
      setDescription(optimized); // 流式文本实时覆盖输入框
      toast.success('提示词优化完成！');
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  // 菜品图生成Hook
  const dishGenerator = useCozeDishGenerator({
    onGenerationComplete: () => {
      toast.success('菜品图生成成功！');
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  /**
   * 处理原图上传
   */
  const handleReferenceImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    // 验证文件大小（限制2MB）
    if (file.size > 2 * 1024 * 1024) {
      toast.error('图片大小不能超过2MB');
      return;
    }

    try {
      // 压缩图片
      const compressedBlob = await CozeApiClient.compressImage(file, 800, 800);
      const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });

      setReferenceImage(compressedFile);

      // 生成预览URL
      const previewUrl = URL.createObjectURL(compressedFile);
      setReferenceImagePreview(previewUrl);

      toast.success('原图上传成功');
    } catch (error) {
      console.error('图片压缩失败:', error);
      toast.error('图片处理失败，请重试');
    }
  }, []);

  /**
   * 优化提示词
   */
  const handleOptimizePrompt = useCallback(async () => {
    if (!description.trim()) {
      toast.error('请先输入菜品描述');
      return;
    }

    try {
      let imageBase64: string | undefined;

      // 如果有原图，转换为base64
      if (referenceImage) {
        imageBase64 = await CozeApiClient.fileToBase64(referenceImage);
      }

      await promptOptimizer.optimizePrompt(description, imageBase64);
    } catch (error) {
      console.error('优化提示词失败:', error);
    }
  }, [description, referenceImage, promptOptimizer]);

  /**
   * 生成菜品图
   */
  const handleGenerateDish = useCallback(async () => {
    if (!description.trim()) {
      toast.error('请先输入或优化菜品描述');
      return;
    }

    await dishGenerator.generateDishImage(description);
  }, [description, dishGenerator]);

  /**
   * 应用生成的图片
   */
  const handleApplyImage = useCallback(async () => {
    const imageUrl = dishGenerator.getFinalImageUrl();
    if (!imageUrl) {
      toast.error('没有可应用的图片');
      return;
    }

    try {
      // 将图片URL转换为File对象
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], '生成的菜品图.png', { type: 'image/png' });

      onApplyImage(file);
      toast.success('已应用生成的菜品图');

      // 切换回手动上传模式
      if (onModeChange) {
        onModeChange();
      }

      // 重置状态
      dishGenerator.reset();
      promptOptimizer.reset();
      setDescription('');
      setReferenceImage(null);
      setReferenceImagePreview(null);
    } catch (error) {
      console.error('应用图片失败:', error);
      toast.error('应用图片失败，请重试');
    }
  }, [dishGenerator, promptOptimizer, onApplyImage, onModeChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
          AI智能生成菜品图
        </CardTitle>
        <CardDescription>
          描述您的菜品，AI将为您生成专业的菜品图
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 菜品描述输入框 */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            菜品描述（越详细越好）
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例如：一碗热气腾腾的牛肉面，浓郁的汤底，嫩滑的牛肉片，撒上香菜和葱花..."
            className="min-h-[120px]"
            disabled={promptOptimizer.isOptimizing || dishGenerator.isGenerating}
          />
          {promptOptimizer.isOptimizing && (
            <p className="mt-2 text-xs text-purple-600">
              🔄 AI正在优化提示词，文本将实时更新...
            </p>
          )}
        </div>

        {/* 原图上传（可选） */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            原图参考（可选，有助于AI理解）
          </label>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleReferenceImageUpload}
              className="hidden"
              id="reference-image-upload"
              disabled={promptOptimizer.isOptimizing || dishGenerator.isGenerating}
            />
            <label
              htmlFor="reference-image-upload"
              className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              {referenceImagePreview ? (
                <div className="text-center">
                  <img
                    src={referenceImagePreview}
                    alt="原图预览"
                    className="mx-auto h-32 w-32 rounded-lg object-cover"
                  />
                  <p className="mt-2 text-xs text-gray-500">点击更换图片</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">点击上传原图参考</p>
                  <p className="mt-1 text-xs text-gray-400">支持JPG、PNG，最大2MB</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button
            onClick={handleOptimizePrompt}
            disabled={!description.trim() || promptOptimizer.isOptimizing || dishGenerator.isGenerating}
            variant="outline"
            className="flex-1"
          >
            {promptOptimizer.isOptimizing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                优化中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                优化提示词
              </>
            )}
          </Button>

          <Button
            onClick={handleGenerateDish}
            disabled={!description.trim() || promptOptimizer.isOptimizing || dishGenerator.isGenerating}
            className="flex-1"
          >
            {dishGenerator.isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                生成菜品图
              </>
            )}
          </Button>
        </div>

        {/* 生成进度提示 */}
        {dishGenerator.isGenerating && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">⚡ AI正在生成菜品图，请稍候...</p>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* 错误提示 */}
        {(promptOptimizer.error || dishGenerator.error) && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            ❌ {promptOptimizer.error || dishGenerator.error}
          </div>
        )}

        {/* 生成结果预览 */}
        {dishGenerator.generatedImage && (
          <div className="space-y-3 rounded-lg border-2 border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-700">✅ 生成成功！</p>
            <div className="rounded-lg bg-white p-2">
              <img
                src={dishGenerator.getFinalImageUrl() || ''}
                alt="生成的菜品图"
                className="w-full rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleApplyImage}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="mr-2 h-4 w-4" />
                应用此图
              </Button>
              <Button
                onClick={dishGenerator.regenerate}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                重新生成
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
