'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, Wand2, Download, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface ProcessResult {
  originalFile: File;
  status: 'processing' | 'success' | 'error';
  resultUrl?: string;
  error?: string;
  width?: number;
  height?: number;
}

export default function RemoveFoodPage() {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResults, setProcessResults] = useState<ProcessResult[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...acceptedFiles]);

        // 为每个文件创建预览URL
        const newPreviewUrls = acceptedFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
      }
    }
  });

  // 移除单个文件
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // 清空所有文件
  const clearAllFiles = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setUploadedFiles([]);
    setPreviewUrls([]);
    setProcessResults([]);
    setOverallProgress(0);
  };

  // 处理批量图片
  const handleBatchProcess = async () => {
    if (uploadedFiles.length === 0) {
      alert('请先上传图片');
      return;
    }

    setIsProcessing(true);
    setOverallProgress(0);

    // 初始化结果数组
    const initialResults: ProcessResult[] = uploadedFiles.map(file => ({
      originalFile: file,
      status: 'processing'
    }));
    setProcessResults(initialResults);

    // 批量处理图片
    const results: ProcessResult[] = [];
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];

      try {
        // 获取图片尺寸
        const img = new Image();
        const imageUrl = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });
        URL.revokeObjectURL(imageUrl);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('width', img.width.toString());
        formData.append('height', img.height.toString());

        const response = await fetch('/api/remove-food', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.ok && data.data) {
          results.push({
            originalFile: file,
            status: 'success',
            resultUrl: data.data.imageUrl,
            width: data.data.width,
            height: data.data.height
          });
        } else {
          results.push({
            originalFile: file,
            status: 'error',
            error: data.error || '处理失败'
          });
        }
      } catch (error) {
        console.error(`处理图片 ${file.name} 失败:`, error);
        results.push({
          originalFile: file,
          status: 'error',
          error: (error as Error).message || '处理失败'
        });
      }

      // 更新进度
      const progress = ((i + 1) / uploadedFiles.length) * 100;
      setOverallProgress(progress);
      setProcessResults([...results]);
    }

    setIsProcessing(false);
  };

  // 下载单个图片
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
    const successResults = processResults.filter(r => r.status === 'success');
    successResults.forEach((result, index) => {
      setTimeout(() => {
        downloadImage(
          result.resultUrl!,
          `去食物-${result.originalFile.name}`
        );
      }, index * 200); // 每200ms下载一个,避免浏览器阻止
    });
  };

  const successCount = processResults.filter(r => r.status === 'success').length;
  const errorCount = processResults.filter(r => r.status === 'error').length;

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
                <Trash2 className="h-6 w-6 text-cyan-600" />
                <h1 className="text-xl font-bold text-gray-900">图片去食物工具</h1>
              </div>
            </div>
            <Badge variant="secondary">F7</Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Upload */}
          <div className="space-y-6">
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>上传图片（支持批量）</span>
                </CardTitle>
                <CardDescription>
                  上传需要去除食物的图片,支持批量上传,保持原图尺寸输出
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-cyan-400 bg-cyan-50' : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        拖拽图片到此处或点击上传
                      </p>
                      <p className="text-sm text-gray-500">支持 JPG、PNG、WebP 格式,最大 10MB,支持批量上传</p>
                    </div>
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        已上传 {uploadedFiles.length} 张图片
                      </Label>
                      <Button variant="outline" size="sm" onClick={clearAllFiles}>
                        <X className="h-4 w-4 mr-1" />
                        清空全部
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="w-full h-48 bg-gray-50 border rounded-lg flex items-center justify-center overflow-hidden">
                            <img
                              src={previewUrls[index]}
                              alt={`预览 ${index + 1}`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Process Button */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wand2 className="h-5 w-5" />
                  <span>开始处理</span>
                </CardTitle>
                <CardDescription>
                  AI将自动移除图片中的食物,保留干净的空器皿、背景和所有文字
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-cyan-50 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-2">
                      <Wand2 className="h-4 w-4 text-cyan-600" />
                      <span className="text-sm font-medium text-cyan-800">智能处理</span>
                    </div>
                    <p className="text-xs text-cyan-600">
                      ✨ AI将识别并移除图片中的所有食物,完整保留器皿、背景、装饰元素和所有文字(店名、价格、标签等),输出与原图相同尺寸的高质量图片
                    </p>
                  </div>

                  <Button
                    onClick={handleBatchProcess}
                    disabled={isProcessing || uploadedFiles.length === 0}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    {isProcessing ? '处理中...' : `开始处理 (${uploadedFiles.length}张)`}
                  </Button>

                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">总体进度</span>
                        <span className="text-sm text-gray-500">{Math.round(overallProgress)}%</span>
                      </div>
                      <Progress value={overallProgress} className="w-full" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>处理结果</CardTitle>
                    <CardDescription>
                      AI处理后的图片,已移除食物,保留空器皿、背景和文字
                    </CardDescription>
                  </div>
                  {successCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={downloadAllImages}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      批量下载 ({successCount})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {processResults.length === 0 && !isProcessing && (
                  <div className="text-center text-gray-500 py-12">
                    <Trash2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>上传图片并开始处理后,结果将显示在这里</p>
                  </div>
                )}

                {processResults.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                    {processResults.map((result, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium truncate flex-1 mr-2">
                            {result.originalFile.name}
                          </span>
                          {result.status === 'processing' && (
                            <Badge variant="secondary" className="text-xs py-0 h-5">处理中</Badge>
                          )}
                          {result.status === 'success' && (
                            <Badge className="bg-green-500 text-xs py-0 h-5">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              完成
                            </Badge>
                          )}
                          {result.status === 'error' && (
                            <Badge variant="destructive" className="text-xs py-0 h-5">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              失败
                            </Badge>
                          )}
                        </div>

                        {result.status === 'success' && result.resultUrl && (
                          <div className="space-y-2">
                            <div className="w-full h-32 bg-gray-50 border rounded-lg flex items-center justify-center overflow-hidden">
                              <img
                                src={result.resultUrl}
                                alt={`处理结果 ${index + 1}`}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {result.width}×{result.height}px
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2"
                                onClick={() => downloadImage(result.resultUrl!, `去食物-${result.originalFile.name}`)}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                下载
                              </Button>
                            </div>
                          </div>
                        )}

                        {result.status === 'error' && (
                          <div className="text-xs text-red-600">
                            错误: {result.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(successCount > 0 || errorCount > 0) && !isProcessing && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">总共:</span>
                        <span className="font-medium">{processResults.length} 张</span>
                      </div>
                      {successCount > 0 && (
                        <div className="flex items-center justify-between text-green-600">
                          <span>成功:</span>
                          <span className="font-medium">{successCount} 张</span>
                        </div>
                      )}
                      {errorCount > 0 && (
                        <div className="flex items-center justify-between text-red-600">
                          <span>失败:</span>
                          <span className="font-medium">{errorCount} 张</span>
                        </div>
                      )}
                    </div>
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
