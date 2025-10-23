'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ArrowRightIcon, ImageIcon } from 'lucide-react';
import BatchModeToggle from './components/BatchModeToggle';
import SourceImageUpload from './components/SourceImageUpload';
import TargetImageUpload from './components/TargetImageUpload';
import ProcessingStatus from './components/ProcessingStatus';
import ResultDisplay from './components/ResultDisplay';

export default function BackgroundFusionPage() {
  // 模式状态
  const [isBatchMode, setIsBatchMode] = useState(false);

  // 单张模式状态
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [targetImage, setTargetImage] = useState<File | null>(null);
  const [targetImagePreview, setTargetImagePreview] = useState<string | null>(null);

  // 批量模式状态
  const [sourceImages, setSourceImages] = useState<File[]>([]);
  const [sourceImagePreviews, setSourceImagePreviews] = useState<string[]>([]);
  const [batchTargetImage, setBatchTargetImage] = useState<File | null>(null);
  const [batchTargetImagePreview, setBatchTargetImagePreview] = useState<string | null>(null);

  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  // 风格相关状态
  const [meituanTemplates, setMeituanTemplates] = useState<any[]>([]);
  const [elemeTemplates, setElemeTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(true); // 默认显示风格选择器
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<'meituan' | 'eleme'>('meituan');

  // 历史结果状态
  const [historicalBatchResults, setHistoricalBatchResults] = useState<any[]>([]);

  // 保存原始文件名的ref (避免闭包问题)
  const fileNamesRef = useRef<string[]>([]);

  // 加载美团风格
  const loadMeituanTemplates = async () => {
    setCurrentPlatform('meituan');

    if (meituanTemplates.length > 0) {
      return;
    }

    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/background-fusion/templates');
      const data = await response.json();
      setMeituanTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load Meituan templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 加载饿了么风格
  const loadElemeTemplates = async () => {
    setCurrentPlatform('eleme');

    if (elemeTemplates.length > 0) {
      return;
    }

    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/eleme-background-templates');
      const data = await response.json();
      setElemeTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load Eleme templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 选择风格
  const selectTemplate = (template: any) => {
    setSelectedTemplate(template);
    
    // 清除上传的图片状态
    setTargetImage(null);
    setBatchTargetImage(null);
    
    // 设置风格预览
    if (isBatchMode) {
      setBatchTargetImagePreview(template.url);
    } else {
      setTargetImagePreview(template.url);
    }
  };

  // 清除风格选择
  const clearTemplateSelection = () => {
    setSelectedTemplate(null);
    setTargetImagePreview(null);
    setBatchTargetImagePreview(null);
  };

  // 页面加载时加载风格和历史结果
  useEffect(() => {
    loadMeituanTemplates(); // 默认加载美团风格
    
    // 加载历史批量结果
    const saved = localStorage.getItem('backgroundFusionBatchResults');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistoricalBatchResults(parsed);
      } catch (error) {
        console.error('Failed to parse saved batch results:', error);
      }
    }
  }, []);

  // 保存批量结果到localStorage
  const saveBatchResults = (results: any[], skipStorage = false) => {
    // Vercel模式下跳过localStorage保存(base64数据太大)
    if (skipStorage) {
      console.log('跳过localStorage保存(Vercel模式)');
      return;
    }

    try {
      localStorage.setItem('backgroundFusionBatchResults', JSON.stringify(results));
    } catch (error) {
      console.warn('保存到localStorage失败(可能是配额超出):', error);
      // 降级方案: 只保存元数据
      try {
        const metadataOnly = results.map(r => ({
          ...r,
          imageUrl: r.imageUrl?.startsWith('data:') ? '[base64-data-too-large]' : r.imageUrl
        }));
        localStorage.setItem('backgroundFusionBatchResults', JSON.stringify(metadataOnly));
      } catch (secondError) {
        console.error('保存元数据也失败:', secondError);
      }
    }
  };

  // 清除历史结果
  const clearHistoricalResults = () => {
    setHistoricalBatchResults([]);
    localStorage.removeItem('backgroundFusionBatchResults');
  };

  // 处理文件上传
  const handleFileUpload = (files: FileList | null, type: 'source' | 'target' | 'batchSource' | 'batchTarget') => {
    if (!files) return;

    if (type === 'batchSource') {
      const newFiles = Array.from(files).slice(0, 10); // 最多10张
      setSourceImages(prev => [...prev, ...newFiles].slice(0, 10));
      
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setSourceImagePreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    } else {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        
        switch (type) {
          case 'source':
            setSourceImage(file);
            setSourceImagePreview(result);
            break;
          case 'target':
            setTargetImage(file);
            setTargetImagePreview(result);
            // 清除风格选择
            setSelectedTemplate(null);
            break;
          case 'batchTarget':
            setBatchTargetImage(file);
            setBatchTargetImagePreview(result);
            // 清除风格选择
            setSelectedTemplate(null);
            break;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 移除批量源图片
  const removeBatchSourceImage = (index: number) => {
    setSourceImages(prev => prev.filter((_, i) => i !== index));
    setSourceImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 轮询任务状态
  const pollJobStatus = async (jobId: string, fileNames?: string[]) => {
    // 如果提供了文件名数组，保存它
    if (fileNames) {
      console.log('pollJobStatus - 保存原始文件名:', fileNames);
      fileNamesRef.current = fileNames;
    }

    const maxAttempts = 180; // 最多轮询3分钟 (180秒)
    let attempts = 0;

    const poll = async () => {
      attempts++;

      try {
        console.log(`轮询第${attempts}次，作业ID: ${jobId}`);
        const response = await fetch(`/api/jobs/${jobId}`);

        if (!response.ok) {
          console.error(`轮询失败，HTTP状态: ${response.status}`);
          throw new Error(`HTTP ${response.status}`);
        }

        const apiResponse = await response.json();

        if (apiResponse.ok && apiResponse.job) {
          const job = apiResponse.job;

          console.log(`轮询第${attempts}次，任务状态:`, job.status, '进度:', job.progress);

          setProgress(job.progress || 0);

          if (job.status === 'succeeded') {
            console.log('任务成功完成，结果:', job.result);
            if (isBatchMode) {
              // 批量模式：为每个结果添加sourceFileName
              const results = job.result || [];
              console.log('处理批量结果 - 原始结果:', results);
              console.log('处理批量结果 - 文件名数组 (ref):', fileNamesRef.current);

              const resultsWithFileName = results.map((r: any) => {
                const sourceIndex = r.sourceImageIndex !== undefined ? r.sourceImageIndex : 0;
                const originalFileName = fileNamesRef.current[sourceIndex];
                console.log(`批量结果 ${sourceIndex}: sourceIndex=${sourceIndex}, fileName=${originalFileName}`);

                return {
                  ...r,
                  sourceFileName: originalFileName,
                };
              });

              console.log('处理批量结果 - 添加文件名后:', resultsWithFileName);

              setBatchResults(resultsWithFileName);
              // 清空历史记录，只显示当前批次的结果
              setHistoricalBatchResults([]);
              // 保存当前批次结果到本地存储
              saveBatchResults(resultsWithFileName);
            } else {
              // 单张模式：保存结果URL到state，文件名已保存在ref中
              setResult(job.result?.imageUrl || job.result);
            }
            setIsProcessing(false);
            setStatusMessage('处理完成！');
            setCurrentJobId(null);
            return; // 成功完成，停止轮询
          } else if (job.status === 'failed') {
            console.log('任务失败:', job.error);
            setIsProcessing(false);
            setStatusMessage(`处理失败：${job.error || '未知错误'}`);
            setCurrentJobId(null);
            return; // 失败，停止轮询
          } else if (job.status === 'running') {
            setStatusMessage('AI正在智能分析图片并进行背景融合，请耐心等待...');
          } else {
            setStatusMessage('等待处理...');
          }
        }

        // 继续轮询
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000); // 统一使用1秒间隔
        } else {
          setIsProcessing(false);
          setStatusMessage('处理超时，请重试');
          setCurrentJobId(null);
        }

      } catch (error) {
        console.error('轮询任务状态失败:', error);

        // 继续轮询（网络错误可能是临时的）
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // 网络错误时稍微延长间隔
        } else {
          setIsProcessing(false);
          setStatusMessage('网络错误，请重试');
          setCurrentJobId(null);
        }
      }
    };

    poll();
  };

  // 处理背景融合
  const handleBackgroundFusion = async () => {
    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('正在上传图片...');
    setResult(null);
    setBatchResults([]);

    try {
      if (isBatchMode) {
        // 批量模式：串行处理每张图片（避免响应体过大）
        console.log(`开始批量处理 ${sourceImages.length} 张图片（串行模式）`);

        const results: any[] = [];
        let successCount = 0;
        let failedCount = 0;

        for (let i = 0; i < sourceImages.length; i++) {
          try {
            // 更新进度
            const progress = Math.round(((i + 1) / sourceImages.length) * 100);
            setProgress(progress);
            setStatusMessage(`处理第 ${i + 1}/${sourceImages.length} 张图片...`);

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
            const response = await fetch('/api/background-fusion', {
              method: 'POST',
              body: singleFormData,
            });

            const data = await response.json();

            if (data.ok && data.data && data.data.imageUrl) {
              // 处理成功
              const result = {
                status: 'success' as const,  // ← 添加status字段
                imageUrl: data.data.imageUrl,
                width: data.data.width,
                height: data.data.height,
                sourceImageIndex: i,
                sourceFileName: sourceImages[i].name,
              };

              results.push(result);
              successCount++;

              console.log(`✓ 第 ${i + 1} 张处理成功`);
            } else {
              throw new Error(data.error || '处理失败');
            }

          } catch (error) {
            failedCount++;
            console.error(`✗ 第 ${i + 1} 张处理失败:`, error);

            // 将失败的结果也添加到数组中
            results.push({
              status: 'failed' as const,
              sourceImageIndex: i,
              sourceFileName: sourceImages[i].name,
              error: error instanceof Error ? error.message : '未知错误',
            });
          }
        }

        // 所有图片处理完成
        setIsProcessing(false);
        setBatchResults(results);
        saveBatchResults(results, true); // skipStorage=true for Vercel
        setProgress(100);
        setStatusMessage(`批量处理完成！成功: ${successCount}/${sourceImages.length}${failedCount > 0 ? `, 失败: ${failedCount}` : ''}`);

      } else {
        // 单张模式
        const fileNames = [sourceImage!.name];
        const formData = new FormData();

        formData.append('sourceImage', sourceImage!);

        if (selectedTemplate) {
          formData.append('targetImageUrl', selectedTemplate.url);
        } else {
          formData.append('targetImage', targetImage!);
        }

        const response = await fetch('/api/background-fusion', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        console.log('API响应:', data);

        if (response.ok) {
          // 检测是同步结果(Vercel)还是异步任务(本地)
          if (data.ok && data.data) {
            // Vercel同步模式: 直接显示结果
            console.log('检测到Vercel同步模式响应');
            setIsProcessing(false);
            fileNamesRef.current = fileNames;
            setResult(data.data.imageUrl);
            setStatusMessage('处理完成！');
            setProgress(100);
          } else if (data.jobId) {
            // 本地异步模式: 轮询作业状态
            console.log('检测到本地异步模式，开始轮询作业:', data.jobId);
            setCurrentJobId(data.jobId);
            setStatusMessage('任务已创建，开始处理...');
            pollJobStatus(data.jobId, fileNames);
          } else {
            throw new Error('无效的API响应格式');
          }
        } else {
          throw new Error(data.error || '处理失败');
        }
      }
    } catch (error) {
      console.error('背景融合失败:', error);
      setIsProcessing(false);
      setStatusMessage(`处理失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 下载图片
  const downloadImage = async (url: string, filename: string) => {
    try {
      // 动态导入下载工具函数 - 兼容 Web 和 Tauri 环境
      const { downloadRemoteImage } = await import('@/lib/image-download');
      await downloadRemoteImage(url, filename);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    }
  };

  // 批量下载所有图片 - Tauri环境只弹一次对话框
  const downloadAllImages = async () => {
    const successResults = [...batchResults, ...historicalBatchResults].filter(result => result.status === 'success');

    if (successResults.length === 0) {
      alert('没有可下载的图片');
      return;
    }

    try {
      const { downloadRemoteImagesBatch } = await import('@/lib/image-download');

      // 准备批量下载的图片列表
      const images = successResults.map((result, index) => ({
        url: result.imageUrl,
        filename: result.sourceFileName || `background-fusion-${index + 1}.jpg`
      }));

      // 调用批量下载函数（Tauri环境只弹一次文件夹选择框）
      const { success, failed } = await downloadRemoteImagesBatch(images);

      console.log(`批量下载完成: 成功 ${success}/${images.length}, 失败 ${failed}`);
    } catch (error) {
      console.error('批量下载失败:', error);
      alert('批量下载失败: ' + (error instanceof Error ? error.message : '未知错误'));
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
              <h1 className="text-2xl font-bold text-gray-800">背景融合工具</h1>
            </div>
            <p className="text-gray-600">将源图片中的美食完美融合到目标背景中，创造令人垂涎的视觉效果</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* 左侧 - 配置区域 */}
          <div className="xl:col-span-2 space-y-6">
            <BatchModeToggle
              isBatchMode={isBatchMode}
              onToggle={(mode) => setIsBatchMode(mode)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SourceImageUpload
                isBatchMode={isBatchMode}
                sourceImage={sourceImage}
                sourceImagePreview={sourceImagePreview || ''}
                onFileUpload={handleFileUpload}
                sourceImages={sourceImages}
                sourceImagePreviews={sourceImagePreviews}
                onRemoveBatchImage={removeBatchSourceImage}
              />

              <TargetImageUpload
                isBatchMode={isBatchMode}
                showTemplateSelector={showTemplateSelector}
                currentPlatform={currentPlatform}
                selectedTemplate={selectedTemplate}
                meituanTemplates={meituanTemplates}
                elemeTemplates={elemeTemplates}
                loadingTemplates={loadingTemplates}
                onLoadMeituanTemplates={loadMeituanTemplates}
                onLoadElemeTemplates={loadElemeTemplates}
                onSelectTemplate={selectTemplate}
                onClearTemplateSelection={clearTemplateSelection}
                onShowTemplateSelector={setShowTemplateSelector}
                targetImage={targetImage}
                targetImagePreview={targetImagePreview || ''}
                batchTargetImage={batchTargetImage}
                batchTargetImagePreview={batchTargetImagePreview || ''}
                onFileUpload={handleFileUpload}
              />
            </div>

            {/* 开始处理按钮 */}
            <div className="flex justify-center">
              <Button
                onClick={handleBackgroundFusion}
                disabled={!canStartProcessing || isProcessing}
                size="lg"
                className="min-w-[200px] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {isProcessing ? '处理中...' : '开始背景融合'}
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>

          {/* 右侧 - 状态和结果区域 */}
          <div className="space-y-6">
            <ProcessingStatus
              isProcessing={isProcessing}
              statusMessage={statusMessage}
              progress={progress}
            />

            <ResultDisplay
              isBatchMode={isBatchMode}
              result={result}
              onDownloadSingle={() => {
                const filename = fileNamesRef.current[0] || 'background-fusion-result.jpg';
                console.log('单张下载 - 使用文件名:', filename);
                downloadImage(result!, filename);
              }}
              batchResults={batchResults}
              historicalBatchResults={historicalBatchResults}
              onDownloadAll={downloadAllImages}
              onClearHistorical={clearHistoricalResults}
              onDownloadBatchImage={(imageUrl, filename, index) => {
                console.log(`批量单张下载 - 第${index + 1}张，使用文件名:`, filename);
                downloadImage(imageUrl, filename);
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
