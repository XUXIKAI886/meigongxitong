'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Upload, Images, Download, User, Sparkles } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface JobStatus {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  result?: {
    images: Array<{
      imageUrl: string;
      width: number;
      height: number;
    }>;
    reversePrompt?: {
      summary: string;
      prompt: string;
      originalPrompt: string;
    };
  };
  error?: string;
  // reversePrompt 在处理过程中也存储在顶层
  reversePrompt?: {
    fullResponse: string;
    summary: string;
    extractedPrompt: string;
  };
}

export default function PictureWallPage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setUploadedFile(file);
        
        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  });

  const handleGenerate = async () => {
    if (!uploadedFile) {
      alert('请上传头像');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('avatar', uploadedFile);

    try {
      const response = await fetch('/api/picture-wall', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.ok) {
        // 检测同步响应 (Vercel) vs 异步响应 (本地)
        if (data.data.images) {
          // Vercel 同步模式: 直接使用返回的结果
          console.log('检测到同步响应(Vercel模式),直接使用结果:', data.data);

          setJobStatus({
            id: 'vercel-sync',
            status: 'succeeded',
            progress: 100,
            result: data.data,
          });
          setIsProcessing(false);
        } else if (data.data.jobId) {
          // 本地异步模式: 使用 jobId 轮询
          console.log('检测到异步响应(本地模式),开始轮询 jobId:', data.data.jobId);
          pollJobStatus(data.data.jobId);
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('生成失败：' + (error as Error).message);
      setIsProcessing(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();

        if (data.ok && data.job) {
          setJobStatus(data.job);

          if (data.job.status === 'succeeded') {
            setIsProcessing(false);
          } else if (data.job.status === 'failed') {
            setIsProcessing(false);
          } else {
            setTimeout(poll, 2000);
          }
        } else {
          console.error('Invalid job status response:', data);
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Polling error:', error);
        setTimeout(poll, 2000);
      }
    };

    poll();
  };

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
  const downloadAll = async () => {
    if (!jobStatus?.result?.images || jobStatus.result.images.length === 0) {
      alert('没有可下载的图片');
      return;
    }

    try {
      const { downloadRemoteImagesBatch } = await import('@/lib/image-download');

      // 准备批量下载的图片列表
      const images = jobStatus.result.images.map((image, index) => ({
        url: image.imageUrl,
        filename: `picture-wall-${index + 1}.png`
      }));

      // 调用批量下载函数（Tauri环境只弹一次文件夹选择框）
      const { success, failed } = await downloadRemoteImagesBatch(images);

      console.log(`批量下载完成: 成功 ${success}/${images.length}, 失败 ${failed}`);
    } catch (error) {
      console.error('批量下载失败:', error);
      alert('批量下载失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <Button variant="outline" size="sm" onClick={() => router.push('/')} className="transition-all hover:scale-105">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回首页
              </Button>
              <div className="h-6 border-l-2 border-gray-300"></div>
              <h1 className="text-3xl font-bold text-gray-900">图片墙生成</h1>
            </div>
            <p className="text-gray-600 text-base leading-relaxed">上传店铺头像，AI智能分析并生成三张风格统一的专业图片墙</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-8">
            {/* Upload Avatar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>上传店铺头像</span>
                </CardTitle>
                <CardDescription>
                  上传店铺头像或代表性图片，用于分析设计风格
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive ? 'border-orange-400 bg-orange-50 scale-105' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50/50'
                }`}>
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <User className="h-14 w-14 mx-auto text-orange-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {uploadedFile ? uploadedFile.name : '拖拽图片到此处或点击上传'}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">支持 JPG、PNG、WebP 格式，最大 10MB</p>
                    </div>
                  </div>
                </div>

                {previewUrl && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-gray-700 mb-3">头像预览</p>
                    <div className="mt-2 flex justify-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200">
                      <img
                        src={previewUrl}
                        alt="Avatar Preview"
                        className="max-w-48 max-h-48 object-contain rounded-lg border-4 border-white shadow-lg"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generation Button */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>开始生成</span>
                </CardTitle>
                <CardDescription>
                  上传头像后,系统将自动分析并设计3张风格统一的图片墙
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerate}
                  disabled={isProcessing || !uploadedFile}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  生成图片墙
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>生成结果</CardTitle>
                <CardDescription>
                  系统已为您设计3张风格统一的专业图片墙
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isProcessing && jobStatus && (
                  <div className="space-y-5 p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">生成进度</span>
                      <span className="text-sm font-semibold text-orange-600">{jobStatus.progress}%</span>
                    </div>
                    <Progress value={jobStatus.progress} className="w-full h-2.5" />
                    <p className="text-sm text-gray-700 text-center font-medium leading-relaxed">
                      {jobStatus.status === 'queued' && '⏳ 排队中...'}
                      {jobStatus.status === 'running' && jobStatus.progress < 30 && '✨ 正在分析头像，反推设计提示词...'}
                      {jobStatus.status === 'running' && jobStatus.progress >= 30 && jobStatus.progress < 90 && '🎨 正在生成图片墙...'}
                      {jobStatus.status === 'running' && jobStatus.progress >= 90 && '💾 正在处理和保存图片...'}
                    </p>

                    {/* 显示反推提示词结果 */}
                    {jobStatus.reversePrompt && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-orange-200">
                        <h5 className="font-semibold text-sm mb-3 text-orange-700">🔍 反推提示词分析结果</h5>

                        {jobStatus.reversePrompt.summary && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">设计分析摘要：</p>
                            <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                              {jobStatus.reversePrompt.summary}
                            </p>
                          </div>
                        )}

                        {jobStatus.reversePrompt.extractedPrompt && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">
                              反推设计提示词（{jobStatus.reversePrompt.extractedPrompt.length}字符）：
                            </p>
                            <p className="text-sm text-gray-700 bg-white p-2 rounded border font-mono max-h-32 overflow-y-auto">
                              {jobStatus.reversePrompt.extractedPrompt}
                            </p>
                          </div>
                        )}

                        {jobStatus.reversePrompt.fullResponse && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                              查看完整AI分析响应
                            </summary>
                            <div className="mt-2 p-2 bg-white rounded border text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {jobStatus.reversePrompt.fullResponse}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {jobStatus?.status === 'failed' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-2">❌ 生成失败</h4>
                      <p className="text-sm text-red-700 leading-relaxed">
                        {jobStatus.error || '未知错误，请重试'}
                      </p>
                    </div>

                    {/* 即使失败也显示反推提示词，帮助调试 */}
                    {jobStatus.reversePrompt && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h5 className="font-medium text-yellow-800 mb-2">🔍 反推提示词分析结果（调试信息）</h5>

                        {jobStatus.reversePrompt.extractedPrompt && (
                          <div className="mb-3">
                            <p className="text-xs text-yellow-700 mb-1">
                              反推设计提示词（{jobStatus.reversePrompt.extractedPrompt.length}字符）：
                            </p>
                            <p className="text-sm text-yellow-800 bg-white p-2 rounded border font-mono max-h-32 overflow-y-auto">
                              {jobStatus.reversePrompt.extractedPrompt}
                            </p>
                          </div>
                        )}

                        <details className="mt-2">
                          <summary className="text-xs text-yellow-700 cursor-pointer hover:text-yellow-800">
                            查看完整AI分析响应
                          </summary>
                          <div className="mt-2 p-2 bg-white rounded border text-xs text-yellow-700 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {jobStatus.reversePrompt.fullResponse}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )}

                {jobStatus?.status === 'succeeded' && jobStatus.result && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">图片墙</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={downloadAll}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        全部下载
                      </Button>
                    </div>

                    <div className={`grid gap-4 ${
                      jobStatus.result.images.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
                      jobStatus.result.images.length === 2 ? 'grid-cols-2' :
                      jobStatus.result.images.length === 3 ? 'grid-cols-3' :
                      jobStatus.result.images.length === 4 ? 'grid-cols-2 md:grid-cols-4' :
                      'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                    }`}>
                      {jobStatus.result.images.map((image, index) => (
                        <div key={index} className="space-y-2">
                          <img
                            src={image.imageUrl}
                            alt={`Picture Wall ${index + 1}`}
                            className="w-full aspect-[8/11] object-cover rounded-lg border"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => downloadImage(image.imageUrl, `picture-wall-${index + 1}.png`)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            下载
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="text-sm text-gray-600 text-center">
                      共生成 {jobStatus.result.images.length} 张图片，每张尺寸：240×330px，PNG格式
                    </div>

                    {/* 图片墙专业价值说明 - 优化版 */}
                    <div className="mt-6 overflow-hidden rounded-xl border border-orange-100 shadow-lg">
                      {/* 标题区域 - 渐变背景 */}
                      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 px-6 py-4">
                        <h4 className="font-bold text-white flex items-center text-lg">
                          <Sparkles className="h-5 w-5 mr-2" />
                          图片墙专业价值说明
                        </h4>
                      </div>

                      {/* 内容区域 - 白色背景 */}
                      <div className="bg-white px-6 py-6 space-y-5">
                        {/* 核心价值点 */}
                        <div className="space-y-4">
                          <p className="text-gray-700 leading-relaxed text-[15px]">
                            我们为店铺上线了专业设计的图片墙，这是
                            <span className="inline-block mx-1 px-2 py-0.5 bg-orange-100 text-orange-800 font-semibold rounded">
                              美团平台推荐的核心运营策略之一
                            </span>
                            。
                          </p>

                          {/* 数据展示卡片 */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                              <div className="text-2xl font-bold text-orange-600 mb-1">+32%</div>
                              <div className="text-sm text-gray-600">点击率提升</div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                              <div className="text-2xl font-bold text-orange-600 mb-1">+28%</div>
                              <div className="text-sm text-gray-600">停留时间延长</div>
                            </div>
                          </div>

                          <p className="text-gray-700 leading-relaxed text-[15px]">
                            这三张统一风格的图片不仅提升了品牌专业形象，更重要的是
                            <span className="font-semibold text-orange-700">增强了顾客对食品品质的信任感</span>
                            ，有效提高了菜品转化率和客单价。
                          </p>
                        </div>

                        {/* 建议区域 */}
                        <div className="mt-5 pt-5 border-t border-gray-200">
                          <div className="flex items-start space-x-3 bg-amber-50 rounded-lg p-4 border border-amber-200">
                            <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                              💡
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-amber-900 mb-1">使用建议</p>
                              <p className="text-sm text-amber-800 leading-relaxed">
                                将这三张图片设置在店铺首页，获得最佳展示效果，提升顾客第一印象
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!isProcessing && !jobStatus && (
                  <div className="text-center text-gray-500 py-16">
                    <Images className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-base font-medium">上传头像后，开始生成图片墙</p>
                    <p className="text-sm text-gray-400 mt-2">系统将自动分析并生成3张专业图片</p>
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
