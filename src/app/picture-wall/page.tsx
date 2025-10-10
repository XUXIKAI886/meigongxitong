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
        pollJobStatus(data.data.jobId);
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

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    if (jobStatus?.result?.images) {
      jobStatus.result.images.forEach((image, index) => {
        downloadImage(image.imageUrl, `picture-wall-${index + 1}.png`);
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回首页
              </Button>
              <div className="flex items-center space-x-2">
                <Images className="h-6 w-6 text-orange-600" />
                <h1 className="text-xl font-bold text-gray-900">图片墙生成</h1>
              </div>
            </div>
            <Badge variant="secondary">F4</Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
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
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <User className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {uploadedFile ? uploadedFile.name : '拖拽图片到此处或点击上传'}
                      </p>
                      <p className="text-sm text-gray-500">支持 JPG、PNG、WebP 格式，最大 10MB</p>
                    </div>
                  </div>
                </div>

                {previewUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">头像预览</p>
                    <div className="mt-2 flex justify-center">
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
                  className="w-full"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  生成图片墙
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>生成结果</CardTitle>
                <CardDescription>
                  系统将为您设计3张风格统一的专业图片墙
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isProcessing && jobStatus && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">生成进度</span>
                      <span className="text-sm text-gray-500">{jobStatus.progress}%</span>
                    </div>
                    <Progress value={jobStatus.progress} className="w-full" />
                    <p className="text-sm text-gray-600 text-center">
                      {jobStatus.status === 'queued' && '排队中...'}
                      {jobStatus.status === 'running' && jobStatus.progress < 30 && '正在分析头像，反推设计提示词...'}
                      {jobStatus.status === 'running' && jobStatus.progress >= 30 && jobStatus.progress < 90 && '正在生成图片墙...'}
                      {jobStatus.status === 'running' && jobStatus.progress >= 90 && '正在处理和保存图片...'}
                    </p>

                    {/* 显示反推提示词结果 */}
                    {jobStatus.reversePrompt && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-medium text-sm mb-2">🔍 反推提示词分析结果</h5>

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
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2">❌ 生成失败</h4>
                      <p className="text-sm text-red-700">
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
                  <div className="text-center text-gray-500 py-12">
                    <Images className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>上传头像后，开始生成图片墙</p>
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
