'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Upload, Download, Loader2, Grid, Image as ImageIcon, Trash2, ArrowLeft } from 'lucide-react';

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
  
  // 模板相关状态
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // 历史结果状态
  const [historicalBatchResults, setHistoricalBatchResults] = useState<any[]>([]);

  // 加载模板
  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/background-fusion/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 选择模板
  const selectTemplate = (template: any) => {
    setSelectedTemplate(template);
    
    // 清除上传的图片状态
    setTargetImage(null);
    setBatchTargetImage(null);
    
    // 设置模板预览
    if (isBatchMode) {
      setBatchTargetImagePreview(template.url);
    } else {
      setTargetImagePreview(template.url);
    }
  };

  // 清除模板选择
  const clearTemplateSelection = () => {
    setSelectedTemplate(null);
    setTargetImagePreview(null);
    setBatchTargetImagePreview(null);
  };

  // 页面加载时加载模板和历史结果
  useEffect(() => {
    loadTemplates();
    
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
            // 清除模板选择
            setSelectedTemplate(null);
            break;
          case 'batchTarget':
            setBatchTargetImage(file);
            setBatchTargetImagePreview(result);
            // 清除模板选择
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
  const pollJobStatus = async (jobId: string) => {
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
              setBatchResults(job.result || []);
              // 清空历史记录，只显示当前批次的结果
              setHistoricalBatchResults([]);
              // 保存当前批次结果到本地存储
              const newResults = job.result || [];
              saveBatchResults(newResults);
            } else {
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
      const formData = new FormData();
      
      if (isBatchMode) {
        // 批量模式
        sourceImages.forEach((image) => {
          formData.append('sourceImages', image);
        });
        
        if (selectedTemplate) {
          // 使用模板
          formData.append('targetImageUrl', selectedTemplate.url);
        } else {
          // 使用上传的图片
          formData.append('targetImage', batchTargetImage!);
        }
      } else {
        // 单张模式
        formData.append('sourceImage', sourceImage!);
        
        if (selectedTemplate) {
          // 使用模板
          formData.append('targetImageUrl', selectedTemplate.url);
        } else {
          // 使用上传的图片
          formData.append('targetImage', targetImage!);
        }
      }

      const endpoint = isBatchMode ? '/api/background-fusion/batch' : '/api/background-fusion';
      console.log('发送请求到:', endpoint);
      console.log('批量模式:', isBatchMode);

      const response = await fetch(endpoint, {
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

          if (isBatchMode) {
            // 批量模式结果
            setBatchResults(data.data || []);
            saveBatchResults(data.data || [], true); // skipStorage=true for Vercel
            setStatusMessage('批量处理完成！');
          } else {
            // 单张模式结果
            setResult(data.data.imageUrl);
            setStatusMessage('处理完成！');
          }
          setProgress(100);
        } else if (data.jobId) {
          // 本地异步模式: 轮询作业状态
          console.log('检测到本地异步模式，开始轮询作业:', data.jobId);
          setCurrentJobId(data.jobId);
          setStatusMessage('任务已创建，开始处理...');
          pollJobStatus(data.jobId);
        } else {
          throw new Error('无效的API响应格式');
        }
      } else {
        throw new Error(data.error || '处理失败');
      }
    } catch (error) {
      console.error('背景融合失败:', error);
      setIsProcessing(false);
      setStatusMessage(`处理失败：${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 下载图片
  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 批量下载所有图片
  const downloadAllImages = () => {
    const successResults = [...batchResults, ...historicalBatchResults].filter(result => result.status === 'success');
    
    successResults.forEach((result, index) => {
      setTimeout(() => {
        downloadImage(result.imageUrl, `background-fusion-${index + 1}.jpg`);
      }, index * 500); // 每500ms下载一张，避免浏览器阻止
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 头部导航 */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🍽️ 背景融合工具</h1>
            <p className="text-gray-600 mt-1">将源图片中的美食完美融合到目标背景中，创造令人垂涎的视觉效果</p>
          </div>
        </div>

        {/* 模式切换 */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-md">
            <button
              onClick={() => setIsBatchMode(false)}
              className={`px-6 py-2 rounded-md transition-all ${
                !isBatchMode
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-orange-500'
              }`}
            >
              单张模式
            </button>
            <button
              onClick={() => setIsBatchMode(true)}
              className={`px-6 py-2 rounded-md transition-all ${
                isBatchMode
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-orange-500'
              }`}
            >
              批量模式
            </button>
          </div>
        </div>

        {/* 功能说明 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {isBatchMode ? '批量背景融合' : '单张背景融合'}
          </h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <span className="bg-orange-100 text-orange-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
              <span>上传{isBatchMode ? '多张' : '一张'}源图片（包含美食）</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-orange-100 text-orange-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
              <span>选择目标背景（上传或选择模板）</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-orange-100 text-orange-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
              <span>AI将美食完美融合到背景中</span>
            </div>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* 源图片上传区域 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              源图片 ({isBatchMode ? '美食来源' : '美食来源'})
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {isBatchMode ? '上传包含美食的多张图片（最多10张）' : '上传包含美食的图片'}
            </p>

            {isBatchMode ? (
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files, 'batchSource')}
                  className="hidden"
                  id="batch-source-upload"
                />
                <label
                  htmlFor="batch-source-upload"
                  className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-orange-400 transition-colors"
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">上传源图片</p>
                  <p className="text-sm text-gray-500 mt-1">拖拽图片到此处或点击选择</p>
                  <p className="text-xs text-gray-400 mt-2">支持 JPEG、PNG、WebP，最大 10MB，最多10张</p>
                </label>

                {sourceImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">已选择 {sourceImages.length} 张图片：</p>
                    <div className="grid grid-cols-2 gap-2">
                      {sourceImagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`源图片 ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <button
                            onClick={() => removeBatchSourceImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                          <p className="text-xs text-gray-500 mt-1 truncate">{sourceImages[index].name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files, 'source')}
                  className="hidden"
                  id="source-upload"
                />
                <label
                  htmlFor="source-upload"
                  className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-orange-400 transition-colors"
                >
                  {sourceImagePreview ? (
                    <div>
                      <img
                        src={sourceImagePreview}
                        alt="源图片预览"
                        className="mx-auto max-h-32 rounded mb-2"
                      />
                      <p className="text-sm text-gray-600">{sourceImage?.name}</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600 font-medium">上传源图片</p>
                      <p className="text-sm text-gray-500 mt-1">拖拽图片到此处或点击选择</p>
                      <p className="text-xs text-gray-400 mt-2">支持 JPEG、PNG、WebP，最大 10MB</p>
                    </div>
                  )}
                </label>
              </div>
            )}
          </div>

          {/* 箭头指示 */}
          <div className="flex items-center justify-center">
            <div className="bg-orange-100 rounded-full p-4">
              <ImageIcon className="h-8 w-8 text-orange-600" />
            </div>
            <p className="ml-2 text-sm font-medium text-gray-600">背景融合</p>
          </div>

          {/* 目标图片上传区域 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              目标背景 (融合背景)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              上传目标背景图片或选择模板
            </p>

            {/* 模式切换按钮 */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setShowTemplateSelector(false)}
                className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                  !showTemplateSelector
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4 mr-1" />
                上传图片
              </button>
              <button
                onClick={() => {
                  setShowTemplateSelector(true);
                  if (templates.length === 0) {
                    loadTemplates();
                  }
                }}
                className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                  showTemplateSelector
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Grid className="w-4 h-4 mr-1" />
                选择模板
              </button>
            </div>

            {showTemplateSelector ? (
              // 模板选择器
              <div>
                {selectedTemplate ? (
                  <div className="text-center">
                    <img
                      src={selectedTemplate.url}
                      alt={`模板: ${selectedTemplate.name}`}
                      className="mx-auto max-h-32 rounded mb-2"
                    />
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">已选择模板: {selectedTemplate.name}</p>
                      <button
                        onClick={() => {
                          clearTemplateSelection();
                          setShowTemplateSelector(true);
                        }}
                        className="flex items-center justify-center w-full px-3 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors text-sm"
                      >
                        <Grid className="w-4 h-4 mr-1" />
                        重新选择
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {loadingTemplates ? (
                      <div className="text-center py-8">
                        <Loader2 className="mx-auto h-8 w-8 text-orange-500 animate-spin mb-2" />
                        <p className="text-sm text-gray-600">加载模板中...</p>
                      </div>
                    ) : templates.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {templates.map((template, index) => (
                          <div
                            key={index}
                            className="group relative cursor-pointer"
                            onClick={() => selectTemplate(template)}
                          >
                            <img
                              src={template.url}
                              alt={template.name}
                              className="w-full h-24 object-cover rounded border group-hover:border-orange-400 transition-colors"
                              onError={(e) => {
                                console.error('Template image failed to load:', template.url);
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                              }}
                            />
                            <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-30 rounded transition-all duration-200 flex items-center justify-center">
                              <button className="bg-orange-500 text-white px-3 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                选择
                              </button>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 truncate">{template.name}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">暂无可用模板</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // 文件上传
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files, isBatchMode ? 'batchTarget' : 'target')}
                  className="hidden"
                  id="target-upload"
                />
                <label
                  htmlFor="target-upload"
                  className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-orange-400 transition-colors"
                >
                  {(isBatchMode ? batchTargetImagePreview : targetImagePreview) ? (
                    <div>
                      <img
                        src={isBatchMode ? batchTargetImagePreview! : targetImagePreview!}
                        alt="目标图片预览"
                        className="mx-auto max-h-32 rounded mb-2"
                      />
                      <p className="text-sm text-gray-600">
                        {isBatchMode ? batchTargetImage?.name : targetImage?.name}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600 font-medium">上传目标图片</p>
                      <p className="text-sm text-gray-500 mt-1">拖拽图片到此处或点击选择</p>
                      <p className="text-xs text-gray-400 mt-2">支持 JPEG、PNG、WebP，最大 10MB</p>
                    </div>
                  )}
                </label>
              </div>
            )}
          </div>
        </div>

        {/* 处理按钮 */}
        <div className="text-center mb-8">
          <button
            onClick={handleBackgroundFusion}
            disabled={
              isProcessing ||
              (isBatchMode
                ? (sourceImages.length === 0 || (!batchTargetImage && !selectedTemplate))
                : (!sourceImage || (!targetImage && !selectedTemplate))
              )
            }
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors flex items-center justify-center mx-auto"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                处理中...
              </>
            ) : (
              <>
                <ImageIcon className="h-5 w-5 mr-2" />
                开始背景融合
              </>
            )}
          </button>
        </div>

        {/* 处理状态 */}
        {isProcessing && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">处理状态</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{statusMessage}</span>
                <span className="text-sm font-medium text-orange-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500">AI正在智能分析图片并进行背景融合，请耐心等待...</p>
            </div>
          </div>
        )}

        {/* 单张结果显示 */}
        {!isBatchMode && result && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">融合结果</h3>
            <div className="text-center">
              <img
                src={result}
                alt="背景融合结果"
                className="mx-auto max-w-full h-auto rounded-lg shadow-md mb-4"
              />
              <button
                onClick={() => downloadImage(result, 'background-fusion-result.jpg')}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center justify-center mx-auto"
              >
                <Download className="h-5 w-5 mr-2" />
                下载图片
              </button>
            </div>
          </div>
        )}

        {/* 批量结果显示 */}
        {isBatchMode && (batchResults.length > 0 || historicalBatchResults.length > 0) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                批量融合结果 ({[...batchResults, ...historicalBatchResults].filter(r => r.status === 'success').length} 张成功)
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={downloadAllImages}
                  disabled={[...batchResults, ...historicalBatchResults].filter(r => r.status === 'success').length === 0}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center text-sm"
                >
                  <Download className="h-4 w-4 mr-1" />
                  下载全部
                </button>
                {historicalBatchResults.length > 0 && (
                  <button
                    onClick={clearHistoricalResults}
                    className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center text-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    清除历史
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...batchResults, ...historicalBatchResults].map((result, index) => (
                <div key={index} className="relative">
                  {result.status === 'success' ? (
                    <div className="relative group">
                      <img
                        src={result.imageUrl}
                        alt={`融合结果 ${index + 1}`}
                        className="w-full h-32 object-cover rounded border group-hover:border-orange-400 transition-colors"
                      />
                      <div className="absolute inset-0 rounded transition-all duration-200 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0)' }}>
                        <button
                          onClick={() => downloadImage(result.imageUrl, `background-fusion-${index + 1}.jpg`)}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          下载
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">源图片 {result.sourceImageIndex + 1}</p>
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-red-100 border border-red-300 rounded flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-red-600 text-sm font-medium">处理失败</p>
                        <p className="text-red-500 text-xs mt-1">源图片 {result.sourceImageIndex + 1}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使用提示 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">使用提示</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">📸 图片要求</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 源图片：清晰显示美食，光线充足</li>
                <li>• 目标背景：适合美食展示的场景</li>
                <li>• 建议使用高清图片，效果更佳</li>
                <li>• 支持 JPEG、PNG、WebP 格式</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">✨ 最佳效果</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 光线条件相似的图片效果更好</li>
                <li>• 背景简洁时融合效果更自然</li>
                <li>• 避免过于复杂的背景纹理</li>
                <li>• 美食边界清晰的图片处理效果更佳</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
