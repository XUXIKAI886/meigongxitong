'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Wand2, Store, FileImage, Palette, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface JobStatus {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  result?: {
    logoUrl: string;
    storefrontUrl: string;
    posterUrl: string;
    reversePrompt: string;
    finalPrompt: string;
  };
  error?: string;
}

export default function LogoStudioPage() {
  const [storeName, setStoreName] = useState('');
  const [originalLogo, setOriginalLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [shouldStopPolling, setShouldStopPolling] = useState(false);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalLogo(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!storeName.trim() || !originalLogo) {
      alert('请填写店铺名称并上传原logo图片');
      return;
    }

    setIsGenerating(true);
    setJobStatus(null);

    try {
      const formData = new FormData();
      formData.append('storeName', storeName.trim());
      formData.append('originalLogo', originalLogo);

      const response = await fetch('/api/logo-studio/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('生成请求失败');
      }

      const { jobId } = await response.json();

      // 重置轮询标志并开始轮询任务状态
      setShouldStopPolling(false);
      pollJobStatus(jobId);
    } catch (error) {
      console.error('生成失败:', error);
      alert('生成失败，请重试');
      setIsGenerating(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    let pollAttempts = 0;
    const maxPollAttempts = 150; // 最多轮询5分钟 (150 * 2秒)

    const poll = async () => {
      // 检查是否应该停止轮询
      if (shouldStopPolling) {
        console.log('Polling stopped by flag');
        return;
      }

      // 检查轮询次数限制
      if (pollAttempts >= maxPollAttempts) {
        console.log('Polling stopped - max attempts reached');
        setIsGenerating(false);
        setShouldStopPolling(true);
        alert('任务处理超时，请重试');
        return;
      }

      pollAttempts++;

      try {
        const response = await fetch(`/api/jobs/${jobId}`);

        // 处理404错误（作业还未注册或已被清理）
        if (response.status === 404) {
          console.log(`Job ${jobId} not found (attempt ${pollAttempts}). Status: ${response.status}`);
          // 如果轮询次数较多，可能作业已完成并被清理，停止轮询
          if (pollAttempts > 10) {
            console.log('Job may have completed and been cleaned up, stopping polling');
            setIsGenerating(false);
            setShouldStopPolling(true);
            return;
          }
          setTimeout(poll, 2000); // 2秒后重试
          return;
        }

        const apiResponse = await response.json();

        // 处理API响应格式：{ ok: true, data: { ... } }
        if (apiResponse.ok && apiResponse.data) {
          const status: JobStatus = apiResponse.data;
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
            setIsGenerating(false);
            setShouldStopPolling(true); // 设置停止标志
            console.log('Job completed with result:', status.result);
            console.log('Polling stopped - job completed successfully');
            return; // 停止轮询
          } else if (status.status === 'failed') {
            setIsGenerating(false);
            setShouldStopPolling(true); // 设置停止标志
            alert('生成失败: ' + (status.error || '未知错误'));
            console.log('Polling stopped - job failed');
            return; // 停止轮询
          } else if (status.status === 'running' || status.status === 'queued') {
            setTimeout(poll, 2000); // 2秒后再次检查
          } else {
            console.log('Unknown job status:', status.status, '- stopping polling');
            setIsGenerating(false);
            setShouldStopPolling(true); // 设置停止标志
            return; // 停止轮询
          }
        } else {
          console.error('API response error:', apiResponse);
          // 对于API错误，继续重试而不是立即停止
          if (pollAttempts < maxPollAttempts) {
            setTimeout(poll, 2000);
          } else {
            setIsGenerating(false);
            setShouldStopPolling(true);
            alert('获取任务状态失败，请重试');
          }
        }
      } catch (error) {
        console.error('获取任务状态失败:', error);
        // 对于网络错误，继续重试而不是立即停止
        if (pollAttempts < maxPollAttempts) {
          setTimeout(poll, 2000);
        } else {
          setIsGenerating(false);
          setShouldStopPolling(true);
          alert('网络错误，请重试');
        }
      }
    };

    // 添加初始延迟，确保作业已经注册
    setTimeout(poll, 1000); // 1秒后开始轮询
  };

  // 下载图片函数
  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* 返回主页按钮 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => window.location.href = '/'}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回主页
          </Button>
        </div>

        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            <Palette className="inline-block w-10 h-10 mr-3 text-blue-600" />
            Logo设计工作室
          </h1>
          <p className="text-xl text-gray-600">
            上传原logo，AI智能分析设计风格，为您的店铺生成专业的Logo、店招和海报设计
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：输入区域 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Store className="w-5 h-5 mr-2" />
                  店铺信息
                </CardTitle>
                <CardDescription>
                  请填写您的店铺名称，这将融入到设计中
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="storeName">店铺名称 *</Label>
                  <Input
                    id="storeName"
                    placeholder="例如：美味小厨、时尚服装店、咖啡时光..."
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  上传原Logo
                </CardTitle>
                <CardDescription>
                  上传您现有的logo图片，AI将分析其设计风格
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload" className="cursor-pointer">
                      {logoPreview ? (
                        <div className="space-y-2">
                          <img
                            src={logoPreview}
                            alt="Logo预览"
                            className="max-w-full max-h-32 mx-auto rounded"
                          />
                          <p className="text-sm text-gray-500">点击更换图片</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <FileImage className="w-12 h-12 mx-auto text-gray-400" />
                          <p className="text-gray-500">点击上传logo图片</p>
                          <p className="text-xs text-gray-400">支持 JPG、PNG 格式</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !storeName.trim() || !originalLogo}
              className="w-full h-12 text-lg"
            >
              {isGenerating ? (
                <>
                  <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                  AI设计生成中...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  开始AI设计
                </>
              )}
            </Button>
          </div>

          {/* 右侧：结果展示区域 */}
          <div className="space-y-6">
            {jobStatus && (
              <Card>
                <CardHeader>
                  <CardTitle>生成进度</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={jobStatus.progress} className="w-full" />
                    <p className="text-sm text-gray-600">
                      状态: {jobStatus.status === 'pending' && '等待中...'}
                      {jobStatus.status === 'running' && '生成中...'}
                      {jobStatus.status === 'completed' && '完成！'}
                      {jobStatus.status === 'failed' && '失败'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {jobStatus?.result && (
              <div className="space-y-6">
                {/* 反推提示词展示 */}
                <Card>
                  <CardHeader>
                    <CardTitle>AI分析结果</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>原Logo设计风格分析</Label>
                      <Textarea
                        value={jobStatus.result.reversePrompt}
                        readOnly
                        className="mt-1 h-20 text-sm"
                      />
                    </div>
                    <div>
                      <Label>融合店铺名称后的完整提示词</Label>
                      <Textarea
                        value={jobStatus.result.finalPrompt}
                        readOnly
                        className="mt-1 h-24 text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 生成结果展示 */}
                <div className="grid grid-cols-1 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Logo设计</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadImage(jobStatus.result!.logoUrl, `${storeName}-Logo设计.png`)}
                      >
                        下载
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={jobStatus.result.logoUrl}
                        alt="Logo设计"
                        className="w-full rounded-lg border"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>店招设计</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadImage(jobStatus.result!.storefrontUrl, `${storeName}-店招设计.png`)}
                      >
                        下载
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={jobStatus.result.storefrontUrl}
                        alt="店招设计"
                        className="w-full rounded-lg border"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>海报设计</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadImage(jobStatus.result!.posterUrl, `${storeName}-海报设计.png`)}
                      >
                        下载
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={jobStatus.result.posterUrl}
                        alt="海报设计"
                        className="w-full rounded-lg border"
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
