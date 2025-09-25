'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeftIcon, UploadIcon, ArrowRightIcon, DownloadIcon, RefreshCwIcon, GridIcon, ToggleLeftIcon, ToggleRightIcon, XIcon, SparklesIcon, TrashIcon } from 'lucide-react';
import Link from 'next/link';

interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  progress: number;
  error?: string;
  result?: {
    imageUrl?: string;
    width?: number;
    height?: number;
    processedCount?: number;
    results?: Array<{
      sourceImageIndex: number;
      imageUrl?: string;
      width?: number;
      height?: number;
      error?: string;
      originalSourceType: string;
    }>;
  };
}

export default function FoodReplacementPage() {
  // 模式状态
  const [isBatchMode, setIsBatchMode] = useState(false);

  // 单张模式状态
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [targetImage, setTargetImage] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string>('');
  const [targetImagePreview, setTargetImagePreview] = useState<string>('');

  // 批量模式状态
  const [sourceImages, setSourceImages] = useState<File[]>([]);
  const [sourceImagePreviews, setSourceImagePreviews] = useState<string[]>([]);
  const [batchTargetImage, setBatchTargetImage] = useState<File | null>(null);
  const [batchTargetImagePreview, setBatchTargetImagePreview] = useState<string>('');

  // 共用状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [shouldStopPolling, setShouldStopPolling] = useState(false);
  const [completedResults, setCompletedResults] = useState<any[]>([]);

  // 模板相关状态
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // 持久化存储key
  const STORAGE_KEY = 'food-replacement-results';

  // 页面加载时恢复之前的结果
  useEffect(() => {
    console.log('useEffect triggered for localStorage restoration');
    if (typeof window !== 'undefined') {
      const savedResults = localStorage.getItem(STORAGE_KEY);
      console.log('Retrieved from localStorage:', savedResults);
      if (savedResults) {
        try {
          const parsedResults = JSON.parse(savedResults);
          console.log('Parsed results:', parsedResults);
          console.log('Setting completedResults to:', parsedResults);
          setCompletedResults(parsedResults);
        } catch (error) {
          console.error('Failed to parse saved results:', error);
        }
      }
    }
  }, []);

  // 保存结果到localStorage
  const saveResultsToStorage = (results: any[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    }
  };

  // 清除历史结果
  const clearHistoryResults = () => {
    setCompletedResults([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // 加载模板列表
  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/templates');
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

    // 保持在模板选择模式，不关闭选择器
    // setShowTemplateSelector(false);
  };

  // 清除模板选择
  const clearTemplateSelection = () => {
    setSelectedTemplate(null);
    setTargetImagePreview(null);
    setBatchTargetImagePreview(null);
  };

  // 单张模式 - 源图片上传
  const onSourceImageDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSourceImage(file);
      const reader = new FileReader();
      reader.onload = () => setSourceImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  // 单张模式 - 目标图片上传
  const onTargetImageDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setTargetImage(file);
      const reader = new FileReader();
      reader.onload = () => setTargetImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  // 批量模式 - 多张源图片上传
  const onBatchSourceImagesDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...sourceImages, ...acceptedFiles].slice(0, 10); // 最多10张
    setSourceImages(newFiles);

    // 生成预览
    const newPreviews: string[] = [];
    newFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        newPreviews[index] = reader.result as string;
        if (newPreviews.length === newFiles.length) {
          setSourceImagePreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [sourceImages]);

  // 批量模式 - 目标图片上传
  const onBatchTargetImageDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setBatchTargetImage(file);
      const reader = new FileReader();
      reader.onload = () => setBatchTargetImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  // 移除批量模式中的源图片
  const removeBatchSourceImage = useCallback((index: number) => {
    const newFiles = sourceImages.filter((_, i) => i !== index);
    const newPreviews = sourceImagePreviews.filter((_, i) => i !== index);
    setSourceImages(newFiles);
    setSourceImagePreviews(newPreviews);
  }, [sourceImages, sourceImagePreviews]);

  // 单张模式的dropzone配置
  const sourceDropzone = useDropzone({
    onDrop: onSourceImageDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const targetDropzone = useDropzone({
    onDrop: onTargetImageDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  // 批量模式的dropzone配置
  const batchSourceDropzone = useDropzone({
    onDrop: onBatchSourceImagesDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const batchTargetDropzone = useDropzone({
    onDrop: onBatchTargetImageDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const pollJobStatus = async (jobId: string) => {
    let pollAttempts = 0;
    const maxAttempts = 300; // 10分钟最大轮询时间（每2秒一次）

    const poll = async () => {
      if (shouldStopPolling) {
        console.log('Polling stopped by flag');
        return;
      }

      pollAttempts++;
      if (pollAttempts > maxAttempts) {
        console.log('Max polling attempts reached');
        setIsProcessing(false);
        setShouldStopPolling(true);
        return;
      }

      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        
        if (response.status === 404) {
          console.log(`Job ${jobId} not found (attempt ${pollAttempts})`);
          // 增加容错性：更多尝试次数，防止作业被过早清理导致的404
          if (pollAttempts > 30) { // 从10增加到30次
            console.log('Job may have completed and been cleaned up, stopping polling');
            setIsProcessing(false);
            setShouldStopPolling(true);
            return;
          }
          // 404时等待更长时间再重试
          setTimeout(poll, 3000); // 从2秒增加到3秒
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const apiResponse = await response.json();
        
        if (apiResponse.ok && apiResponse.data) {
          const status: JobStatus = apiResponse.data;
          setJobStatus(status);

          if (status.status === 'succeeded') {
            setIsProcessing(false);
            setShouldStopPolling(true);

            // 处理批量模式的结果
            if (isBatchMode && status.result?.results) {
              const newResults = status.result.results;
              setCompletedResults(newResults);
              saveResultsToStorage(newResults);
              console.log(`Batch food replacement completed: ${status.result.processedCount} images processed`);
            } else {
              console.log('Food replacement completed successfully');
            }
            return;
          } else if (status.status === 'failed') {
            setIsProcessing(false);
            setShouldStopPolling(true);
            console.log('Food replacement failed:', status.error);
            return;
          }
        }

        setTimeout(poll, 2000);
      } catch (error) {
        console.error('Polling error:', error);
        setTimeout(poll, 2000);
      }
    };

    setTimeout(poll, 1000);
  };

  const handleFoodReplacement = async () => {
    // 验证输入
    if (isBatchMode) {
      if (sourceImages.length === 0) {
        alert('请上传至少一张源图片');
        return;
      }
      if (!batchTargetImage && !selectedTemplate) {
        alert('请上传目标图片或选择模板');
        return;
      }
    } else {
      if (!sourceImage) {
        alert('请上传源图片');
        return;
      }
      if (!targetImage && !selectedTemplate) {
        alert('请上传目标图片或选择模板');
        return;
      }
    }

    setIsProcessing(true);
    // 在批量模式下清空之前的结果，单张模式下保留之前的结果
    if (isBatchMode) {
      setJobStatus(null);
      setCompletedResults([]);
    } else {
      setJobStatus(null);
    }
    setShouldStopPolling(false);

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

      const apiEndpoint = isBatchMode ? '/api/food-replacement/batch' : '/api/food-replacement';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Food replacement failed');
      }

      const { jobId } = await response.json();
      pollJobStatus(jobId);
    } catch (error) {
      console.error('Food replacement failed:', error);
      alert('食物替换失败，请重试');
      setIsProcessing(false);
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 批量下载所有成功的图片
  const downloadAllImages = () => {
    const successfulResults = completedResults.filter(result => result.imageUrl);

    if (successfulResults.length === 0) {
      alert('没有可下载的图片');
      return;
    }

    // 逐个下载图片
    successfulResults.forEach((result, index) => {
      setTimeout(() => {
        downloadImage(result.imageUrl!, `food-replacement-batch-${index + 1}.png`);
      }, index * 500); // 每500ms下载一张，避免浏览器阻止
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 头部导航 */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">食物替换工具</h1>
            <p className="text-gray-600 mt-1">将源图片中的食物智能替换到目标图片的碗中</p>
          </div>
        </div>

        {/* 模式切换 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GridIcon className="w-5 h-5" />
              处理模式
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{isBatchMode ? '批量模式' : '单张模式'}</p>
                <p className="text-sm text-gray-500">
                  {isBatchMode ? '上传多张源图片批量处理' : '上传单张源图片处理'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsBatchMode(!isBatchMode);
                  // 清空所有状态
                  setSourceImage(null);
                  setTargetImage(null);
                  setSourceImagePreview('');
                  setTargetImagePreview('');
                  setSourceImages([]);
                  setSourceImagePreviews([]);
                  setBatchTargetImage(null);
                  setBatchTargetImagePreview('');
                  setJobStatus(null);
                  setCompletedResults([]);
                }}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {isBatchMode ? (
                  <ToggleRightIcon className="w-6 h-6 text-blue-500" />
                ) : (
                  <ToggleLeftIcon className="w-6 h-6 text-gray-400" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 功能说明 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              功能说明
            </CardTitle>
            <CardDescription>
              {isBatchMode
                ? '批量模式：上传多张源图片和一张目标图片，AI将逐一将每张源图片中的食物替换到目标图片的碗中'
                : '单张模式：上传一张源图片和一张目标图片，AI将智能地将源图片中的食物替换到目标图片的碗中'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">步骤1</Badge>
                <span>{isBatchMode ? '上传多张包含食物的源图片' : '上传包含食物的源图片'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">步骤2</Badge>
                <span>上传包含目标碗的图片</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">步骤3</Badge>
                <span>{isBatchMode ? 'AI批量合成替换结果' : 'AI智能合成替换结果'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 图片上传区域 */}
        {isBatchMode ? (
          // 批量模式布局
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 多张源图片上传 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">源图片 (食物来源)</CardTitle>
                <CardDescription>上传多张包含要提取食物的图片 (最多10张)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  {...batchSourceDropzone.getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    batchSourceDropzone.isDragActive
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-300 hover:border-orange-400'
                  }`}
                >
                  <input {...batchSourceDropzone.getInputProps()} />
                  <UploadIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div>
                    <p className="text-lg font-medium">上传源图片</p>
                    <p className="text-sm text-gray-500">
                      拖拽多张图片到此处或点击选择
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      支持 JPEG、PNG、WebP，最大 10MB，最多10张
                    </p>
                  </div>
                </div>

                {/* 已上传的源图片预览 */}
                {sourceImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">已上传 {sourceImages.length} 张源图片：</p>
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {sourceImagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`源图片 ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => removeBatchSourceImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {sourceImages[index]?.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 目标图片上传 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">目标图片 (碗的位置)</CardTitle>
                <CardDescription>上传包含目标碗的图片或选择模板</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 选择方式按钮 */}
                <div className="flex gap-2">
                  <Button
                    variant={!showTemplateSelector ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowTemplateSelector(false);
                      clearTemplateSelection();
                    }}
                  >
                    <UploadIcon className="w-4 h-4 mr-2" />
                    上传图片
                  </Button>
                  <Button
                    variant={showTemplateSelector ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowTemplateSelector(true);
                      if (templates.length === 0) {
                        loadTemplates();
                      }
                    }}
                  >
                    <GridIcon className="w-4 h-4 mr-2" />
                    选择模板
                  </Button>
                </div>

                {!showTemplateSelector ? (
                  /* 上传图片模式 */
                  <div
                    {...batchTargetDropzone.getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      batchTargetDropzone.isDragActive
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-300 hover:border-orange-400'
                    }`}
                  >
                    <input {...batchTargetDropzone.getInputProps()} />
                    {batchTargetImagePreview && !selectedTemplate ? (
                      <div className="space-y-4">
                        <img
                          src={batchTargetImagePreview}
                          alt="目标图片预览"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <p className="text-sm text-gray-600">{batchTargetImage?.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <UploadIcon className="w-12 h-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-lg font-medium">上传目标图片</p>
                          <p className="text-sm text-gray-500">
                            拖拽图片到此处或点击选择
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            支持 JPEG、PNG、WebP，最大 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 模板选择模式 */
                  <div className="space-y-4">
                    {selectedTemplate ? (
                      <div className="space-y-4">
                        <img
                          src={selectedTemplate.url}
                          alt={`模板: ${selectedTemplate.name}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            已选择模板: {selectedTemplate.name}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearTemplateSelection}
                          >
                            <XIcon className="w-4 h-4 mr-1" />
                            重新选择
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {loadingTemplates ? (
                          <div className="text-center py-8">
                            <RefreshCwIcon className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                            <p className="text-sm text-gray-500">加载模板中...</p>
                          </div>
                        ) : templates.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {templates.map((template) => (
                              <div
                                key={template.id}
                                className="relative group cursor-pointer"
                                onClick={() => selectTemplate(template)}
                              >
                                <img
                                  src={template.url}
                                  alt={template.name}
                                  className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-colors"
                                  onError={(e) => {
                                    console.error('Template image failed to load:', template.url);
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                  }}
                                />
                                <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                                  <Button
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 scale-75"
                                  >
                                    选择
                                  </Button>
                                </div>
                                <p className="text-xs text-center text-gray-500 mt-1 truncate">
                                  {template.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <GridIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">暂无可用模板</p>
                            <p className="text-xs text-gray-400 mt-1">
                              请将模板图片放入"目标图片模板"文件夹
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // 单张模式布局
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* 源图片上传 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">源图片 (食物来源)</CardTitle>
                <CardDescription>上传包含要提取食物的图片</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...sourceDropzone.getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    sourceDropzone.isDragActive
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-300 hover:border-orange-400'
                  }`}
                >
                  <input {...sourceDropzone.getInputProps()} />
                  {sourceImagePreview ? (
                    <div className="space-y-4">
                      <img
                        src={sourceImagePreview}
                        alt="源图片预览"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <p className="text-sm text-gray-600">{sourceImage?.name}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <UploadIcon className="w-12 h-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-medium">上传源图片</p>
                        <p className="text-sm text-gray-500">
                          拖拽图片到此处或点击选择
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          支持 JPEG、PNG、WebP，最大 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 箭头指示 */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <ArrowRightIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">食物替换</p>
              </div>
            </div>

            {/* 目标图片上传 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">目标图片 (碗的位置)</CardTitle>
                <CardDescription>上传包含目标碗的图片或选择模板</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 选择方式按钮 */}
                <div className="flex gap-2">
                  <Button
                    variant={!showTemplateSelector ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowTemplateSelector(false);
                      clearTemplateSelection();
                    }}
                  >
                    <UploadIcon className="w-4 h-4 mr-2" />
                    上传图片
                  </Button>
                  <Button
                    variant={showTemplateSelector ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShowTemplateSelector(true);
                      if (templates.length === 0) {
                        loadTemplates();
                      }
                    }}
                  >
                    <GridIcon className="w-4 h-4 mr-2" />
                    选择模板
                  </Button>
                </div>

                {!showTemplateSelector ? (
                  /* 上传图片模式 */
                  <div
                    {...targetDropzone.getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      targetDropzone.isDragActive
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-300 hover:border-orange-400'
                    }`}
                  >
                    <input {...targetDropzone.getInputProps()} />
                    {targetImagePreview && !selectedTemplate ? (
                      <div className="space-y-4">
                        <img
                          src={targetImagePreview}
                          alt="目标图片预览"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <p className="text-sm text-gray-600">{targetImage?.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <UploadIcon className="w-12 h-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-lg font-medium">上传目标图片</p>
                          <p className="text-sm text-gray-500">
                            拖拽图片到此处或点击选择
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            支持 JPEG、PNG、WebP，最大 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* 模板选择模式 */
                  <div className="space-y-4">
                    {selectedTemplate ? (
                      <div className="space-y-4">
                        <img
                          src={selectedTemplate.url}
                          alt={`模板: ${selectedTemplate.name}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            已选择模板: {selectedTemplate.name}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearTemplateSelection}
                          >
                            <XIcon className="w-4 h-4 mr-1" />
                            重新选择
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {loadingTemplates ? (
                          <div className="text-center py-8">
                            <RefreshCwIcon className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                            <p className="text-sm text-gray-500">加载模板中...</p>
                          </div>
                        ) : templates.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {templates.map((template) => (
                              <div
                                key={template.id}
                                className="relative group cursor-pointer"
                                onClick={() => selectTemplate(template)}
                              >
                                <img
                                  src={template.url}
                                  alt={template.name}
                                  className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 hover:border-orange-400 transition-colors"
                                  onError={(e) => {
                                    console.error('Template image failed to load:', template.url);
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                  }}
                                />
                                <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                                  <Button
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 scale-75"
                                  >
                                    选择
                                  </Button>
                                </div>
                                <p className="text-xs text-center text-gray-500 mt-1 truncate">
                                  {template.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <GridIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">暂无可用模板</p>
                            <p className="text-xs text-gray-400 mt-1">
                              请将模板图片放入"目标图片模板"文件夹
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 处理按钮 */}
        <div className="flex justify-center mb-8">
          <Button
            onClick={handleFoodReplacement}
            disabled={
              isProcessing ||
              (isBatchMode
                ? (sourceImages.length === 0 || (!batchTargetImage && !selectedTemplate))
                : (!sourceImage || (!targetImage && !selectedTemplate))
              )
            }
            size="lg"
            className="px-8 py-3 text-lg"
          >
            {isProcessing ? (
              <>
                <RefreshCwIcon className="w-5 h-5 mr-2 animate-spin" />
                {isBatchMode ? '批量处理中...' : '处理中...'}
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5 mr-2" />
                {isBatchMode ? `批量食物替换 (${sourceImages.length}张)` : '开始食物替换'}
              </>
            )}
          </Button>
        </div>

        {/* 处理状态和结果 */}
        {(isProcessing || jobStatus) && (
          <Card>
            <CardHeader>
              <CardTitle>处理状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {jobStatus?.status === 'running' ? '正在处理...' : '等待处理...'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {jobStatus?.progress || 0}%
                    </span>
                  </div>
                  <Progress value={jobStatus?.progress || 0} className="w-full" />
                  <p className="text-xs text-gray-500">
                    AI正在智能分析图片并进行食物替换，请耐心等待...
                  </p>
                </div>
              )}

              {/* 批量模式历史结果显示 - 独立于当前任务状态 */}
              {console.log('Render check - isBatchMode:', isBatchMode, 'completedResults.length:', completedResults.length)}
              {isBatchMode && completedResults.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">批量处理结果</h3>
                    <Badge className="bg-green-500">
                      历史结果 {completedResults.length}张
                    </Badge>
                  </div>

                  {/* 一键下载和清除历史按钮 */}
                  {completedResults.some(result => result.imageUrl) && (
                    <div className="flex justify-center gap-3">
                      <Button
                        onClick={downloadAllImages}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        一键下载所有图片 ({completedResults.filter(result => result.imageUrl).length}张)
                      </Button>
                      <Button
                        onClick={clearHistoryResults}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="w-4 h-4 mr-2" />
                        清除历史
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {completedResults.map((result, index) => (
                      <div key={index} className="space-y-1">
                        {result.imageUrl ? (
                          <div className="relative group">
                            <img
                              src={result.imageUrl}
                              alt={`食物替换结果 ${index + 1}`}
                              className="w-full h-24 object-cover rounded-md shadow-sm hover:shadow-md transition-shadow"
                              onError={(e) => {
                                console.error(`Failed to load image: ${result.imageUrl}`);
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                                e.currentTarget.style.border = '2px dashed #d1d5db';
                              }}
                              onLoad={() => {
                                console.log(`Successfully loaded image: ${result.imageUrl}`);
                              }}
                            />
                            <Badge className="absolute top-1 right-1 bg-green-500 text-xs px-1 py-0.5">
                              ✓
                            </Badge>
                            {/* 悬停时显示下载按钮 */}
                            <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-30 transition-all duration-200 rounded-md flex items-center justify-center pointer-events-none">
                              <Button
                                onClick={() => downloadImage(result.imageUrl!, `food-replacement-${index + 1}.png`)}
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 scale-75 pointer-events-auto"
                              >
                                <DownloadIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-24 bg-red-100 border-2 border-dashed border-red-300 rounded-md flex items-center justify-center">
                            <Badge className="bg-red-500 text-xs px-1 py-0.5">
                              ✗
                            </Badge>
                          </div>
                        )}
                        <p className="text-xs text-center text-gray-500">#{index + 1}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jobStatus?.status === 'succeeded' && (
                <div className="space-y-4">
                  {isBatchMode ? (
                    // 批量模式当前任务结果显示
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">当前处理结果</h3>
                        <Badge className="bg-green-500">
                          完成 {jobStatus.result?.processedCount || 0}/{sourceImages.length}
                        </Badge>
                      </div>

                      {/* 批量模式下不显示当前任务结果，因为已经保存到历史结果中 */}
                    </div>
                  ) : (
                    // 单张模式结果显示
                    jobStatus.result?.imageUrl && (
                      <div className="space-y-4">
                        <div className="relative">
                          <img
                            src={jobStatus.result.imageUrl}
                            alt="食物替换结果"
                            className="w-full rounded-lg shadow-lg"
                          />
                          <Badge className="absolute top-2 right-2 bg-green-500">
                            替换完成
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => downloadImage(jobStatus.result!.imageUrl!, 'food-replacement-result.png')}
                            className="flex-1"
                          >
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            下载结果
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  {/* 重新开始按钮 */}
                  <Button
                    onClick={() => {
                      setJobStatus(null);
                      setIsProcessing(false);
                      setCompletedResults([]);
                      if (isBatchMode) {
                        setSourceImages([]);
                        setSourceImagePreviews([]);
                        setBatchTargetImage(null);
                        setBatchTargetImagePreview('');
                      } else {
                        setSourceImage(null);
                        setTargetImage(null);
                        setSourceImagePreview('');
                        setTargetImagePreview('');
                      }
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <RefreshCwIcon className="w-4 h-4 mr-2" />
                    重新开始
                  </Button>
                </div>
              )}

              {jobStatus?.status === 'failed' && (
                <div className="text-center py-4">
                  <p className="text-red-600 mb-2">处理失败</p>
                  <p className="text-sm text-gray-500 mb-4">
                    {jobStatus.error || '未知错误，请重试'}
                  </p>
                  <Button
                    onClick={() => {
                      setJobStatus(null);
                      setIsProcessing(false);
                    }}
                    variant="outline"
                  >
                    重试
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 使用提示 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>使用提示</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">📸 图片要求</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 源图片：清晰显示碗中的食物</li>
                  <li>• 目标图片：包含明显的碗或容器</li>
                  <li>• 建议使用高清图片，效果更佳</li>
                  <li>• 支持 JPEG、PNG、WebP 格式</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">✨ 最佳效果</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 光线条件相似的图片效果更好</li>
                  <li>• 碗的大小和角度接近时效果更自然</li>
                  <li>• 避免过于复杂的背景</li>
                  <li>• 食物边界清晰的图片处理效果更佳</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
