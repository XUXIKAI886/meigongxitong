'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Wand2, Store, FileImage, Palette, ArrowLeft, Grid3x3, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface JobStatus {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  result?: {
    avatarUrl?: string;
    storefrontUrl?: string;
    posterUrl?: string;
    reversePrompt?: string;
    finalPrompt?: string;
    fusionPrompts?: {
      avatar?: string;
      storefront?: string;
      poster?: string;
    };
  };
  error?: string;
}

interface LogoTemplate {
  id: string;
  name: string;
  path: string;
  url: string;
}

interface LogoTemplateCategory {
  category: string;
  categoryDisplayName: string;
  templates: LogoTemplate[];
}

export default function LogoStudioPage() {
  const [storeName, setStoreName] = useState('');
  const [originalLogo, setOriginalLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [avatarGenerating, setAvatarGenerating] = useState(false);
  const [storefrontGenerating, setStorefrontGenerating] = useState(false);
  const [posterGenerating, setPosterGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  // 独立存储各个类型的生成结果
  const [avatarResult, setAvatarResult] = useState<string | null>(null);
  const [storefrontResult, setStorefrontResult] = useState<string | null>(null);
  const [posterResult, setPosterResult] = useState<string | null>(null);
  const shouldStopPollingRef = useRef(false);

  // 三种类型的模板状态
  const [avatarTemplateCategories, setAvatarTemplateCategories] = useState<LogoTemplateCategory[]>([]);
  const [storefrontTemplateCategories, setStorefrontTemplateCategories] = useState<LogoTemplateCategory[]>([]);
  const [posterTemplateCategories, setPosterTemplateCategories] = useState<LogoTemplateCategory[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // 主推菜品图
  const [dishImage, setDishImage] = useState<File | null>(null);
  const [dishImagePreview, setDishImagePreview] = useState<string>('');

  // 三个模板选择
  const [storefrontTemplate, setStorefrontTemplate] = useState<LogoTemplate | null>(null);
  const [posterTemplate, setPosterTemplate] = useState<LogoTemplate | null>(null);
  const [avatarTemplate, setAvatarTemplate] = useState<LogoTemplate | null>(null);

  // 分类选择状态
  const [storefrontCategory, setStorefrontCategory] = useState<string>('');
  const [posterCategory, setPosterCategory] = useState<string>('');
  const [avatarCategory, setAvatarCategory] = useState<string>('');

  // 模板店铺名状态（用于精确替换）
  const [templateStoreName, setTemplateStoreName] = useState<string>('');

  // 模板排序函数 - 按模板编号数值排序
  const sortTemplatesByNumber = (templates: LogoTemplate[]) => {
    return [...templates].sort((a, b) => {
      // 从 ID 中提取数字，格式: "avatar-通用模板-1.png" 或 "storefront-通用模板-15.png"
      const getNumber = (id: string) => {
        const match = id.match(/-(\d+)\.(png|jpg|jpeg)$/i);
        return match ? parseInt(match[1], 10) : 0;
      };
      return getNumber(a.id) - getNumber(b.id);
    });
  };

  // 加载模板分类
  useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        // 并行加载三种类型的模板
        const [avatarResponse, storefrontResponse, posterResponse] = await Promise.all([
          fetch('/api/logo-templates?type=avatar'),
          fetch('/api/logo-templates?type=storefront'),
          fetch('/api/logo-templates?type=poster')
        ]);

        const [avatarData, storefrontData, posterData] = await Promise.all([
          avatarResponse.json(),
          storefrontResponse.json(),
          posterResponse.json()
        ]);

        if (avatarData.success) {
          setAvatarTemplateCategories(avatarData.categories);
          console.log(`加载了 ${avatarData.total} 个头像模板，分为 ${avatarData.categories.length} 个分类`);
        }

        if (storefrontData.success) {
          setStorefrontTemplateCategories(storefrontData.categories);
          console.log(`加载了 ${storefrontData.total} 个店招模板，分为 ${storefrontData.categories.length} 个分类`);
        }

        if (posterData.success) {
          setPosterTemplateCategories(posterData.categories);
          console.log(`加载了 ${posterData.total} 个海报模板，分为 ${posterData.categories.length} 个分类`);
        }

      } catch (error) {
        console.error('加载模板失败:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);

  // 处理主推菜品图上传
  const handleDishImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setDishImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setDishImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 硬编码的模板店铺名映射表
  // 格式：'分类-模板编号': '店铺名'
  const templateStoreNameMap: Record<string, string> = {
    // 通用模板（适用于头像、店招、海报）
    '通用模板-1': '炒鸡大排档',
    '通用模板-2': '锦膳私厨',
    '通用模板-3': '川乐汇',
    '通用模板-4': '卡门手工汉堡',
    '通用模板-5': '安徽板面',
    '通用模板-6': '霸王牛肉粉',
    '通用模板-7': '超下饭的大块牛肉饭',
    '通用模板-8': '炒粉炒饭',
    '通用模板-9': '风味炸串',
    '通用模板-10': '广粤港式烧腊',
    '通用模板-11': '郝叔串串香',
    '通用模板-12': '胡记江西小炒',
    '通用模板-13': '胡記油炸串串',
    '通用模板-14': '乐盛椒麻鸡',
    '通用模板-15': '刘记手工鲜饺',

    // 其他分类的模板可以继续添加
    // '包子-1': '店铺名',
    // '煲类砂锅-1': '店铺名',
    // ...
  };

  // 处理模板选择（根据类型）
  const handleTemplateSelect = (template: LogoTemplate, type: 'storefront' | 'poster' | 'avatar') => {
    switch (type) {
      case 'storefront':
        setStorefrontTemplate(template);
        break;
      case 'poster':
        setPosterTemplate(template);
        break;
      case 'avatar':
        setAvatarTemplate(template);
        break;
    }

    // 从模板ID中提取分类和编号，自动填写对应的店铺名
    // template.id格式: "avatar-冒菜-1.png" 或 "storefront-冒菜-1.png"
    const idParts = template.id.split('-');
    if (idParts.length >= 3) {
      const category = idParts[1]; // 分类名，如"冒菜"
      const templateNumber = idParts[2].replace(/\.(png|jpg|jpeg)$/i, ''); // 模板编号，如"1"
      const mapKey = `${category}-${templateNumber}`;

      const storeName = templateStoreNameMap[mapKey];
      if (storeName) {
        setTemplateStoreName(storeName);
        console.log(`自动填写模板店铺名: ${mapKey} -> ${storeName}`);
      } else {
        console.log(`未找到模板店铺名映射: ${mapKey}`);
      }
    }
  };

  // 验证基础输入 - 根据类型决定是否需要店铺信息
  const validateBaseInputs = (type?: 'avatar' | 'storefront' | 'poster') => {
    // 只有头像需要店铺信息
    if (type === 'avatar') {
      if (!storeName.trim()) {
        alert('请填写店铺名称');
        return false;
      }
      if (!templateStoreName.trim()) {
        alert('请填写模板店铺名');
        return false;
      }
    }

    // 所有类型都需要菜品图
    if (!dishImage) {
      alert('请上传主推菜品图');
      return false;
    }
    return true;
  };

  // 验证特定类型的模板
  const validateTemplateType = (type: 'avatar' | 'storefront' | 'poster') => {
    switch (type) {
      case 'avatar':
        if (!avatarTemplate) {
          alert('请选择头像模板');
          return false;
        }
        break;
      case 'storefront':
        if (!storefrontTemplate) {
          alert('请选择店招模板');
          return false;
        }
        break;
      case 'poster':
        if (!posterTemplate) {
          alert('请选择海报模板');
          return false;
        }
        break;
    }
    return true;
  };

  // 重置所有加载状态
  const resetAllLoadingStates = () => {
    setIsGenerating(false);
    setAvatarGenerating(false);
    setStorefrontGenerating(false);
    setPosterGenerating(false);
  };

  // 重置生成相关状态
  const resetGenerationStates = (type?: 'avatar' | 'storefront' | 'poster') => {
    console.log('[ResetStates] 重置生成状态', type);
    if (type) {
      // 单个类型生成
      switch (type) {
        case 'avatar':
          setAvatarGenerating(true);
          break;
        case 'storefront':
          setStorefrontGenerating(true);
          break;
        case 'poster':
          setPosterGenerating(true);
          break;
      }
    } else {
      // 全量生成（兼容性）
      setIsGenerating(true);
    }
    setJobStatus(null);
    shouldStopPollingRef.current = false;
  };

  // 单独生成指定类型的设计
  const handleGenerateType = async (type: 'avatar' | 'storefront' | 'poster') => {
    // 验证基础输入（传入类型参数）
    if (!validateBaseInputs(type)) {
      return;
    }

    // 验证特定模板
    if (!validateTemplateType(type)) {
      return;
    }

    // 重置状态
    resetGenerationStates(type);

    try {
      const formData = new FormData();
      // 只有头像需要店铺信息
      if (type === 'avatar') {
        formData.append('storeName', storeName.trim());
        formData.append('templateStoreName', templateStoreName.trim());
      } else {
        // 店招和海报使用占位符（后端不使用这些值）
        formData.append('storeName', '占位符');
        formData.append('templateStoreName', '占位符');
      }
      formData.append('generateType', type); // 指定生成类型

      // 添加主推菜品图
      formData.append('dishImage', dishImage!);

      // 根据类型添加对应的模板文件
      let template: LogoTemplate;
      switch (type) {
        case 'avatar':
          template = avatarTemplate!;
          const avatarResponse = await fetch(template.url);
          const avatarBlob = await avatarResponse.blob();
          formData.append('avatarTemplate', avatarBlob, `avatar-${template.id}.png`);
          formData.append('avatarTemplateId', template.id);
          break;
        case 'storefront':
          template = storefrontTemplate!;
          const storefrontResponse = await fetch(template.url);
          const storefrontBlob = await storefrontResponse.blob();
          formData.append('storefrontTemplate', storefrontBlob, `storefront-${template.id}.png`);
          formData.append('storefrontTemplateId', template.id);
          break;
        case 'poster':
          template = posterTemplate!;
          const posterResponse = await fetch(template.url);
          const posterBlob = await posterResponse.blob();
          formData.append('posterTemplate', posterBlob, `poster-${template.id}.png`);
          formData.append('posterTemplateId', template.id);
          break;
      }

      const response = await fetch('/api/logo-studio/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('生成请求失败');
      }

      const responseData = await response.json();

      // 检测同步响应 (Vercel) vs 异步响应 (本地)
      if (responseData.data) {
        // Vercel 同步模式: 直接使用返回的结果
        console.log('检测到同步响应(Vercel模式),直接使用结果:', responseData.data);

        if (type === 'avatar' && responseData.data.avatarUrl) {
          setAvatarResult(responseData.data.avatarUrl);
          setAvatarGenerating(false);
        } else if (type === 'storefront' && responseData.data.storefrontUrl) {
          setStorefrontResult(responseData.data.storefrontUrl);
          setStorefrontGenerating(false);
        } else if (type === 'poster' && responseData.data.posterUrl) {
          setPosterResult(responseData.data.posterUrl);
          setPosterGenerating(false);
        }

        return; // 同步模式无需轮询
      }

      // 本地异步模式: 使用 jobId 轮询
      const { jobId } = responseData;
      console.log(`开始轮询任务状态，jobId: ${jobId}，类型: ${type}`);
      pollJobStatus(jobId, type);
    } catch (error) {
      console.error('生成失败:', error);
      alert('生成失败，请重试');
      resetAllLoadingStates();
    }
  };

  const pollJobStatus = async (jobId: string, generateType?: 'avatar' | 'storefront' | 'poster') => {
    let pollAttempts = 0;
    const maxPollAttempts = 150; // 最多轮询5分钟 (150 * 2秒)

    console.log(`[PollJobStatus] 开始轮询任务 ${jobId}，类型: ${generateType}，shouldStopPolling: ${shouldStopPollingRef.current}`);

    const poll = async () => {
      // 检查是否应该停止轮询
      if (shouldStopPollingRef.current) {
        console.log(`[Poll] Polling stopped by flag for job ${jobId}`);
        return;
      }

      // 检查轮询次数限制
      if (pollAttempts >= maxPollAttempts) {
        console.log('Polling stopped - max attempts reached');
        resetAllLoadingStates();
        shouldStopPollingRef.current = true;
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
            resetAllLoadingStates();
            shouldStopPollingRef.current = true;
            return;
          }
          setTimeout(poll, 2000); // 2秒后重试
          return;
        }

        const apiResponse = await response.json();

        // 处理API响应格式：{ ok: true, job: { ... } }
        if (apiResponse.ok && apiResponse.job) {
          const status: JobStatus = apiResponse.job;
          setJobStatus(status);

          console.log('🔍 Job status updated:', {
            jobId: jobId,
            generateType: generateType,
            status: status.status,
            progress: status.progress,
            hasResult: !!status.result,
            resultKeys: status.result ? Object.keys(status.result) : [],
            resultUrls: status.result ? {
              avatarUrl: status.result.avatarUrl,
              storefrontUrl: status.result.storefrontUrl,
              posterUrl: status.result.posterUrl
            } : null,
            attempt: pollAttempts,
            shouldStopPolling: shouldStopPollingRef.current
          });

          if (status.status === 'succeeded') {
            console.log('Job completed successfully, setting final states');
            resetAllLoadingStates();
            shouldStopPollingRef.current = true; // 设置停止标志
            console.log('Job completed with result:', status.result);

            // 根据生成类型更新对应的结果状态
            if (status.result) {
              console.log('📦 Processing result:', {
                generateType,
                resultKeys: Object.keys(status.result),
                avatarUrl: status.result.avatarUrl,
                storefrontUrl: status.result.storefrontUrl,
                posterUrl: status.result.posterUrl
              });

              if (generateType === 'avatar' && status.result.avatarUrl) {
                console.log('✅ Setting avatarResult:', status.result.avatarUrl);
                setAvatarResult(status.result.avatarUrl);
              } else if (generateType === 'storefront' && status.result.storefrontUrl) {
                console.log('✅ Setting storefrontResult:', status.result.storefrontUrl);
                setStorefrontResult(status.result.storefrontUrl);
              } else if (generateType === 'poster' && status.result.posterUrl) {
                console.log('✅ Setting posterResult:', status.result.posterUrl);
                setPosterResult(status.result.posterUrl);
              } else if (!generateType) {
                // 批量生成模式，更新所有结果
                console.log('✅ Batch mode - setting all results');
                if (status.result.avatarUrl) setAvatarResult(status.result.avatarUrl);
                if (status.result.storefrontUrl) setStorefrontResult(status.result.storefrontUrl);
                if (status.result.posterUrl) setPosterResult(status.result.posterUrl);
              } else {
                console.warn('⚠️ No matching condition for result update:', {
                  generateType,
                  hasAvatarUrl: !!status.result.avatarUrl,
                  hasStorefrontUrl: !!status.result.storefrontUrl,
                  hasPosterUrl: !!status.result.posterUrl
                });
              }
            }

            console.log('Polling stopped - job completed successfully');
            return; // 停止轮询
          } else if (status.status === 'failed') {
            resetAllLoadingStates();
            shouldStopPollingRef.current = true; // 设置停止标志
            alert('生成失败: ' + (status.error || '未知错误'));
            console.log('Polling stopped - job failed');
            return; // 停止轮询
          } else if (status.status === 'running' || status.status === 'queued') {
            setTimeout(poll, 2000); // 2秒后再次检查
          } else {
            console.log('Unknown job status:', status.status, '- stopping polling');
            resetAllLoadingStates();
            shouldStopPollingRef.current = true; // 设置停止标志
            return; // 停止轮询
          }
        } else {
          console.error('API response error:', apiResponse);
          // 对于API错误，继续重试而不是立即停止
          if (pollAttempts < maxPollAttempts) {
            setTimeout(poll, 2000);
          } else {
            resetAllLoadingStates();
            shouldStopPollingRef.current = true;
            alert('获取任务状态失败，请重试');
          }
        }
      } catch (error) {
        console.error('获取任务状态失败:', error);
        // 对于网络错误，继续重试而不是立即停止
        if (pollAttempts < maxPollAttempts) {
          setTimeout(poll, 2000);
        } else {
          resetAllLoadingStates();
          shouldStopPollingRef.current = true;
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
            选择模板，上传菜品图，AI智能融合生成专业的店招、海报和头像设计
          </p>
        </div>

        {/* 主内容区域 */}
        <div className="grid grid-cols-1 gap-6">
          {/* 输入区域 */}
          <div className="space-y-4">
            {/* 店铺信息 */}
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
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="storeName">店铺名称 *</Label>
                    <Input
                      id="storeName"
                      placeholder="例如：美味小厨"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="templateStoreName">模板店铺名 *</Label>
                    <Input
                      id="templateStoreName"
                      placeholder="模板中的店铺名"
                      value={templateStoreName}
                      onChange={(e) => setTemplateStoreName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  💡 提示：仔细查看所选模板，准确输入模板中的店铺名文字，AI将进行精确替换
                </p>
              </CardContent>
            </Card>

            {/* 主推菜品图上传 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  主推菜品图
                </CardTitle>
                <CardDescription>
                  上传您店铺的主推菜品图片，将与模板融合生成
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDishImageUpload}
                    className="hidden"
                    id="dish-upload"
                  />
                  <label htmlFor="dish-upload" className="cursor-pointer">
                    {dishImagePreview ? (
                      <div className="space-y-2">
                        <img
                          src={dishImagePreview}
                          alt="菜品图预览"
                          className="max-w-full max-h-32 mx-auto rounded"
                        />
                        <p className="text-sm text-gray-500">点击更换图片</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FileImage className="w-12 h-12 mx-auto text-gray-400" />
                        <p className="text-gray-500">点击上传主推菜品图</p>
                        <p className="text-xs text-gray-400">支持 JPG、PNG 格式</p>
                      </div>
                    )}
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* 模板选择区域 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Grid3x3 className="w-5 h-5 mr-2" />
                  选择设计模板
                </CardTitle>
                <CardDescription>
                  分别选择店招、海报、头像三种类型的模板
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTemplates ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-sm text-gray-600">加载模板中...</p>
                  </div>
                ) : (
                  <Tabs defaultValue="avatar" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="avatar" className="text-xs">👤 头像</TabsTrigger>
                      <TabsTrigger value="storefront" className="text-xs">🏪 店招</TabsTrigger>
                      <TabsTrigger value="poster" className="text-xs">📢 海报</TabsTrigger>
                    </TabsList>

                    <TabsContent value="avatar" className="space-y-3 mt-4">
                      <select
                        value={avatarCategory}
                        onChange={(e) => setAvatarCategory(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="">请选择头像模板分类...</option>
                        {avatarTemplateCategories.map((category) => (
                          <option key={category.category} value={category.category}>
                            {category.categoryDisplayName} ({category.templates.length}个模板)
                          </option>
                        ))}
                      </select>
                      {avatarCategory && (
                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                          {sortTemplatesByNumber(
                            avatarTemplateCategories
                              .find(cat => cat.category === avatarCategory)
                              ?.templates || []
                          ).map((template) => (
                              <div
                                key={template.id}
                                onClick={() => handleTemplateSelect(template, 'avatar')}
                                className={`border-2 rounded-lg p-2 cursor-pointer transition-all ${
                                  avatarTemplate?.id === template.id
                                    ? 'border-purple-500 bg-purple-100'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <img
                                  src={template.url}
                                  alt={template.name}
                                  className="w-full h-32 object-contain rounded mb-1 bg-gray-100"
                                />
                                <p className="text-xs text-center truncate">{template.name}</p>
                              </div>
                            ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="storefront" className="space-y-3 mt-4">
                      <select
                        value={storefrontCategory}
                        onChange={(e) => setStorefrontCategory(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">请选择店招模板分类...</option>
                        {storefrontTemplateCategories.map((category) => (
                          <option key={category.category} value={category.category}>
                            {category.categoryDisplayName} ({category.templates.length}个模板)
                          </option>
                        ))}
                      </select>
                      {storefrontCategory && (
                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                          {sortTemplatesByNumber(
                            storefrontTemplateCategories
                              .find(cat => cat.category === storefrontCategory)
                              ?.templates || []
                          ).map((template) => (
                              <div
                                key={template.id}
                                onClick={() => handleTemplateSelect(template, 'storefront')}
                                className={`border-2 rounded-lg p-2 cursor-pointer transition-all ${
                                  storefrontTemplate?.id === template.id
                                    ? 'border-green-500 bg-green-100'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <img
                                  src={template.url}
                                  alt={template.name}
                                  className="w-full h-32 object-contain rounded mb-1 bg-gray-100"
                                />
                                <p className="text-xs text-center truncate">{template.name}</p>
                              </div>
                            ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="poster" className="space-y-3 mt-4">
                      <select
                        value={posterCategory}
                        onChange={(e) => setPosterCategory(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">请选择海报模板分类...</option>
                        {posterTemplateCategories.map((category) => (
                          <option key={category.category} value={category.category}>
                            {category.categoryDisplayName} ({category.templates.length}个模板)
                          </option>
                        ))}
                      </select>
                      {posterCategory && (
                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                          {sortTemplatesByNumber(
                            posterTemplateCategories
                              .find(cat => cat.category === posterCategory)
                              ?.templates || []
                          ).map((template) => (
                              <div
                                key={template.id}
                                onClick={() => handleTemplateSelect(template, 'poster')}
                                className={`border-2 rounded-lg p-2 cursor-pointer transition-all ${
                                  posterTemplate?.id === template.id
                                    ? 'border-blue-500 bg-blue-100'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <img
                                  src={template.url}
                                  alt={template.name}
                                  className="w-full h-32 object-contain rounded mb-1 bg-gray-100"
                                />
                                <p className="text-xs text-center truncate">{template.name}</p>
                              </div>
                            ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>


            {/* 三个独立的生成按钮 */}
            <div className="space-y-3">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">选择要生成的设计类型</h3>
                <p className="text-sm text-gray-600">点击对应按钮生成单个类型的设计图片</p>
              </div>

              {/* 头像生成按钮 - 需要店铺信息 */}
              <Button
                onClick={() => handleGenerateType('avatar')}
                disabled={avatarGenerating || !storeName.trim() || !templateStoreName.trim() || !dishImage || !avatarTemplate}
                className="w-full h-12 text-lg bg-purple-600 hover:bg-purple-700 text-white"
              >
                {avatarGenerating ? (
                  <>
                    <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                    AI生成头像中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    👤 生成头像设计 (800×800)
                  </>
                )}
              </Button>

              {/* 店招生成按钮 - 不需要店铺信息 */}
              <Button
                onClick={() => handleGenerateType('storefront')}
                disabled={storefrontGenerating || !dishImage || !storefrontTemplate}
                className="w-full h-12 text-lg bg-green-600 hover:bg-green-700 text-white"
              >
                {storefrontGenerating ? (
                  <>
                    <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                    AI生成店招中...
                  </>
                ) : (
                  <>
                    <Store className="w-5 h-5 mr-2" />
                    🏪 生成店招设计 (1280×720)
                  </>
                )}
              </Button>

              {/* 海报生成按钮 - 不需要店铺信息 */}
              <Button
                onClick={() => handleGenerateType('poster')}
                disabled={posterGenerating || !dishImage || !posterTemplate}
                className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                {posterGenerating ? (
                  <>
                    <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                    AI生成海报中...
                  </>
                ) : (
                  <>
                    <FileImage className="w-5 h-5 mr-2" />
                    📢 生成海报设计 (1440×480)
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 结果展示区域 - 全宽显示 */}
          {(avatarResult || storefrontResult || posterResult) && (
            <div className="space-y-4">
            {jobStatus && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">生成进度</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <Progress value={jobStatus.progress} className="w-full h-2" />
                    <p className="text-xs text-gray-600">
                      状态: {jobStatus.status === 'queued' && '等待中...'}
                      {jobStatus.status === 'running' && '生成中...'}
                      {jobStatus.status === 'succeeded' && '完成！'}
                      {jobStatus.status === 'failed' && '失败'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 批量下载按钮 - 放在生成进度框下方 */}
            {(storefrontResult && posterResult && avatarResult) && (
              <div className="flex justify-center">
                <Button
                  onClick={async () => {
                    await Promise.all([
                      downloadImage(storefrontResult!, `${storeName}-店招设计.png`),
                      downloadImage(posterResult!, `${storeName}-海报设计.png`),
                      downloadImage(avatarResult!, `${storeName}-头像设计.png`)
                    ]);
                  }}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                >
                  📦 批量下载全部图片
                </Button>
              </div>
            )}

            {/* 显示所有生成的结果 */}
            <div className="space-y-4">
                {/* 融合设计结果展示 */}
                <div className="space-y-3">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      🎉 店铺店招海报和头像设计方案已完成
                    </h3>
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg mb-4 border border-amber-200">
                      <p className="text-sm font-medium text-gray-800 mb-2">
                        尊敬的 <span className="text-orange-600 font-semibold">{storeName}</span> 老板您好：
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed mb-2">
                        您的专属品牌视觉设计方案已经完成。这套设计方案基于<span className="font-semibold">AI大数据分析</span>和<span className="font-semibold">商圈竞品研究</span>，
                        已在<span className="text-orange-600 font-semibold">超过1000家</span>同类店铺验证，平均提升<span className="text-orange-600 font-semibold">35%点击率</span>和
                        <span className="text-orange-600 font-semibold">28%转化率</span>。
                      </p>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        我们采用行业领先的<span className="font-semibold">视觉营销策略</span>，确保您的店铺在商圈中<span className="font-semibold">脱颖而出</span>，
                        建立<span className="font-semibold">专业品牌形象</span>，有效提升<span className="text-orange-600 font-semibold">曝光度、入店率和下单转化</span>。
                      </p>
                      <div className="mt-3 pt-3 border-t border-amber-200">
                        <p className="text-xs font-semibold text-orange-700">
                          ⭐ 核心优势：商圈最优视觉方案 | 数据驱动设计 | 专业团队定制 | 即刻上线见效
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {/* 店招设计 */}
                    {storefrontResult && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 左侧：图片展示 */}
                        <Card className="border-l-4 border-l-green-500 min-w-[400px]">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                              <CardTitle className="flex items-center text-base">
                                🏦 店招设计
                                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                  1280×720
                                </span>
                              </CardTitle>
                              <p className="text-xs text-gray-600 mt-1">适合外卖平台店铺展示</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadImage(storefrontResult, `${storeName}-店招设计.png`)}
                            >
                              下载
                            </Button>
                          </CardHeader>
                          <CardContent>
                            <img
                              src={storefrontResult}
                              alt="店招设计"
                              className="w-full h-auto rounded-lg border"
                              style={{ maxWidth: '640px', margin: '0 auto', display: 'block' }}
                            />
                          </CardContent>
                        </Card>

                        {/* 右侧：价值说明 */}
                        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center text-green-800">
                              🎯 店招设计核心价值
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-start">
                              <span className="text-green-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">入店提升：</span>
                                专业头像让店铺更醒目，提高25-35%点击进店率
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-green-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">品牌任度：</span>
                                独特头像形成品牌标识，增加70%品牌记忆度
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-green-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">新客获取：</span>
                                吸引新客尝试，首单转化率提升20%以上
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-green-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">品牌调性：</span>
                                专业视觉设计提升店铺档次，在同商圈中脱颖而出
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-green-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">信任背书：</span>
                                精美店招展示专业实力，顾客更愿意下单
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-green-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">数据支持：</span>
                                基于1000+商家数据验证，转化率提升15-30%
                              </div>
                            </div>
                            <div className="bg-green-100 bg-opacity-60 p-3 rounded-lg mt-3">
                              <p className="text-xs text-green-800 font-medium leading-relaxed">
                                💡 <span className="font-bold">专业建议：</span>
                                头像是店铺的第一印象，是提升流量的关键入口。优质店招设计已成为头部商家标配，是在激烈竞争中脱颖而出的必要投资。
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* 海报设计 */}
                    {posterResult && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 左侧：图片展示 */}
                        <Card className="border-l-4 border-l-blue-500 min-w-[400px]">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                              <CardTitle className="flex items-center text-base">
                                📢 海报设计
                                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                  1440×480
                                </span>
                              </CardTitle>
                              <p className="text-xs text-gray-600 mt-1">适合广告宣传和品牌推广</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadImage(posterResult, `${storeName}-海报设计.png`)}
                            >
                              下载
                            </Button>
                          </CardHeader>
                          <CardContent>
                            <img
                              src={posterResult}
                              alt="海报设计"
                              className="w-full h-auto rounded-lg border"
                              style={{ maxWidth: '720px', margin: '0 auto', display: 'block' }}
                            />
                          </CardContent>
                        </Card>

                        {/* 右侧：价值说明 */}
                        <Card className="bg-gradient-to-br from-blue-50 to-sky-50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center text-blue-800">
                              📈 海报设计营销价值
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-start">
                              <span className="text-blue-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">营销传播力：</span>
                                醒目视觉设计提高3倍社交分享率，扩大品牌影响范围
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-blue-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">活动转化率：</span>
                                专业海报让促销活动参与度提升40%，直接拉动销售
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-blue-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">品牌记忆度：</span>
                                统一视觉风格加深品牌印象，提高60%复购意向
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-blue-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">促销助推：</span>
                                特色海报吸引眼球，新品推广成功率提升50%
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-blue-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">平台权重：</span>
                                优质视觉内容获得平台更多曝光机会，流量倾斜
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-blue-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">竞品差异：</span>
                                与同类店铺形成明显对比，占领用户心智
                              </div>
                            </div>
                            <div className="bg-blue-100 bg-opacity-60 p-3 rounded-lg mt-3">
                              <p className="text-xs text-blue-800 font-medium leading-relaxed">
                                💡 <span className="font-bold">专业建议：</span>
                                海报是最有效的营销工具之一。优质海报设计能让营销投入产生2-3倍回报效果，特别是在节日大促期间，优秀海报能显著提升店铺业绩。
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* 头像设计 */}
                    {avatarResult && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 左侧：图片展示 */}
                        <Card className="border-l-4 border-l-purple-500 min-w-[400px]">
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                              <CardTitle className="flex items-center text-base">
                                👤 头像设计
                                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                                  800×800
                                </span>
                              </CardTitle>
                              <p className="text-xs text-gray-600 mt-1">适合社交媒体和品牌标识</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadImage(avatarResult, `${storeName}-头像设计.png`)}
                            >
                              下载
                            </Button>
                          </CardHeader>
                          <CardContent>
                            <img
                              src={avatarResult}
                              alt="头像设计"
                              className="w-full h-auto rounded-lg border"
                              style={{ maxWidth: '400px', margin: '0 auto', display: 'block' }}
                            />
                          </CardContent>
                        </Card>

                        {/* 右侧：价值说明 */}
                        <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center text-purple-800">
                              ⭐ 头像设计核心价值
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-start">
                              <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">入店率提升：</span>
                                专业头像让店铺更醒目，提高25-35%点击进店率
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">品牌识别度：</span>
                                独特头像形成品牌标识，增加70%品牌记忆度
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">新客获取：</span>
                                吸引新客尝试，首单转化率提升20%以上
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">搜索排名：</span>
                                优质头像有助于提升平台搜索权重，增加曝光
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">用户信任：</span>
                                专业设计传递品质保证，减少用户决策犹豫
                              </div>
                            </div>
                            <div className="flex items-start">
                              <span className="text-purple-600 mr-2 mt-0.5">✓</span>
                              <div className="text-sm">
                                <span className="font-medium">长期效应：</span>
                                持续积累品牌资产，形成竞争壁垒
                              </div>
                            </div>
                            <div className="bg-purple-100 bg-opacity-60 p-3 rounded-lg mt-3">
                              <p className="text-xs text-purple-800 font-medium leading-relaxed">
                                💡 <span className="font-bold">专业建议：</span>
                                头像是店铺的门面和名片，是顾客第一印象的关键。在列表页竞争中，90%的用户会先看头像再决定是否点击，优质头像设计是TOP商家的标配。
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
