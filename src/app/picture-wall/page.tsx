'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
      enhancedPrompt: string;
    };
  };
  error?: string;
}

const styleThemes = [
  { value: 'food', label: '美食主题', description: '突出食物的色彩和质感' },
  { value: 'warm', label: '温馨家庭', description: '温暖舒适的家庭氛围' },
  { value: 'modern', label: '现代简约', description: '简洁现代的设计风格' },
  { value: 'traditional', label: '传统经典', description: '经典传统的中式风格' },
  { value: 'vibrant', label: '活力青春', description: '充满活力的年轻风格' },
  { value: 'elegant', label: '优雅精致', description: '高端优雅的精致风格' }
];



export default function PictureWallPage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [styleTheme, setStyleTheme] = useState('food');
  const [customPrompt, setCustomPrompt] = useState('');
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
    formData.append('styleTheme', styleTheme);
    formData.append('customPrompt', customPrompt);

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
        
        if (data.ok) {
          setJobStatus(data.data);
          
          if (data.data.status === 'completed') {
            setIsProcessing(false);
          } else if (data.data.status === 'failed') {
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
                    <Label>头像预览</Label>
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

            {/* Generation Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>生成设置</span>
                </CardTitle>
                <CardDescription>
                  选择风格主题和自定义要求
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="style-theme">风格主题</Label>
                  <Select value={styleTheme} onValueChange={setStyleTheme}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择风格主题" />
                    </SelectTrigger>
                    <SelectContent>
                      {styleThemes.map((theme) => (
                        <SelectItem key={theme.value} value={theme.value}>
                          <div>
                            <div className="font-medium">{theme.label}</div>
                            <div className="text-sm text-gray-500">{theme.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="custom-prompt">自定义要求（可选）</Label>
                  <Textarea
                    id="custom-prompt"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="描述您希望图片墙体现的特殊要求"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isProcessing || !uploadedFile}
                  className="w-full"
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
                  将生成3张统一风格的图片，尺寸为3400×4675px
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

                    <div className="grid grid-cols-3 gap-4">
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
                      每张图片尺寸：3400×4675px，PNG格式
                    </div>

                    {/* 反推提示词显示 */}
                    {jobStatus.result.reversePrompt && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                          AI分析结果
                        </h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <Label className="text-gray-700 font-medium">图片分析摘要：</Label>
                            <p className="mt-1 text-gray-600 leading-relaxed">
                              {jobStatus.result.reversePrompt.summary}
                            </p>
                          </div>
                          <div>
                            <Label className="text-gray-700 font-medium">提取的设计提示词：</Label>
                            <p className="mt-1 text-gray-600 leading-relaxed">
                              {jobStatus.result.reversePrompt.prompt}
                            </p>
                          </div>
                          <div>
                            <Label className="text-gray-700 font-medium">增强后的生成提示词：</Label>
                            <p className="mt-1 text-gray-600 leading-relaxed">
                              {jobStatus.result.reversePrompt.enhancedPrompt}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
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
