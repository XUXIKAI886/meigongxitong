'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, ArrowRightIcon, ImageIcon } from 'lucide-react';
import { useBatchCutout } from '../food-replacement/hooks/useBatchCutout';
import BatchModeToggle from './components/BatchModeToggle';
import SourceImageUpload from './components/SourceImageUpload';
import TargetImageUpload from './components/TargetImageUpload';
import ProcessingStatus from './components/ProcessingStatus';
import ResultDisplay from './components/ResultDisplay';

/**
 * 压缩图片文件（解决Vercel 4.5MB请求体限制）
 * @param file 原始图片文件
 * @param maxWidth 最大宽度（默认1920）
 * @param maxHeight 最大高度（默认1920）
 * @param quality 压缩质量（0-1，默认0.85）
 * @returns 压缩后的Blob
 */
async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // 计算缩放比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取Canvas上下文'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('图片压缩失败'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

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

  // 批量抠图Hook
  const batchCutout = useBatchCutout();

  // 抠图结果预览URLs状态管理
  const [cutoutResultPreviews, setCutoutResultPreviews] = useState<string[]>([]);

  // 正在重新抠图的图片索引（-1表示无）
  const [recutingIndex, setRecutingIndex] = useState<number>(-1);

  // 正在重新生成的结果索引（-1表示无）
  const [regeneratingIndex, setRegeneratingIndex] = useState<number>(-1);

  // 新增：任务队列机制（确保重新抠图和重新生成操作按顺序执行）
  type TaskType = 'recut' | 'regenerate';
  interface Task {
    type: TaskType;
    index: number;
    execute: () => Promise<void>;
  }

  const taskQueueRef = useRef<Task[]>([]);
  const [isTaskExecuting, setIsTaskExecuting] = useState(false);

  // 队列执行器
  const executeNextTask = useCallback(async () => {
    if (isTaskExecuting || taskQueueRef.current.length === 0) {
      return;
    }

    const task = taskQueueRef.current.shift();
    if (!task) return;

    console.log(`[队列] 开始执行任务: ${task.type} (索引: ${task.index}), 队列剩余: ${taskQueueRef.current.length}`);
    setIsTaskExecuting(true);

    try {
      await task.execute();
      console.log(`[队列] 任务完成: ${task.type} (索引: ${task.index})`);
    } catch (error) {
      console.error(`[队列] 任务失败: ${task.type} (索引: ${task.index})`, error);
    } finally {
      setIsTaskExecuting(false);
    }
  }, [isTaskExecuting]);

  // 监听队列执行状态，自动执行下一个任务
  useEffect(() => {
    if (!isTaskExecuting && taskQueueRef.current.length > 0) {
      console.log(`[队列] 自动触发下一个任务，队列长度: ${taskQueueRef.current.length}`);
      executeNextTask();
    }
  }, [isTaskExecuting, executeNextTask]);

  // 添加任务到队列
  const addTaskToQueue = useCallback((type: TaskType, index: number, execute: () => Promise<void>) => {
    const task: Task = { type, index, execute };
    taskQueueRef.current.push(task);
    console.log(`[队列] 添加任务: ${type} (索引: ${index}), 队列长度: ${taskQueueRef.current.length}`);

    // 如果当前没有任务在执行，立即执行
    if (!isTaskExecuting) {
      executeNextTask();
    }
  }, [isTaskExecuting, executeNextTask]);

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

  // 替换批量模式中指定索引的图片（用于抠图后替换）
  const replaceBatchSourceImage = useCallback((index: number, newFile: File) => {
    setSourceImages(prevImages => {
      const newImages = [...prevImages];
      newImages[index] = newFile;
      return newImages;
    });

    // 更新预览
    const reader = new FileReader();
    reader.onload = () => {
      setSourceImagePreviews(prevPreviews => {
        const newPreviews = [...prevPreviews];
        // 释放旧预览URL（如果是blob URL）
        if (prevPreviews[index] && prevPreviews[index].startsWith('blob:')) {
          URL.revokeObjectURL(prevPreviews[index]);
        }
        newPreviews[index] = reader.result as string;
        return newPreviews;
      });
    };
    reader.readAsDataURL(newFile);
  }, []);

  // 替换单张模式的源图片（用于抠图后替换）
  const replaceSourceImage = useCallback((newFile: File) => {
    setSourceImage(newFile);

    // 更新预览
    const reader = new FileReader();
    reader.onload = () => {
      // 释放旧预览URL（如果是blob URL）
      if (sourceImagePreview && sourceImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(sourceImagePreview);
      }
      setSourceImagePreview(reader.result as string);
    };
    reader.readAsDataURL(newFile);
  }, [sourceImagePreview]);

  // 处理批量抠图（支持单张和批量模式）
  const handleBatchCutout = useCallback(async () => {
    // 单张模式：检查sourceImage
    // 批量模式：检查sourceImages数组
    const imagesToCutout = isBatchMode ? sourceImages : (sourceImage ? [sourceImage] : []);

    if (imagesToCutout.length === 0) {
      alert('请先上传源图片');
      return;
    }

    console.log(`[handleBatchCutout] 开始${isBatchMode ? '批量' : '单张'}抠图`);

    // 调用batchCutout
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

  // 应用抠图结果（支持单张和批量模式）
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

  // 重新抠图单张图片（支持单张和批量模式）- 改造为队列模式
  const handleRecutImage = useCallback(async (index: number) => {
    // 将任务加入队列
    addTaskToQueue('recut', index, async () => {
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
    });
  }, [isBatchMode, sourceImage, sourceImages, batchCutout, addTaskToQueue]);

  // 重新生成单张图片 - 改造为队列模式
  const handleRegenerateImage = useCallback(async (result: any, resultIndex: number) => {
    // 将任务加入队列
    addTaskToQueue('regenerate', resultIndex, async () => {
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

        // 3. 压缩源图片（解决Vercel 4.5MB限制）
        let imageToUpload: File | Blob = sourceImageFile;
        try {
          console.log(`开始压缩图片，原始大小: ${(sourceImageFile.size / 1024 / 1024).toFixed(2)}MB`);
          const compressedBlob = await compressImage(sourceImageFile);
          console.log(`压缩完成，压缩后大小: ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`);
          imageToUpload = new File([compressedBlob], sourceImageFile.name, { type: 'image/jpeg' });
        } catch (compressError) {
          console.warn(`图片压缩失败，使用原图:`, compressError);
          imageToUpload = sourceImageFile;
        }

        // 4. 创建FormData
        const formData = new FormData();
        formData.append('sourceImage', imageToUpload);

        if (selectedTemplate) {
          formData.append('targetImageUrl', selectedTemplate.url);
          console.log('使用模板:', selectedTemplate.name);
        } else if (targetImageFile) {
          formData.append('targetImage', targetImageFile);
          console.log('使用上传的目标图片');
        }

        // 5. 调用API
        console.log('开始调用API重新生成...');
        const response = await fetch('/api/background-fusion', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        console.log('API响应:', data);

        if (data.ok && data.data && data.data.imageUrl) {
          // Vercel同步模式: 直接更新结果
          console.log('检测到同步响应，更新结果');
          const updatedResult = {
            ...result,
            imageUrl: data.data.imageUrl,
            width: data.data.width,
            height: data.data.height,
          };

          // 更新batchResults数组
          setBatchResults(prevResults => {
            const newResults = [...prevResults];
            newResults[resultIndex] = updatedResult;
            return newResults;
          });

          console.log('✓ 重新生成成功');
        } else {
          throw new Error(data.error || '处理失败');
        }
      } catch (error) {
        console.error('[handleRegenerateImage] 重新生成失败:', error);
        alert(`重新生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        setRegeneratingIndex(-1);
      }
    });
  }, [isBatchMode, sourceImage, sourceImages, batchTargetImage, targetImage, selectedTemplate, addTaskToQueue]);

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

            // 压缩图片（解决Vercel 4.5MB限制）
            let imageToUpload: File | Blob = sourceImages[i];
            try {
              console.log(`开始压缩第 ${i + 1} 张图片，原始大小: ${(sourceImages[i].size / 1024 / 1024).toFixed(2)}MB`);
              const compressedBlob = await compressImage(sourceImages[i]);
              console.log(`压缩完成，压缩后大小: ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`);
              imageToUpload = new File([compressedBlob], sourceImages[i].name, { type: 'image/jpeg' });
            } catch (compressError) {
              console.warn(`图片压缩失败，使用原图:`, compressError);
              // 压缩失败时使用原图
              imageToUpload = sourceImages[i];
            }

            // 为每张图片创建单独的请求
            const singleFormData = new FormData();
            singleFormData.append('sourceImage', imageToUpload);

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

        // 压缩图片（解决Vercel 4.5MB限制）
        let imageToUpload: File | Blob = sourceImage!;
        try {
          console.log(`开始压缩图片，原始大小: ${(sourceImage!.size / 1024 / 1024).toFixed(2)}MB`);
          const compressedBlob = await compressImage(sourceImage!);
          console.log(`压缩完成，压缩后大小: ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`);
          imageToUpload = new File([compressedBlob], sourceImage!.name, { type: 'image/jpeg' });
        } catch (compressError) {
          console.warn(`图片压缩失败，使用原图:`, compressError);
          // 压缩失败时使用原图
          imageToUpload = sourceImage!;
        }

        const formData = new FormData();
        formData.append('sourceImage', imageToUpload);

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
      <div className="container mx-auto px-4 py-10">
        {/* 页面标题和导航 */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <Link href="/">
                <Button variant="outline" size="sm" className="transition-all hover:scale-105">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  返回首页
                </Button>
              </Link>
              <div className="h-6 border-l-2 border-gray-300"></div>
              <h1 className="text-3xl font-bold text-gray-900">背景融合工具</h1>
            </div>
            <p className="text-gray-600 text-base leading-relaxed">将源图片中的美食完美融合到目标背景中，创造令人垂涎的视觉效果</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* 左侧 - 配置区域 */}
          <div className="xl:col-span-2 space-y-8">
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
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleBackgroundFusion}
                disabled={!canStartProcessing || isProcessing}
                size="lg"
                className="min-w-[220px] h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                {isProcessing ? '处理中...' : '开始背景融合'}
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>

          {/* 右侧 - 状态和结果区域 */}
          <div className="space-y-8">
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
              onRegenerate={handleRegenerateImage}
              regeneratingIndex={regeneratingIndex}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
