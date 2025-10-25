'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Upload, Wand2, Download, Image, Type, Palette } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface JobStatus {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  result?: {
    imageUrl: string;
    width: number;
    height: number;
  };
  error?: string;
}



export default function SignboardPage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [originalText, setOriginalText] = useState('');
  const [newText, setNewText] = useState('');
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

  const handleProcess = async () => {
    if (!uploadedFile || !originalText.trim() || !newText.trim()) {
      alert('请上传图片并填写原文字和新文字内容');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('image', uploadedFile);
    formData.append('originalText', originalText);
    formData.append('newText', newText);

    try {
      const response = await fetch('/api/signboard/replace-text', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      // 检测同步响应 (Vercel) vs 异步响应 (本地)
      if (responseData.ok && responseData.data) {
        // 检查是同步结果还是异步任务
        if (responseData.data.imageUrl) {
          // Vercel 同步模式: 直接使用返回的结果
          console.log('检测到同步响应(Vercel模式),直接使用结果:', responseData.data);

          setJobStatus({
            id: 'vercel-sync',
            status: 'succeeded',
            progress: 100,
            result: responseData.data,
          });
          setIsProcessing(false);
        } else if (responseData.data.jobId) {
          // 本地异步模式: 使用 jobId 轮询
          console.log('检测到异步响应(本地模式),开始轮询 jobId:', responseData.data.jobId);
          pollJobStatus(responseData.data.jobId);
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        throw new Error(responseData.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Processing error:', error);
      alert('处理失败：' + (error as Error).message);
      setIsProcessing(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const data = await response.json();

        if (data.ok) {
          setJobStatus(data.job);

          if (data.job.status === 'succeeded') {
            setIsProcessing(false);
          } else if (data.job.status === 'failed') {
            alert('处理失败：' + (data.job.error || '未知错误'));
            setIsProcessing(false);
          } else {
            setTimeout(poll, 2000);
          }
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
                <Type className="h-6 w-6 text-green-600" />
                <h1 className="text-xl font-bold text-gray-900">门头招牌文字替换</h1>
              </div>
            </div>
            <Badge variant="secondary">F3</Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Upload Image */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Upload className="h-5 w-5 text-green-600" />
                  <span>上传门头照片</span>
                </CardTitle>
                <CardDescription className="text-sm mt-2">
                  上传需要替换文字的门头招牌照片
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive ? 'border-green-400 bg-green-50 scale-[1.02]' : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
                }`}>
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <Image className="h-14 w-14 mx-auto text-gray-400" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-gray-900">
                        {uploadedFile ? uploadedFile.name : '拖拽图片到此处或点击上传'}
                      </p>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        支持 JPG、PNG、WebP 格式，最大 10MB
                      </p>
                    </div>
                  </div>
                </div>

                {previewUrl && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">预览图片</Label>
                    <div className="rounded-lg border-2 border-gray-200 p-3 bg-gray-50">
                      <img
                        src={previewUrl}
                        alt="门头预览"
                        className="w-full max-h-72 object-contain rounded-md"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Text Settings */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Palette className="h-5 w-5 text-purple-600" />
                  <span>文字替换设置</span>
                </CardTitle>
                <CardDescription className="text-sm mt-2">
                  指定要替换的原文字和新文字内容，AI将自动保持原有的字体风格和颜色
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 原有文字内容 */}
                <div className="space-y-2">
                  <Label htmlFor="original-text" className="text-sm font-medium text-gray-700">
                    原有文字内容
                  </Label>
                  <Input
                    id="original-text"
                    value={originalText}
                    onChange={(e) => setOriginalText(e.target.value)}
                    placeholder="请输入图片中需要替换的原文字"
                    className="h-11"
                  />
                  <p className="text-xs text-gray-500 leading-relaxed pt-1">
                    例如：老王餐厅、张记小吃、美味快餐等
                  </p>
                </div>

                {/* 新文字内容 */}
                <div className="space-y-2">
                  <Label htmlFor="new-text" className="text-sm font-medium text-gray-700">
                    新文字内容
                  </Label>
                  <Input
                    id="new-text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="请输入要替换成的新文字"
                    className="h-11"
                  />
                  <p className="text-xs text-gray-500 leading-relaxed pt-1">
                    例如：新王餐厅、李记小吃、香味快餐等
                  </p>
                </div>

                {/* 智能风格保持提示 */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <Wand2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">智能风格保持</span>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    ✨ AI将自动分析原图的字体风格、颜色、大小和视觉效果，确保替换后的文字与原有风格完全一致
                  </p>
                </div>

                {/* 开始按钮 */}
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing || !uploadedFile || !originalText.trim() || !newText.trim()}
                  className="w-full h-11 mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  size="lg"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  开始智能替换
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Wand2 className="h-5 w-5 text-green-600" />
                  <span>处理结果</span>
                </CardTitle>
                <CardDescription className="text-sm mt-2">
                  AI智能识别并替换门头招牌文字，保持原有风格和透视效果
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[400px] flex items-center justify-center">
                {isProcessing && jobStatus && (
                  <div className="space-y-5 w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">处理进度</span>
                      <span className="text-sm font-semibold text-green-600">{jobStatus.progress}%</span>
                    </div>
                    <Progress value={jobStatus.progress} className="w-full h-2" />
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600 font-medium">
                        {jobStatus.status === 'queued' && '⏳ 排队中...'}
                        {jobStatus.status === 'running' && '✨ 正在替换文字...'}
                      </p>
                    </div>
                  </div>
                )}

                {jobStatus?.status === 'succeeded' && jobStatus.result && (
                  <div className="space-y-5 w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-gray-900">✅ 替换成功</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-4"
                        onClick={() => downloadImage(jobStatus.result!.imageUrl, `signboard-${originalText}-to-${newText}.png`)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        下载图片
                      </Button>
                    </div>
                    <div className="rounded-lg border-2 border-green-200 p-3 bg-green-50/50">
                      <img
                        src={jobStatus.result.imageUrl}
                        alt="Processed Signboard"
                        className="w-full rounded-md shadow-sm"
                      />
                    </div>
                    <div className="pt-2">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        <span className="font-medium text-gray-800">已将 "{originalText}" 替换为 "{newText}"</span>
                        <br />
                        <span className="text-xs text-gray-500">尺寸：{jobStatus.result.width} × {jobStatus.result.height} px</span>
                      </p>
                    </div>
                  </div>
                )}

                {!isProcessing && !jobStatus && (
                  <div className="text-center text-gray-400 py-16">
                    <Type className="h-16 w-16 mx-auto mb-5 text-gray-300" />
                    <p className="text-base font-medium text-gray-500 leading-relaxed">
                      上传门头照片并填写原文字和新文字后
                      <br />
                      点击"开始智能替换"按钮处理
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
