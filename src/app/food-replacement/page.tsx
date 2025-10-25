'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useCallback, useState } from 'react';
import { useFoodReplacement } from './hooks/useFoodReplacement';
import { useTemplates } from './hooks/useTemplates';
import { useImageUpload } from './hooks/useImageUpload';
import { useBatchCutout } from './hooks/useBatchCutout';
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
    updateResult, // 使用hook提供的updateResult方法
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
    replaceBatchSourceImage,  // 批量模式：用于抠图后替换图片
    replaceSourceImage,       // 单张模式：用于抠图后替换图片
    setTemplatePreview,
    clearPreviews,
    setSourceImages,
    setSourceImagePreviews,
  } = useImageUpload();

  // 新增：批量抠图Hook
  const batchCutout = useBatchCutout();

  // 新增：抠图结果预览URLs状态管理
  const [cutoutResultPreviews, setCutoutResultPreviews] = useState<string[]>([]);

  // 新增：正在重新抠图的图片索引（-1表示无）
  const [recutingIndex, setRecutingIndex] = useState<number>(-1);

  // 新增：正在重新生成的结果索引（-1表示无）
  const [regeneratingIndex, setRegeneratingIndex] = useState<number>(-1);

  // 监听抠图结果变化，自动生成预览URLs
  useEffect(() => {
    const { cutoutResults } = batchCutout;
    if (cutoutResults.length === 0) {
      setCutoutResultPreviews([]);
      return;
    }

    // 生成预览URLs
    const previews: string[] = [];
    cutoutResults.forEach((file) => {
      if (file) {
        const url = URL.createObjectURL(file);
        previews.push(url);
      } else {
        previews.push('');
      }
    });

    setCutoutResultPreviews(previews);

    // 清理旧的blob URLs
    return () => {
      previews.forEach((url) => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [batchCutout.cutoutResults]);

  // 页面加载时自动加载美团风格
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

  // 风格选择处理
  const handleTemplateSelect = (template: any) => {
    selectTemplate(template);
    setTemplatePreview(template.url, isBatchMode);
  };

  // 切换风格选择器显示（不再在这里加载风格，由按钮单独控制）
  const handleToggleTemplateSelector = (show: boolean) => {
    setShowTemplateSelector(show);
  };

  // 新增：处理批量抠图（支持单张和批量模式）
  const handleBatchCutout = useCallback(async () => {
    // 单张模式：检查sourceImage
    // 批量模式：检查sourceImages数组
    const imagesToCutout = isBatchMode ? sourceImages : (sourceImage ? [sourceImage] : []);

    if (imagesToCutout.length === 0) {
      alert('请先上传源图片');
      return;
    }

    console.log(`[handleBatchCutout] 开始${isBatchMode ? '批量' : '单张'}抠图`);

    // 不再传递回调，直接调用batchCutout
    await batchCutout.batchCutout(imagesToCutout);

    // 显示完成提示
    const { successCount, failedCount } = batchCutout;
    alert(
      `${isBatchMode ? '批量' : ''}抠图完成！\n\n` +
      `✓ 成功: ${successCount}/${imagesToCutout.length}\n` +
      (failedCount > 0 ? `✗ 失败: ${failedCount}` : '') +
      `\n\n请查看下方的抠图结果预览，确认无误后点击"一键应用"按钮。`
    );

    console.log(`[handleBatchCutout] ${isBatchMode ? '批量' : '单张'}抠图完成`);
  }, [isBatchMode, sourceImage, sourceImages, batchCutout]);

  // 新增：应用抠图结果（支持单张和批量模式）
  const handleApplyCutout = useCallback(() => {
    const { cutoutResults } = batchCutout;
    if (cutoutResults.length === 0) {
      alert('没有可应用的抠图结果');
      return;
    }

    console.log(`[handleApplyCutout] 开始应用${isBatchMode ? '批量' : '单张'}抠图结果`);

    if (isBatchMode) {
      // 批量模式：替换所有源图片
      cutoutResults.forEach((cutoutFile, index) => {
        if (cutoutFile) {
          replaceBatchSourceImage(index, cutoutFile);
          console.log(`✓ 第${index + 1}张已应用:`, cutoutFile.name);
        }
      });
    } else {
      // 单张模式：替换源图片
      if (cutoutResults[0]) {
        replaceSourceImage(cutoutResults[0]);
        console.log('✓ 单张图片已应用:', cutoutResults[0].name);
      }
    }

    // 清空抠图结果和预览
    batchCutout.clearCutoutResults();
    setCutoutResultPreviews([]);

    console.log(`[handleApplyCutout] ${isBatchMode ? '批量' : '单张'}应用完成`);
  }, [isBatchMode, batchCutout, replaceBatchSourceImage, replaceSourceImage]);

  // 新增：重新抠图单张图片（支持单张和批量模式）
  const handleRecutImage = useCallback(async (index: number) => {
    const imageToRecut = isBatchMode ? sourceImages[index] : sourceImage;

    if (!imageToRecut) {
      console.error('[handleRecutImage] 没有可重新抠图的图片');
      return;
    }

    if (isBatchMode && (index < 0 || index >= sourceImages.length)) {
      console.error('[handleRecutImage] 索引越界:', index);
      return;
    }

    console.log(`[handleRecutImage] 开始重新抠图${isBatchMode ? `第 ${index + 1} 张` : ''}`);
    setRecutingIndex(index);

    try {
      await batchCutout.recutSingleImage(index, imageToRecut);
      console.log(`[handleRecutImage] ${isBatchMode ? `第 ${index + 1} 张` : ''}重新抠图成功`);
    } catch (error) {
      console.error(`[handleRecutImage] ${isBatchMode ? `第 ${index + 1} 张` : ''}重新抠图失败:`, error);
      alert(`重新抠图失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setRecutingIndex(-1);
    }
  }, [isBatchMode, sourceImage, sourceImages, batchCutout]);

  // 新增：重新生成单张图片
  const handleRegenerateImage = useCallback(async (result: FoodReplacementResult, resultIndex: number) => {
    console.log(`[handleRegenerateImage] 开始重新生成第 ${resultIndex + 1} 张图片`);
    console.log('结果详情:', result);

    setRegeneratingIndex(resultIndex);

    try {
      // 1. 找到对应的源图片
      let sourceImageFile: File | null = null;

      if (result.sourceImageIndex !== undefined) {
        // 批量模式：根据sourceImageIndex找到对应的源图片
        if (isBatchMode && sourceImages[result.sourceImageIndex]) {
          sourceImageFile = sourceImages[result.sourceImageIndex];
        } else if (!isBatchMode && sourceImage) {
          // 单张模式
          sourceImageFile = sourceImage;
        }
      } else {
        // 如果没有sourceImageIndex，使用当前的源图片
        sourceImageFile = isBatchMode ? sourceImages[0] : sourceImage;
      }

      if (!sourceImageFile) {
        throw new Error('无法找到对应的源图片');
      }

      console.log('找到源图片:', sourceImageFile.name);

      // 2. 获取当前的目标图片
      const targetImageFile = isBatchMode ? batchTargetImage : targetImage;
      if (!targetImageFile && !selectedTemplate) {
        throw new Error('无法找到目标图片或模板');
      }

      // 3. 创建FormData
      const formData = new FormData();
      formData.append('sourceImage', sourceImageFile);

      if (selectedTemplate) {
        formData.append('targetImageUrl', selectedTemplate.url);
        console.log('使用模板:', selectedTemplate.name);
      } else if (targetImageFile) {
        formData.append('targetImage', targetImageFile);
        console.log('使用上传的目标图片');
      }

      // 4. 调用API
      console.log('开始调用API重新生成...');
      const response = await fetch('/api/food-replacement', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('API响应:', data);

      if (data.ok && data.data && data.data.imageUrl) {
        // Vercel同步模式: 直接处理结果
        console.log('检测到同步响应，更新结果');
        const updatedResult: FoodReplacementResult = {
          ...result,
          imageUrl: data.data.imageUrl,
          width: data.data.width,
          height: data.data.height,
          processedAt: new Date().toISOString(),
        };

        updateResult(resultIndex, updatedResult);
        console.log('✓ 重新生成成功');
      } else if (data.ok && data.jobId) {
        // 本地异步模式: 轮询等待作业完成
        console.log('检测到异步作业，jobId:', data.jobId);

        const maxAttempts = 150; // 5分钟
        let attempts = 0;
        let jobCompleted = false;

        while (attempts < maxAttempts && !jobCompleted) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;

          try {
            const jobResponse = await fetch(`/api/jobs/${data.jobId}`);
            const jobData = await jobResponse.json();

            console.log(`轮询 (${attempts}/${maxAttempts}):`, jobData.job?.status);

            if (jobData.ok && jobData.job) {
              if (jobData.job.status === 'succeeded' && jobData.job.result) {
                // 作业成功完成
                const updatedResult: FoodReplacementResult = {
                  ...result,
                  imageUrl: jobData.job.result.imageUrl,
                  width: jobData.job.result.width,
                  height: jobData.job.result.height,
                  processedAt: new Date().toISOString(),
                };

                updateResult(resultIndex, updatedResult);
                jobCompleted = true;
                console.log('✓ 异步作业完成，重新生成成功');
              } else if (jobData.job.status === 'failed') {
                throw new Error(jobData.job.error || '处理失败');
              }
            }
          } catch (pollError) {
            console.error('轮询错误:', pollError);
          }
        }

        if (!jobCompleted) {
          throw new Error('处理超时，请重试');
        }
      } else {
        throw new Error(data.error || '处理失败');
      }
    } catch (error) {
      console.error('[handleRegenerateImage] 重新生成失败:', error);
      alert(`重新生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setRegeneratingIndex(-1);
    }
  }, [isBatchMode, sourceImage, sourceImages, batchTargetImage, targetImage, selectedTemplate, updateResult]);

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
            });

            console.log(`处理第 ${i + 1}/${sourceImages.length} 张图片: ${sourceImages[i].name}`);
            console.log('sourceImage类型:', sourceImages[i] instanceof File, 'size:', sourceImages[i].size, 'type:', sourceImages[i].type);

            // 为每张图片创建单独的请求
            const singleFormData = new FormData();
            singleFormData.append('sourceImage', sourceImages[i]);

            if (selectedTemplate) {
              singleFormData.append('targetImageUrl', selectedTemplate.url);
            } else if (batchTargetImage) {
              singleFormData.append('targetImage', batchTargetImage);
            }

            console.log('FormData内容:', {
              hasSourceImage: singleFormData.has('sourceImage'),
              hasTargetImageUrl: singleFormData.has('targetImageUrl'),
              hasTargetImage: singleFormData.has('targetImage'),
            });

            // 调用单张处理API
            const requestUrl = '/api/food-replacement';
            console.log('即将发送请求到:', requestUrl);
            const response = await fetch(requestUrl, {
              method: 'POST',
              body: singleFormData,
            });

            console.log('收到响应:', {
              url: response.url,  // 实际请求的URL
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              headers: Object.fromEntries(response.headers.entries())
            });

            const data = await response.json();

            console.log('完整API响应数据:', data);  // 打印完整data对象
            console.log('API响应解析:', { ok: data.ok, hasData: !!data.data, hasImageUrl: !!(data.data?.imageUrl), hasJobId: !!data.jobId, error: data.error });

            if (data.ok && data.data && data.data.imageUrl) {
              // Vercel同步模式: 直接处理结果
              console.log(`第 ${i + 1} 张：检测到同步响应`);
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
            } else if (data.ok && data.jobId) {
              // 本地异步模式: 轮询等待作业完成
              console.log(`第 ${i + 1} 张：检测到异步作业，jobId: ${data.jobId}`);

              // 轮询作业状态，最多等待5分钟
              const maxAttempts = 150; // 150次 * 2秒 = 5分钟
              let attempts = 0;
              let jobCompleted = false;

              while (attempts < maxAttempts && !jobCompleted) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
                attempts++;

                try {
                  const jobResponse = await fetch(`/api/jobs/${data.jobId}`);
                  const jobData = await jobResponse.json();

                  console.log(`第 ${i + 1} 张轮询 (${attempts}/${maxAttempts}):`, jobData.job?.status);

                  if (jobData.ok && jobData.job) {
                    if (jobData.job.status === 'succeeded' && jobData.job.result) {
                      // 作业成功完成
                      const result: FoodReplacementResult = {
                        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 15)}`,
                        imageUrl: jobData.job.result.imageUrl,
                        width: jobData.job.result.width,
                        height: jobData.job.result.height,
                        sourceImageIndex: i,
                        sourceFileName: sourceImages[i].name,
                        processedAt: new Date().toISOString(),
                      };

                      newResults.push(result);
                      successCount++;
                      addResults([result]);
                      jobCompleted = true;

                      console.log(`✓ 第 ${i + 1} 张异步处理成功`);
                    } else if (jobData.job.status === 'failed') {
                      // 作业失败
                      throw new Error(jobData.job.error || '异步处理失败');
                    }
                    // status === 'running' 或 'queued'，继续轮询
                  }
                } catch (pollError) {
                  console.error(`第 ${i + 1} 张轮询出错:`, pollError);
                  // 继续轮询
                }
              }

              if (!jobCompleted) {
                throw new Error('异步处理超时（5分钟）');
              }
            } else {
              throw new Error(data.error || '处理失败：无效的响应格式');
            }

          } catch (error) {
            failedCount++;
            console.error(`✗ 第 ${i + 1} 张处理失败:`, error);
            // 继续处理下一张
          }
        }

        // 所有图片处理完成
        setIsProcessing(false);

        if (newResults.length > 0) {
          setJobStatus({
            id: 'batch-completed',
            status: 'succeeded',
            progress: 100,
            result: {
              imageUrl: newResults[newResults.length - 1].imageUrl,
              width: newResults[newResults.length - 1].width,
              height: newResults[newResults.length - 1].height,
            },
          });
        }

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
                // 批量抠图props
                onStartBatchCutout={handleBatchCutout}
                isCutting={batchCutout.isCutting}
                cutoutProgress={batchCutout.cutoutProgress}
                currentImageIndex={batchCutout.currentImageIndex}
                // 抠图结果展示与应用props
                cutoutResults={batchCutout.cutoutResults}
                cutoutResultPreviews={cutoutResultPreviews}
                onApplyCutout={handleApplyCutout}
                // 重新抠图props
                onRecutImage={handleRecutImage}
                recutingIndex={recutingIndex}
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
              onRegenerate={handleRegenerateImage}
              regeneratingIndex={regeneratingIndex}
            />
          </div>
        </div>

      </div>
    </div>
  );
}