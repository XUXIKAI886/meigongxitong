'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ImageIcon,
  PaletteIcon,
  TypeIcon,
  LayoutGridIcon,
  ArrowRightIcon,
  SparklesIcon,
  Wand2Icon,
  RefreshCwIcon,
  BlendIcon,
  LayersIcon,
  HardDriveIcon,
  LogOutIcon
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 检查登录状态
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/login');
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  // 退出登录
  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('loginTime');
      router.push('/login');
    }
  };

  // 正在检查登录状态时显示加载界面
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证身份...</p>
        </div>
      </div>
    );
  }

  // 清空所有生成的图片文件
  const cleanupGeneratedImages = async () => {
    if (!confirm('确定要清空所有生成的图片吗？这将删除服务器上的所有生成图片文件以节省空间，但不会影响各功能的正常使用。')) {
      return;
    }

    setIsCleaningUp(true);

    try {
      const response = await fetch('/api/files/cleanup', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.ok) {
        console.log('清理成功:', data);
        alert(
          `系统清理完成！\n\n` +
          `🗑️ 删除文件: ${data.deletedCount} 个\n` +
          `💾 释放空间: ${data.totalSizeMB}MB\n\n` +
          `系统已恢复到干净状态，所有功能均可正常使用。${data.errors ? `\n⚠️ 注意: 部分文件删除失败` : ''}`
        );
      } else {
        console.error('清理失败:', data);
        alert(`系统清理失败: ${data.error || data.details || '未知错误'}\n\n请稍后重试或联系技术支持。`);
      }
    } catch (error) {
      console.error('清理请求失败:', error);
      alert('清理请求失败，请检查网络连接后重试。');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const features = [
    {
      id: 'logo-studio',
      title: 'Logo设计工作室（三件套）',
      description: '参考Logo反推提示词，生成店铺Logo、店招和海报',
      icon: PaletteIcon,
      href: '/logo-studio',
      color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      outputSize: 'Logo 800×800px, 店招 1280×720px, 海报 1440×480px',
      features: ['Logo分析', '提示词反推', '品牌设计', '多尺寸输出']
    },
    {
      id: 'signboard',
      title: '门头招牌文字替换（P门头）',
      description: '上传门头照片，智能替换文字内容，实现拟真P图效果',
      icon: TypeIcon,
      href: '/signboard',
      color: 'bg-gradient-to-br from-orange-500 to-red-600',
      outputSize: '4693×3520px',
      features: ['文字识别', '透视保持', '光影匹配', '自然融合']
    },
    {
      id: 'picture-wall',
      title: '图片墙生成（图片墙三张）',
      description: '上传店铺头像，反推风格并生成三张统一风格的图片墙',
      icon: LayoutGridIcon,
      href: '/picture-wall',
      color: 'bg-gradient-to-br from-purple-500 to-violet-600',
      outputSize: '3张 4800×6600px',
      features: ['风格分析', '统一设计', '批量生成', '品牌一致性']
    },
    {
      id: 'food-replacement',
      title: '食物替换工具（外卖全店图制作）',
      description: '将源图片中的食物智能替换到目标图片的碗中，AI自动匹配光影和透视',
      icon: RefreshCwIcon,
      href: '/food-replacement',
      color: 'bg-gradient-to-br from-amber-500 to-orange-600',
      outputSize: '美团1200×900px、饿了么800×800px',
      features: ['智能提取', '食物替换', '光影匹配', '透视校正', '自然融合']
    },
    {
      id: 'background-fusion',
      title: '背景融合工具（不需要碗的单品图）',
      description: '将美食完美融合到目标背景中，创造令人垂涎的视觉效果，增强食欲感',
      icon: BlendIcon,
      href: '/background-fusion',
      color: 'bg-gradient-to-br from-red-500 to-pink-600',
      outputSize: '美团1200×900px、饿了么800×800px',
      features: ['背景融合', '食欲增强', '光影匹配', '商业品质', '批量处理']
    },
    {
      id: 'multi-fusion',
      title: '多图融合工具（外卖套餐图制作）',
      description: '将多张美食图片智能融合到同一背景中，生成高度一致的套餐图，完美展示美食组合',
      icon: LayersIcon,
      href: '/multi-fusion',
      color: 'bg-gradient-to-br from-purple-500 to-pink-600',
      outputSize: '1200×900px',
      features: ['多图融合', '套餐展示', '风格统一', '商业品质', '智能排列']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-indigo-50/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      {/* Header */}
      <header className="border-b border-white/20 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <SparklesIcon className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                美工设计系统
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={cleanupGeneratedImages}
                disabled={isCleaningUp}
                className="flex items-center gap-2 text-orange-600 border-orange-600 hover:bg-orange-50 shadow-sm"
                title="清理服务器上所有生成的图片文件，释放磁盘空间"
              >
                <HardDriveIcon className="w-4 h-4" />
                {isCleaningUp ? '清理中...' : '清理磁盘'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 border-red-600 hover:bg-red-50 shadow-sm"
                title="退出登录"
              >
                <LogOutIcon className="w-4 h-4" />
                退出登录
              </Button>
              <Badge variant="secondary" className="text-sm px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 shadow-sm">
                外卖商家图片智能设计生成系统
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={feature.id} className="group relative overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-2xl">
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <CardHeader className="pb-4 relative z-10">
                    <div className="flex items-center mb-4">
                      <div className={`p-4 rounded-2xl ${feature.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="h-7 w-7" />
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300 mb-3">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600 leading-relaxed text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 relative z-10">
                    <div className="space-y-5">
                      <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl p-4 border border-gray-100">
                        <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          输出规格
                        </p>
                        <Badge variant="outline" className="text-xs px-3 py-1 bg-white border-blue-200 text-blue-700 font-medium">
                          {feature.outputSize}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                          核心功能
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {feature.features.map((feat, featIndex) => (
                            <Badge
                              key={featIndex}
                              variant="secondary"
                              className="text-xs px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-0 hover:from-blue-100 hover:to-blue-200 hover:text-blue-700 transition-all duration-200 cursor-default"
                            >
                              {feat}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Link href={feature.href} className="block">
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group border-0">
                          <span className="flex items-center justify-center">
                            开始使用
                            <ArrowRightIcon className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                          </span>
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-t border-gray-200/50 py-12 mt-20 relative">
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="flex items-center justify-center mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg mr-3">
              <SparklesIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              美工设计系统
            </span>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed max-w-md mx-auto">
            © 2025 呈尚策划 美工设计系统 基于先进AI技术
          </p>
          <div className="mt-6 flex justify-center space-x-6">
            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"></div>
            <div className="w-12 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"></div>
            <div className="w-12 h-1 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full"></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
