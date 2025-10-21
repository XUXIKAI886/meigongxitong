'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useFoodReplacement } from './hooks/useFoodReplacement';
import { useTemplates } from './hooks/useTemplates';
import { useImageUpload } from './hooks/useImageUpload';
import { FoodReplacementResult } from './types';
import BatchModeToggle from './components/BatchModeToggle';
import SourceImageUpload from './components/SourceImageUpload';
import TargetImageUpload from './components/TargetImageUpload';
import ProcessingStatus from './components/ProcessingStatus';
import ResultDisplay from './components/ResultDisplay';

export default function FoodReplacementPage() {
  const {
    isBatchMode,
    isProcessing,
    jobStatus,
    completedResults,
    currentJobFileNames,
    setIsBatchMode,
    setIsProcessing,
    setJobStatus,
    setShouldStopPolling,
    clearHistoryResults,
    pollJobStatus,
    setCurrentJobFileNames,
    addResults, // 使用hook提供的addResults方法
  } = useFoodReplacement();

  const {
    meituanTemplates,
    elemeTemplates,
    selectedTemplate,
    showTemplateSelector,
    loadingTemplates,
    currentPlatform,
    loadMeituanTemplates,
    loadElemeTemplates,
    selectTemplate,
    clearTemplateSelection,
    setShowTemplateSelector,
  } = useTemplates();

  const {
    sourceImage,
    targetImage,
    sourceImagePreview,
    targetImagePreview,
    sourceImages,
    sourceImagePreviews,
    batchTargetImage,
    batchTargetImagePreview,
    sourceDropzone,
    targetDropzone,
    batchSourceDropzone,
    batchTargetDropzone,
    removeBatchSourceImage,
    setTemplatePreview,
    clearPreviews,
    setSourceImages,
    setSourceImagePreviews,
  } = useImageUpload();

  // 页面加载时自动加载美团模板
  useEffect(() => {
    loadMeituanTemplates();
  }, [loadMeituanTemplates]);

  // 模式切换处理
  const handleModeToggle = (batchMode: boolean) => {
    setIsBatchMode(batchMode);
    clearTemplateSelection();
    clearPreviews();
    setSourceImages([]);
    setSourceImagePreviews([]);
  };

  // 模板选择处理
  const handleTemplateSelect = (template: any) => {
    selectTemplate(template);
    setTemplatePreview(template.url, isBatchMode);
  };

  // 切换模板选择器显示（不再在这里加载模板，由按钮单独控制）
  const handleToggleTemplateSelector = (show: boolean) => {
    setShowTemplateSelector(show);
  };

  // 开始处理
  const handleStartProcessing = async () => {
    const hasSourceImage = isBatchMode ? sourceImages.length > 0 : sourceImage;
    const hasTargetImage = isBatchMode ?
      (batchTargetImage || selectedTemplate) :
      (targetImage || selectedTemplate);

    if (!hasSourceImage || !hasTargetImage) {
      alert('请上传源图片和目标图片');
      return;
    }

    setIsProcessing(true);
    setShouldStopPolling(false);
    setJobStatus(null);

    try {
      const formData = new FormData();

      if (isBatchMode) {
        // 批量模式: 串行处理每张图片（避免响应体过大）
        console.log(`开始批量处理 ${sourceImages.length} 张图片（串行模式）`);

        const newResults: FoodReplacementResult[] = [];
        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < sourceImages.length; i++) {
          try {
            // 更新进度
            const progress = Math.round(((i + 1) / sourceImages.length) * 100);
            setJobStatus({
              id: `batch-${Date.now()}`,
              status: 'running',
              progress,
              result: null,
            });

            console.log(`处理第 ${i + 1}/${sourceImages.length} 张图片: ${sourceImages[i].name}`);

            // 为每张图片创建单独的请求
            const singleFormData = new FormData();
            singleFormData.append('sourceImage', sourceImages[i]);

            if (selectedTemplate) {
              singleFormData.append('targetImageUrl', selectedTemplate.url);
            } else if (batchTargetImage) {
              singleFormData.append('targetImage', batchTargetImage);
            }

            // 调用单张处理API
            const response = await fetch('/api/food-replacement', {
              method: 'POST',
              body: singleFormData,
            });

            const data = await response.json();

            if (data.ok && data.data && data.data.imageUrl) {
              // 处理成功
              const result: FoodReplacementResult = {
                id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 15)}`,
                imageUrl: data.data.imageUrl,
                width: data.data.width,
                height: data.data.height,
                sourceImageIndex: i,
                sourceFileName: sourceImages[i].name,
                processedAt: new Date().toISOString(),
              };

              newResults.push(result);
              successCount++;

              // 实时添加到结果列表
              addResults([result]);

              console.log(`✓ 第 ${i + 1} 张处理成功`);
            } else {
              throw new Error(data.error || '处理失败');
            }

          } catch (error) {
            failedCount++;
            console.error(`✗ 第 ${i + 1} 张处理失败:`, error);
            // 继续处理下一张
          }
        }

        // 所有图片处理完成
        setIsProcessing(false);
        setJobStatus({
          id: 'batch-completed',
          status: 'succeeded',
          progress: 100,
          result: newResults.length > 0 ? {
            imageUrl: newResults[newResults.length - 1].imageUrl,
            width: newResults[newResults.length - 1].width,
            height: newResults[newResults.length - 1].height,
          } : null,
        });

        alert(`批量处理完成!\n成功: ${successCount}/${sourceImages.length}${failedCount > 0 ? `\n失败: ${failedCount}` : ''}`);
      } else {
        // 单张模式
        if (sourceImage) {
          formData.append('sourceImage', sourceImage);
        }

        if (selectedTemplate) {
          formData.append('targetImageUrl', selectedTemplate.url);
        } else if (targetImage) {
          formData.append('targetImage', targetImage);
        }

        const response = await fetch('/api/food-replacement', {
          method: 'POST',
          body: formData,
        });

        console.log('单张模式API响应状态:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });

        const data = await response.json();
        console.log('单张模式API响应数据:', data);

        if (data.ok) {
          // 检测是同步结果(Vercel)还是异步任务(本地)
          if (data.data && data.data.imageUrl) {
            // Vercel同步模式: 直接显示结果
            console.log('检测到Vercel同步模式响应，直接处理结果');
            setIsProcessing(false);

            // 创建结果对象
            const newResult: FoodReplacementResult = {
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
              imageUrl: data.data.imageUrl,
              width: data.data.width,
              height: data.data.height,
              sourceFileName: sourceImage?.name,
              processedAt: new Date().toISOString(),
            };

            // 添加到completedResults
            addResults([newResult]);

            setJobStatus({
              id: 'vercel-single',
              status: 'succeeded',
              progress: 100,
              result: {
                imageUrl: data.data.imageUrl,
                width: data.data.width,
                height: data.data.height,
              },
            });
            alert('食物替换完成!');
          } else if (data.jobId) {
            // 本地异步模式: 轮询作业状态
            console.log('检测到本地异步模式，开始轮询作业:', data.jobId);
            const fileNames = sourceImage ? [sourceImage.name] : [];
            pollJobStatus(data.jobId, fileNames);
          } else {
            throw new Error('无效的API响应格式');
          }
        } else {
          console.error('单张模式API返回错误:', {
            error: data.error,
            message: data.message,
            details: data.details,
            fullResponse: data
          });
          throw new Error(data.error || data.message || `单张处理失败: HTTP ${response.status}`);
        }
      }
    } catch (error) {
      console.error('食物替换处理失败:', error);
      console.error('错误详情:', error instanceof Error ? error.message : error);
      console.error('错误栈:', error instanceof Error ? error.stack : null);
      setIsProcessing(false);
      const errorMessage = error instanceof Error ? error.message : '处理失败，请重试';
      alert(`处理失败: ${errorMessage}`);
    }
  };

  const canStartProcessing = isBatchMode
    ? sourceImages.length > 0 && (batchTargetImage || selectedTemplate)
    : sourceImage && (targetImage || selectedTemplate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题和导航 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  返回首页
                </Button>
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-800">食物替换工具</h1>
            </div>
            <p className="text-gray-600">智能识别容器中的食物，精准替换为目标食物</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* 左侧 - 配置区域 */}
          <div className="xl:col-span-2 space-y-6">
            <BatchModeToggle
              isBatchMode={isBatchMode}
              onToggle={handleModeToggle}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SourceImageUpload
                isBatchMode={isBatchMode}
                sourceImage={sourceImage}
                sourceImagePreview={sourceImagePreview}
                sourceDropzone={sourceDropzone}
                sourceImages={sourceImages}
                sourceImagePreviews={sourceImagePreviews}
                batchSourceDropzone={batchSourceDropzone}
                onRemoveBatchImage={removeBatchSourceImage}
              />

              <TargetImageUpload
                isBatchMode={isBatchMode}
                targetImage={targetImage}
                targetImagePreview={targetImagePreview}
                targetDropzone={targetDropzone}
                batchTargetImage={batchTargetImage}
                batchTargetImagePreview={batchTargetImagePreview}
                batchTargetDropzone={batchTargetDropzone}
                selectedTemplate={selectedTemplate}
                showTemplateSelector={showTemplateSelector}
                meituanTemplates={meituanTemplates}
                elemeTemplates={elemeTemplates}
                loadingTemplates={loadingTemplates}
                currentPlatform={currentPlatform}
                onToggleTemplateSelector={handleToggleTemplateSelector}
                onSelectTemplate={handleTemplateSelect}
                onClearTemplate={clearTemplateSelection}
                onLoadMeituanTemplates={loadMeituanTemplates}
                onLoadElemeTemplates={loadElemeTemplates}
              />
            </div>

            {/* 开始处理按钮 */}
            <div className="flex justify-center">
              <Button
                onClick={handleStartProcessing}
                disabled={!canStartProcessing || isProcessing}
                size="lg"
                className="min-w-[200px] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {isProcessing ? '处理中...' : '开始智能替换'}
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>

          {/* 右侧 - 状态和结果区域 */}
          <div className="space-y-6">
            <ProcessingStatus
              isProcessing={isProcessing}
              jobStatus={jobStatus}
            />

            <ResultDisplay
              results={completedResults}
            />
          </div>
        </div>

      </div>
    </div>
  );
}