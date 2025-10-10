'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  XCircleIcon
} from 'lucide-react';

// 产品美化预设提示词
const beautifyPresets = [
  {
    value: 'general',
    label: '通用美化',
    description: '整体提升产品质感和视觉效果',
    prompt: 'enhance product quality, improve lighting, remove imperfections, maintain original appearance, professional food photography'
  },
  {
    value: 'food-fresh',
    label: '食物新鲜度',
    description: '增强食物的新鲜感和食欲',
    prompt: 'make food look fresh and appetizing, enhance colors, improve texture, add natural shine, maintain food authenticity'
  },
  {
    value: 'color-enhance',
    label: '色彩增强',
    description: '提升色彩饱和度和对比度',
    prompt: 'enhance colors and saturation, improve contrast, make colors more vibrant, maintain natural appearance'
  },
  {
    value: 'texture-detail',
    label: '质感细节',
    description: '增强产品质感和细节表现',
    prompt: 'enhance texture details, improve surface quality, add realistic details, maintain product integrity'
  },
  {
    value: 'lighting-fix',
    label: '光线修复',
    description: '优化光线和阴影效果',
    prompt: 'improve lighting conditions, fix shadows, enhance natural lighting, professional studio lighting effect'
  },
  {
    value: 'defect-repair',
    label: '瑕疵修复',
    description: '修复产品表面瑕疵和缺陷',
    prompt: 'repair surface defects, remove blemishes, fix imperfections, maintain original product shape and characteristics'
  }
];

interface JobStatus {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress?: number;
  result?: {
    imageUrl: string;
    width: number;
    height: number;
  };
  error?: string;
}

export default function ProductImagePage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [backgroundMode, setBackgroundMode] = useState<'solid' | 'gradient' | 'texture' | 'text2img'>('solid');
  const [backgroundData, setBackgroundData] = useState({
    solidColor: '#FFFFFF',
    gradient: { from: '#FFFFFF', to: '#F0F0F0', angle: 45 },
    texturePrompt: '',
    text2imgPrompt: ''
  });
  const [enhance, setEnhance] = useState({
    sharpen: false,
    denoise: false,
    beautify: false,
    beautifyPreset: 'general'
  });
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const pollJobStatus = async (jobId: string) => {
    const response = await fetch(`/api/jobs/${jobId}`);
    const data = await response.json();
    
    if (data.ok) {
      setJobStatus(data.data);
      
      if (data.data.status === 'running') {
        setTimeout(() => pollJobStatus(jobId), 2000);
      } else if (data.data.status === 'succeeded' || data.data.status === 'failed') {
        setIsProcessing(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setJobStatus(null);

    const formData = new FormData();
    formData.append('image', uploadedFile);
    formData.append('backgroundMode', backgroundMode);
    formData.append('backgroundData', JSON.stringify({
      mode: backgroundMode,
      ...backgroundData
    }));
    formData.append('enhance', JSON.stringify(enhance));
    formData.append('outputSize', '1200x900');

    try {
      const response = await fetch('/api/generate/product', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      // 检测同步响应 (Vercel) vs 异步响应 (本地)
      if (responseData.ok) {
        // 检查是同步结果还是异步任务
        if (responseData.data && responseData.data.imageUrl) {
          // Vercel 同步模式: 直接使用返回的结果
          console.log('检测到同步响应(Vercel模式),直接使用结果:', responseData.data);

          setJobStatus({
            id: 'vercel-sync',
            status: 'succeeded',
            progress: 100,
            result: responseData.data,
          });
          setIsProcessing(false);
        } else if (responseData.data && responseData.data.jobId) {
          // 本地异步模式: 使用 jobId 轮询
          console.log('检测到异步响应(本地模式),开始轮询 jobId:', responseData.data.jobId);
          pollJobStatus(responseData.data.jobId);
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        setJobStatus({
          id: '',
          status: 'failed',
          error: responseData.error
        });
        setIsProcessing(false);
      }
    } catch (error) {
      setJobStatus({
        id: '',
        status: 'failed',
        error: '网络错误，请重试'
      });
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (jobStatus?.result?.imageUrl) {
      const link = document.createElement('a');
      link.href = jobStatus.result.imageUrl;
      link.download = `product-${Date.now()}.png`;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  返回首页
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">单品图抠图换背景</h1>
              </div>
            </div>
            <Badge variant="secondary">F1</Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Upload and Settings */}
          <div className="space-y-6">
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UploadIcon className="h-5 w-5" />
                  <span>上传单品图</span>
                </CardTitle>
                <CardDescription>
                  支持 JPG、PNG、WebP 格式，最大 10MB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  {previewUrl ? (
                    <div className="space-y-4">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full max-h-48 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-gray-600">
                        {uploadedFile?.name} ({Math.round((uploadedFile?.size || 0) / 1024)}KB)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          {isDragActive ? '放开以上传图片' : '拖拽图片到此处或点击上传'}
                        </p>
                        <p className="text-sm text-gray-500">
                          建议上传高清单品图，效果更佳
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Background Settings */}
            <Card>
              <CardHeader>
                <CardTitle>背景设置</CardTitle>
                <CardDescription>选择新的背景类型和样式</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="background-mode">背景类型</Label>
                  <Select value={backgroundMode} onValueChange={(value: any) => setBackgroundMode(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">纯色背景</SelectItem>
                      <SelectItem value="gradient">渐变背景</SelectItem>
                      <SelectItem value="texture">纹理背景</SelectItem>
                      <SelectItem value="text2img">AI生成背景</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {backgroundMode === 'solid' && (
                  <div>
                    <Label htmlFor="solid-color">背景颜色</Label>
                    <Input
                      id="solid-color"
                      type="color"
                      value={backgroundData.solidColor}
                      onChange={(e) => setBackgroundData(prev => ({
                        ...prev,
                        solidColor: e.target.value
                      }))}
                      className="w-full h-10"
                    />
                  </div>
                )}

                {backgroundMode === 'gradient' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>起始颜色</Label>
                        <Input
                          type="color"
                          value={backgroundData.gradient.from}
                          onChange={(e) => setBackgroundData(prev => ({
                            ...prev,
                            gradient: { ...prev.gradient, from: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <Label>结束颜色</Label>
                        <Input
                          type="color"
                          value={backgroundData.gradient.to}
                          onChange={(e) => setBackgroundData(prev => ({
                            ...prev,
                            gradient: { ...prev.gradient, to: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>渐变角度: {backgroundData.gradient.angle}°</Label>
                      <Input
                        type="range"
                        min="0"
                        max="360"
                        value={backgroundData.gradient.angle}
                        onChange={(e) => setBackgroundData(prev => ({
                          ...prev,
                          gradient: { ...prev.gradient, angle: parseInt(e.target.value) }
                        }))}
                      />
                    </div>
                  </div>
                )}

                {backgroundMode === 'texture' && (
                  <div>
                    <Label htmlFor="texture-prompt">纹理描述</Label>
                    <Input
                      id="texture-prompt"
                      placeholder="例如：大理石纹理、木质纹理、金属质感"
                      value={backgroundData.texturePrompt}
                      onChange={(e) => setBackgroundData(prev => ({
                        ...prev,
                        texturePrompt: e.target.value
                      }))}
                    />
                  </div>
                )}

                {backgroundMode === 'text2img' && (
                  <div>
                    <Label htmlFor="text2img-prompt">背景描述</Label>
                    <Input
                      id="text2img-prompt"
                      placeholder="例如：干净的厨房背景、柔和光线"
                      value={backgroundData.text2imgPrompt}
                      onChange={(e) => setBackgroundData(prev => ({
                        ...prev,
                        text2imgPrompt: e.target.value
                      }))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enhancement Options */}
            <Card>
              <CardHeader>
                <CardTitle>图像增强</CardTitle>
                <CardDescription>可选的图像质量提升选项</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sharpen">锐化处理</Label>
                    <p className="text-sm text-gray-500">增强图像清晰度</p>
                  </div>
                  <Switch
                    id="sharpen"
                    checked={enhance.sharpen}
                    onCheckedChange={(checked) => setEnhance(prev => ({
                      ...prev,
                      sharpen: checked
                    }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="denoise">降噪处理</Label>
                    <p className="text-sm text-gray-500">减少图像噪点</p>
                  </div>
                  <Switch
                    id="denoise"
                    checked={enhance.denoise}
                    onCheckedChange={(checked) => setEnhance(prev => ({
                      ...prev,
                      denoise: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="beautify">产品美化</Label>
                    <p className="text-sm text-gray-500">AI智能修复和美化产品</p>
                  </div>
                  <Switch
                    id="beautify"
                    checked={enhance.beautify}
                    onCheckedChange={(checked) => setEnhance(prev => ({
                      ...prev,
                      beautify: checked
                    }))}
                  />
                </div>

                {enhance.beautify && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                    <Label htmlFor="beautify-preset">美化预设</Label>
                    <Select
                      value={enhance.beautifyPreset}
                      onValueChange={(value) => setEnhance(prev => ({
                        ...prev,
                        beautifyPreset: value
                      }))}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {beautifyPresets.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{preset.label}</span>
                              <span className="text-sm text-gray-500">{preset.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-blue-600 mt-2">
                      ⚠️ 美化功能会保持产品原有特征，仅优化质感和视觉效果
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={handleSubmit}
              disabled={!uploadedFile || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  开始处理
                </>
              )}
            </Button>
          </div>

          {/* Right Panel - Preview and Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>处理结果</CardTitle>
                <CardDescription>
                  输出尺寸：1200×900px，PNG格式
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!jobStatus && !isProcessing && (
                  <div className="aspect-[4/3] bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                      <p>上传图片并开始处理后，结果将显示在这里</p>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="space-y-4">
                    <Skeleton className="aspect-[4/3] w-full" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>处理进度</span>
                        <span>{jobStatus?.progress || 0}%</span>
                      </div>
                      <Progress value={jobStatus?.progress || 0} />
                    </div>
                  </div>
                )}

                {jobStatus?.status === 'succeeded' && jobStatus.result && (
                  <div className="space-y-4">
                    <img
                      src={jobStatus.result.imageUrl}
                      alt="处理结果"
                      className="w-full rounded-lg"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span className="text-sm">处理完成</span>
                      </div>
                      <Button onClick={downloadResult} size="sm">
                        <DownloadIcon className="h-4 w-4 mr-2" />
                        下载图片
                      </Button>
                    </div>
                  </div>
                )}

                {jobStatus?.status === 'failed' && (
                  <Alert variant="destructive">
                    <XCircleIcon className="h-4 w-4" />
                    <AlertDescription>
                      处理失败：{jobStatus.error || '未知错误'}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
