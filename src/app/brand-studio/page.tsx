'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Upload, Sparkles, Download, Image, Store, FileImage } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface JobStatus {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    logo?: { imageUrl: string; width: number; height: number };
    storefront?: { imageUrl: string; width: number; height: number };
    poster?: { imageUrl: string; width: number; height: number };
    prompt?: string;
  };
  error?: string;
}

const businessCategories = [
  '中式快餐', '西式快餐', '日韩料理', '东南亚菜', '川湘菜',
  '粤菜茶餐', '小吃夜宵', '甜品饮品', '咖啡茶饮', '烘焙糕点',
  '火锅烧烤', '披萨意面', '汉堡炸鸡', '寿司刺身', '其他美食'
];

export default function BrandStudioPage() {
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'analyze' | 'generate'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [shopInfo, setShopInfo] = useState({
    name: '',
    category: '',
    slogan: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setUploadedFile(acceptedFiles[0]);
        setStep('analyze');
      }
    }
  });

  const handleAnalyze = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('image', uploadedFile);

    try {
      const response = await fetch('/api/reverse-prompt', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.ok) {
        // Start polling for job status
        pollJobStatus(data.data.jobId);
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('分析失败：' + (error as Error).message);
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!analysisResult || !shopInfo.name || !shopInfo.category) {
      alert('请填写完整的店铺信息');
      return;
    }

    setIsProcessing(true);
    setStep('generate');

    try {
      // Generate logo
      const logoResponse = await fetch('/api/generate/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: analysisResult,
          shopName: shopInfo.name,
          category: shopInfo.category,
          slogan: shopInfo.slogan
        }),
      });

      const logoData = await logoResponse.json();
      if (logoData.ok) {
        pollJobStatus(logoData.data.jobId);
      } else {
        throw new Error(logoData.error || 'Generation failed');
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
            if (step === 'analyze') {
              setAnalysisResult(data.data.result?.prompt || '');
              setStep('generate');
            }
            setIsProcessing(false);
          } else if (data.data.status === 'failed') {
            alert('处理失败：' + (data.data.error || '未知错误'));
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
                <Sparkles className="h-6 w-6 text-purple-600" />
                <h1 className="text-xl font-bold text-gray-900">Logo设计工作室</h1>
              </div>
            </div>
            <Badge variant="secondary">F2</Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Step 1: Upload Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>上传参考Logo</span>
                </CardTitle>
                <CardDescription>
                  上传您的Logo或参考图片，系统将分析设计风格
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
                
                {uploadedFile && step === 'analyze' && (
                  <div className="mt-4">
                    <Button onClick={handleAnalyze} disabled={isProcessing} className="w-full">
                      {isProcessing ? '分析中...' : '开始分析'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Shop Information */}
            {(step === 'generate' || analysisResult) && (
              <Card>
                <CardHeader>
                  <CardTitle>店铺信息</CardTitle>
                  <CardDescription>填写您的店铺基本信息</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="shop-name">店铺名称</Label>
                    <Input
                      id="shop-name"
                      value={shopInfo.name}
                      onChange={(e) => setShopInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="请输入店铺名称"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">经营品类</Label>
                    <Select value={shopInfo.category} onValueChange={(value) => setShopInfo(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择经营品类" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="slogan">店铺标语（可选）</Label>
                    <Input
                      id="slogan"
                      value={shopInfo.slogan}
                      onChange={(e) => setShopInfo(prev => ({ ...prev, slogan: e.target.value }))}
                      placeholder="请输入店铺标语"
                    />
                  </div>

                  {analysisResult && (
                    <div>
                      <Label htmlFor="analysis-result">设计风格分析</Label>
                      <Textarea
                        id="analysis-result"
                        value={analysisResult}
                        onChange={(e) => setAnalysisResult(e.target.value)}
                        rows={4}
                        placeholder="AI分析的设计风格描述"
                      />
                    </div>
                  )}

                  <Button onClick={handleGenerate} disabled={isProcessing || !shopInfo.name || !shopInfo.category} className="w-full">
                    <Sparkles className="h-4 w-4 mr-2" />
                    生成品牌素材
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>生成结果</CardTitle>
                <CardDescription>
                  将生成Logo、店招、海报三种尺寸的品牌素材
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
                      {jobStatus.status === 'processing' && '正在生成品牌素材...'}
                    </p>
                  </div>
                )}

                {jobStatus?.status === 'completed' && jobStatus.result && (
                  <div className="space-y-6">
                    {/* Logo */}
                    {jobStatus.result.logo && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium flex items-center">
                            <Image className="h-4 w-4 mr-2" />
                            Logo (800×800px)
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadImage(jobStatus.result!.logo!.imageUrl, `${shopInfo.name}-logo.png`)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            下载
                          </Button>
                        </div>
                        <img
                          src={jobStatus.result.logo.imageUrl}
                          alt="Generated Logo"
                          className="w-full rounded-lg border"
                        />
                      </div>
                    )}

                    {/* Storefront */}
                    {jobStatus.result.storefront && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium flex items-center">
                            <Store className="h-4 w-4 mr-2" />
                            店招 (1280×720px)
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadImage(jobStatus.result!.storefront!.imageUrl, `${shopInfo.name}-storefront.png`)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            下载
                          </Button>
                        </div>
                        <img
                          src={jobStatus.result.storefront.imageUrl}
                          alt="Generated Storefront"
                          className="w-full rounded-lg border"
                        />
                      </div>
                    )}

                    {/* Poster */}
                    {jobStatus.result.poster && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium flex items-center">
                            <FileImage className="h-4 w-4 mr-2" />
                            海报 (1440×480px)
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadImage(jobStatus.result!.poster!.imageUrl, `${shopInfo.name}-poster.png`)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            下载
                          </Button>
                        </div>
                        <img
                          src={jobStatus.result.poster.imageUrl}
                          alt="Generated Poster"
                          className="w-full rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                )}

                {!isProcessing && !jobStatus && (
                  <div className="text-center text-gray-500 py-12">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>上传Logo并填写店铺信息后，开始生成品牌素材</p>
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
