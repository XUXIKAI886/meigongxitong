'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ImageIcon,
  UploadIcon,
  ArrowLeftIcon,
  DownloadIcon,
  RefreshCwIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  FolderIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  GridIcon
} from 'lucide-react';

interface JobStatus {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  result?: {
    imageUrl?: string;
    width?: number;
    height?: number;
    // 批量结果
    processedCount?: number;
    outputFolder?: string;
    results?: Array<{
      index: number;
      fileName: string;
      filePath: string;
      success: boolean;
      error?: string;
    }>;
  };
  error?: string;
}

export default function ProductRefinePage() {
  const [sourceImages, setSourceImages] = useState<File[]>([]);
  const [sourceImagePreviews, setSourceImagePreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [shouldStopPolling, setShouldStopPolling] = useState(false);
  const [outputFolder, setOutputFolder] = useState<string>('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [completedResults, setCompletedResults] = useState<Array<{imageUrl: string, originalIndex: number}>>([]);

  // 产品精修预设提示词
  const refinePrompt = "Transform this food image to a 45-degree overhead angle view. Change the camera perspective to show the food from a 45-degree angle looking down. Make colors bright and vibrant, remove flaws, improve lighting, use pure white background. The food must be viewed from exactly 45 degrees above, not straight down or from the side.";

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (isBatchMode) {
      // 批量模式：支持多文件
      setSourceImages(acceptedFiles);
      const previews: string[] = [];
      acceptedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = () => {
          previews[index] = reader.result as string;
          if (previews.filter(p => p).length === acceptedFiles.length) {
            setSourceImagePreviews([...previews]);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      // 单张模式：只取第一张
      const file = acceptedFiles[0];
      if (file) {
        setSourceImages([file]);
        const reader = new FileReader();
        reader.onload = () => {
          setSourceImagePreviews([reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, [isBatchMode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: isBatchMode,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const pollJobStatus = async (jobId: string) => {
    let pollAttempts = 0;
    const maxAttempts = 150; // 5分钟最大轮询时间

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
        
        // 处理404错误（作业还未注册或已被清理）
        if (response.status === 404) {
          console.log(`Job ${jobId} not found (attempt ${pollAttempts}). Status: ${response.status}`);
          // 如果轮询次数较多，可能作业已完成并被清理，停止轮询
          if (pollAttempts > 10) {
            console.log('Job may have completed and been cleaned up, stopping polling');
            setIsProcessing(false);
            setShouldStopPolling(true);
            return;
          }
          setTimeout(poll, 2000); // 2秒后重试
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const apiResponse = await response.json();
        console.log('Raw API response:', apiResponse);

        // 处理API响应格式：{ ok: true, job: { ... } }
        if (apiResponse.ok && apiResponse.job) {
          const status: JobStatus = apiResponse.job;
          setJobStatus(status);

          console.log('Job status updated:', {
            jobId: jobId,
            status: status.status,
            progress: status.progress,
            hasResult: !!status.result,
            attempt: pollAttempts,
            shouldStopPolling: shouldStopPolling
          });

          if (status.status === 'succeeded') {
            setIsProcessing(false);
            setShouldStopPolling(true); // 设置停止标志
            console.log('Job completed with result:', status.result);

            // 在单张模式下，将结果添加到完成列表中
            if (!isBatchMode && status.result?.imageUrl) {
              setCompletedResults(prev => [...prev, {
                imageUrl: status.result!.imageUrl!,
                originalIndex: prev.length
              }]);
            }

            console.log('Polling stopped - job completed successfully');
            return; // 停止轮询
          } else if (status.status === 'failed') {
            setIsProcessing(false);
            setShouldStopPolling(true); // 设置停止标志
            console.log('Job failed:', status.error);
            return; // 停止轮询
          }
        } else {
          console.error('Unexpected API response format:', apiResponse);
        }

        // 继续轮询
        setTimeout(poll, 2000);
      } catch (error) {
        console.error('Polling error:', error);
        // 网络错误时继续重试
        setTimeout(poll, 2000);
      }
    };

    // 1秒后开始轮询，确保作业已注册
    setTimeout(poll, 1000);
  };

  const handleRefine = async () => {
    if (sourceImages.length === 0) {
      alert('请先上传产品图片');
      return;
    }

    if (isBatchMode && !outputFolder.trim()) {
      alert('批量模式下请选择输出文件夹');
      return;
    }

    setIsProcessing(true);
    // 在批量模式下清空之前的结果，单张模式下保留之前的结果
    if (isBatchMode) {
      setJobStatus(null);
      setCompletedResults([]);
    } else {
      setJobStatus(null); // 只清空当前任务状态，不清空完成的结果
    }
    setShouldStopPolling(false); // 重置停止标志

    try {
      const formData = new FormData();

      if (isBatchMode) {
        // 批量模式
        sourceImages.forEach((image, index) => {
          formData.append(`sourceImages`, image);
        });
        formData.append('outputFolder', outputFolder);
        formData.append('isBatch', 'true');
      } else {
        // 单张模式
        formData.append('sourceImage', sourceImages[0]);
      }

      formData.append('prompt', refinePrompt);

      const apiEndpoint = isBatchMode ? '/api/product-refine/batch' : '/api/product-refine';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('精修请求失败');
      }

      const responseData = await response.json();

      // 检测同步响应 (Vercel) vs 异步响应 (本地)
      if (responseData.ok && responseData.data) {
        // Vercel 同步模式: 直接使用返回的结果
        console.log('检测到同步响应(Vercel模式),直接使用结果:', responseData.data);

        setJobStatus({
          id: 'vercel-sync',
          status: 'succeeded',
          progress: 100,
          result: responseData.data,
        });
        setIsProcessing(false);

        // 在单张模式下，将结果添加到完成列表中
        if (!isBatchMode && responseData.data.imageUrl) {
          setCompletedResults(prev => [...prev, {
            imageUrl: responseData.data.imageUrl,
            originalIndex: prev.length
          }]);
        }
      } else if (responseData.jobId) {
        // 本地异步模式: 使用 jobId 轮询
        console.log('检测到异步响应(本地模式),开始轮询 jobId:', responseData.jobId);
        pollJobStatus(responseData.jobId);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('精修失败:', error);
      alert('精修失败，请重试');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">产品精修</h1>
            <p className="text-gray-600 mt-1">商业级产品图片精修，提升质感和高级感</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：上传区域 */}
          <div className="space-y-6">
            {/* 模式切换 */}
            <Card>
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
                      {isBatchMode ? '上传多张图片批量处理' : '上传单张图片处理'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsBatchMode(!isBatchMode);
                      setSourceImages([]);
                      setSourceImagePreviews([]);
                      setOutputFolder('');
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

            {/* 批量模式下的文件夹选择 */}
            {isBatchMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderIcon className="w-5 h-5" />
                    输出文件夹
                  </CardTitle>
                  <CardDescription>
                    选择精修后图片的保存位置。可以手动输入路径，点击"选择"按钮，或使用下方快速预设
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={outputFolder}
                        onChange={(e) => setOutputFolder(e.target.value)}
                        placeholder="例如: D:/精修图片 或 ./精修图片"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    <Button
                      onClick={() => {
                        // 提供预设文件夹选项
                        const presetFolders = [
                          'D:/精修图片',
                          'C:/Users/Desktop/精修图片',
                          './精修图片',
                          '精修图片'
                        ];

                        const selectedFolder = prompt(
                          '请输入输出文件夹路径，或选择以下预设：\n\n' +
                          presetFolders.map((folder, index) => `${index + 1}. ${folder}`).join('\n') +
                          '\n\n直接输入路径或输入数字选择预设：',
                          outputFolder || 'D:/精修图片'
                        );

                        if (selectedFolder !== null) {
                          // 检查是否是数字选择
                          const num = parseInt(selectedFolder.trim());
                          if (!isNaN(num) && num >= 1 && num <= presetFolders.length) {
                            setOutputFolder(presetFolders[num - 1]);
                          } else if (selectedFolder.trim()) {
                            setOutputFolder(selectedFolder.trim());
                          }
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <FolderIcon className="w-4 h-4 mr-2" />
                      选择
                    </Button>
                    </div>

                    {/* 快速选择预设文件夹 */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: '桌面', path: 'C:/Users/Desktop/精修图片' },
                        { label: 'D盘', path: 'D:/精修图片' },
                        { label: '当前目录', path: './精修图片' },
                        { label: '下载文件夹', path: 'C:/Users/Downloads/精修图片' }
                      ].map((preset, index) => (
                        <Button
                          key={index}
                          onClick={() => setOutputFolder(preset.path)}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>

                    {outputFolder && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        💡 提示: 如果文件夹不存在，系统会自动创建
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 图片上传 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadIcon className="w-5 h-5" />
                  上传产品图片
                </CardTitle>
                <CardDescription>
                  支持 JPG、PNG、WebP 格式，最大 10MB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  {sourceImagePreviews.length > 0 ? (
                    <div className="space-y-4">
                      {isBatchMode ? (
                        <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                          {sourceImagePreviews.map((preview, index) => (
                            <div key={index} className="relative">
                              <img
                                src={preview}
                                alt={`图片 ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg shadow-md"
                              />
                              <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <img
                          src={sourceImagePreviews[0]}
                          alt="源图片预览"
                          className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                        />
                      )}
                      <p className="text-sm text-gray-600">
                        {isBatchMode
                          ? `已选择 ${sourceImages.length} 张图片，点击或拖拽更换`
                          : '点击或拖拽更换图片'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
                      <div>
                        <p className="text-lg font-medium text-gray-700">
                          {isDragActive ? '放开以上传图片' : '点击或拖拽上传产品图片'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          支持 JPG、PNG、WebP 格式
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 精修说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5" />
                  精修效果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span className="text-sm">统一45度角视角，保持一致性</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span className="text-sm">保持菜品完整性，不裁剪边缘</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span className="text-sm">去除瑕疵、划痕、污渍</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span className="text-sm">增强光影立体感和层次感</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span className="text-sm">大幅增强色彩鲜艳度，避免暗淡</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span className="text-sm">明亮温暖光线，突出新鲜感</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span className="text-sm">纯白色专业背景</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 开始精修按钮 */}
            <Button
              onClick={handleRefine}
              disabled={sourceImages.length === 0 || isProcessing || (isBatchMode && !outputFolder.trim())}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <RefreshCwIcon className="w-5 h-5 mr-2 animate-spin" />
                  {isBatchMode ? '批量精修中...' : '精修中...'}
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5 mr-2" />
                  {isBatchMode ? `批量精修 (${sourceImages.length}张)` : '开始精修'}
                </>
              )}
            </Button>
          </div>

          {/* 右侧：结果展示 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>精修结果</CardTitle>
                <CardDescription>
                  AI将为您的产品图片进行专业级精修处理
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isProcessing && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">处理进度</span>
                      <span className="text-sm text-gray-500">
                        {jobStatus?.progress || 0}%
                      </span>
                    </div>
                    <Progress value={jobStatus?.progress || 0} className="w-full" />
                    <p className="text-sm text-gray-600 text-center">
                      {isBatchMode
                        ? `正在批量精修 ${sourceImages.length} 张图片，请稍候...`
                        : '正在进行商业级精修处理，请稍候...'
                      }
                    </p>
                  </div>
                )}

                {jobStatus?.status === 'succeeded' && jobStatus.result && (
                  <div className="space-y-4">
                    {isBatchMode ? (
                      // 批量模式结果
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-green-500">
                            批量精修完成
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {jobStatus.result.processedCount}/{sourceImages.length} 张成功
                          </span>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm font-medium mb-2">输出文件夹:</p>
                          <p className="text-sm text-gray-600 break-all">{jobStatus.result.outputFolder}</p>
                        </div>

                        {jobStatus.result.results && (
                          <div className="max-h-40 overflow-y-auto">
                            <p className="text-sm font-medium mb-2">处理结果:</p>
                            {jobStatus.result.results.map((result, index) => (
                              <div key={index} className="flex items-center justify-between py-1 text-sm">
                                <span>图片 {result.index}</span>
                                {result.success ? (
                                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircleIcon className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <Button
                          onClick={() => {
                            alert(`批量精修完成！\n成功处理: ${jobStatus.result?.processedCount} 张\n保存位置: ${jobStatus.result?.outputFolder}`);
                          }}
                          className="w-full"
                        >
                          <FolderIcon className="w-4 h-4 mr-2" />
                          打开输出文件夹
                        </Button>
                      </div>
                    ) : (
                      // 单张模式结果
                      <div className="space-y-4">
                        {/* 显示当前正在处理的结果 */}
                        {jobStatus.result && (
                          <div className="relative">
                            <img
                              src={jobStatus.result.imageUrl}
                              alt="精修后的产品图片"
                              className="w-full rounded-lg shadow-lg"
                            />
                            <Badge className="absolute top-2 right-2 bg-green-500">
                              精修完成
                            </Badge>
                          </div>
                        )}

                        {/* 显示所有完成的结果 */}
                        {completedResults.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">已完成的精修图片 ({completedResults.length}张)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {completedResults.map((result, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={result.imageUrl}
                                    alt={`精修后的产品图片 ${index + 1}`}
                                    className="w-full rounded-lg shadow-lg"
                                  />
                                  <Badge className="absolute top-2 right-2 bg-green-500">
                                    图片 {index + 1}
                                  </Badge>
                                  <Button
                                    onClick={() => downloadImage(result.imageUrl, `refined-product-${index + 1}.png`)}
                                    className="absolute bottom-2 right-2"
                                    size="sm"
                                  >
                                    <DownloadIcon className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {(jobStatus.result || completedResults.length > 0) && (
                            <Button
                              onClick={() => {
                                // 下载所有图片
                                if (jobStatus.result?.imageUrl) {
                                  downloadImage(jobStatus.result.imageUrl, 'refined-product-latest.png');
                                }
                                completedResults.forEach((result, index) => {
                                  downloadImage(result.imageUrl, `refined-product-${index + 1}.png`);
                                });
                              }}
                              className="flex-1"
                            >
                              <DownloadIcon className="w-4 h-4 mr-2" />
                              下载所有图片
                            </Button>
                          )}
                          <Button
                            onClick={() => {
                              setJobStatus(null);
                              setCompletedResults([]);
                              setIsProcessing(false);
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            <RefreshCwIcon className="w-4 h-4 mr-2" />
                            清空结果
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {jobStatus?.status === 'failed' && (
                  <Alert>
                    <XCircleIcon className="h-4 w-4" />
                    <AlertDescription>
                      精修失败：{jobStatus.error || '未知错误'}
                    </AlertDescription>
                  </Alert>
                )}

                {!isProcessing && !jobStatus && (
                  <div className="text-center py-12">
                    <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">
                      {isBatchMode ? '上传多张图片后开始批量精修' : '上传图片后开始精修'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
