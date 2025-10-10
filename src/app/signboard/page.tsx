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

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Upload Image */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>上传门头照片</span>
                </CardTitle>
                <CardDescription>
                  上传需要替换文字的门头招牌照片
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <Image className="h-12 w-12 mx-auto text-gray-400" />
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
                    <Label>预览图片</Label>
                    <div className="mt-2">
                      <img
                        src={previewUrl}
                        alt="门头预览"
                        className="w-full max-h-64 object-contain border rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Text Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>文字替换设置</span>
                </CardTitle>
                <CardDescription>
                  指定要替换的原文字和新文字内容，AI将自动保持原有的字体风格和颜色
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="original-text">原有文字内容</Label>
                  <Input
                    id="original-text"
                    value={originalText}
                    onChange={(e) => setOriginalText(e.target.value)}
                    placeholder="请输入图片中需要替换的原文字"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    例如：老王餐厅、张记小吃、美味快餐等
                  </p>
                </div>

                <div>
                  <Label htmlFor="new-text">新文字内容</Label>
                  <Input
                    id="new-text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="请输入要替换成的新文字"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    例如：新王餐厅、李记小吃、香味快餐等
                  </p>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                  <div className="flex items-center space-x-2 mb-2">
                    <Wand2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">智能风格保持</span>
                  </div>
                  <p className="text-xs text-blue-600">
                    ✨ AI将自动分析原图的字体风格、颜色、大小和视觉效果，确保替换后的文字与原有风格完全一致
                  </p>
                </div>

                <Button
                  onClick={handleProcess}
                  disabled={isProcessing || !uploadedFile || !originalText.trim() || !newText.trim()}
                  className="w-full"
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
              <CardHeader>
                <CardTitle>处理结果</CardTitle>
                <CardDescription>
                  AI智能识别并替换门头招牌文字，保持原有风格和透视效果
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isProcessing && jobStatus && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">处理进度</span>
                      <span className="text-sm text-gray-500">{jobStatus.progress}%</span>
                    </div>
                    <Progress value={jobStatus.progress} className="w-full" />
                    <p className="text-sm text-gray-600 text-center">
                      {jobStatus.status === 'queued' && '排队中...'}
                      {jobStatus.status === 'running' && '正在替换文字...'}
                    </p>
                  </div>
                )}

                {jobStatus?.status === 'succeeded' && jobStatus.result && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">替换结果</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadImage(jobStatus.result!.imageUrl, `signboard-${originalText}-to-${newText}.png`)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        下载
                      </Button>
                    </div>
                    <img
                      src={jobStatus.result.imageUrl}
                      alt="Processed Signboard"
                      className="w-full rounded-lg border"
                    />
                    <p className="text-sm text-gray-600">
                      已将"{originalText}"替换为"{newText}" | 尺寸：{jobStatus.result.width}×{jobStatus.result.height}px
                    </p>
                  </div>
                )}

                {!isProcessing && !jobStatus && (
                  <div className="text-center text-gray-500 py-12">
                    <Type className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>上传门头照片并填写原文字和新文字后，开始智能替换</p>
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
