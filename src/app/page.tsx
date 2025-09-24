import Link from 'next/link';
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
  BlendIcon
} from 'lucide-react';

export default function HomePage() {
  const features = [
    {
      id: 'product-image',
      title: '单品图抠图换背景',
      description: '智能抠图并更换背景，提升外卖单品图的高清感和设计感',
      icon: ImageIcon,
      href: '/product-image',
      badge: 'F1',
      color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      outputSize: '1200×900px',
      features: ['智能抠图', '背景替换', '清晰增强', '多种背景选择']
    },
    {
      id: 'logo-studio',
      title: 'Logo设计工作室',
      description: '参考Logo反推提示词，生成店铺Logo、店招和海报',
      icon: PaletteIcon,
      href: '/logo-studio',
      badge: 'F2',
      color: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      outputSize: 'Logo 800×800px, 店招 1280×720px, 海报 1440×480px',
      features: ['Logo分析', '提示词反推', '品牌设计', '多尺寸输出']
    },
    {
      id: 'signboard',
      title: '门头招牌文字替换',
      description: '上传门头照片，智能替换文字内容，实现拟真P图效果',
      icon: TypeIcon,
      href: '/signboard',
      badge: 'F3',
      color: 'bg-gradient-to-br from-orange-500 to-red-600',
      outputSize: '4693×3520px',
      features: ['文字识别', '透视保持', '光影匹配', '自然融合']
    },
    {
      id: 'picture-wall',
      title: '图片墙生成',
      description: '上传店铺头像，反推风格并生成三张统一风格的图片墙',
      icon: LayoutGridIcon,
      href: '/picture-wall',
      badge: 'F4',
      color: 'bg-gradient-to-br from-purple-500 to-violet-600',
      outputSize: '3张 4800×6600px',
      features: ['风格分析', '统一设计', '批量生成', '品牌一致性']
    },
    {
      id: 'product-refine',
      title: '产品精修',
      description: '专业菜品图片精修，统一45度角视角，色彩鲜艳，商业级品质提升',
      icon: Wand2Icon,
      href: '/product-refine',
      badge: 'F5',
      color: 'bg-gradient-to-br from-pink-500 to-rose-600',
      outputSize: '1200×900px',
      features: ['45度视角', '菜品补全', '瑕疵去除', '色彩鲜艳', '批量处理']
    },
    {
      id: 'food-replacement',
      title: '食物替换工具',
      description: '将源图片中的食物智能替换到目标图片的碗中，AI自动匹配光影和透视',
      icon: RefreshCwIcon,
      href: '/food-replacement',
      badge: 'F6',
      color: 'bg-gradient-to-br from-amber-500 to-orange-600',
      outputSize: '1200×900px',
      features: ['智能提取', '食物替换', '光影匹配', '透视校正', '自然融合']
    },
    {
      id: 'background-fusion',
      title: '背景融合工具',
      description: '将美食完美融合到目标背景中，创造令人垂涎的视觉效果，增强食欲感',
      icon: BlendIcon,
      href: '/background-fusion',
      badge: 'F7',
      color: 'bg-gradient-to-br from-red-500 to-pink-600',
      outputSize: '1200×900px',
      features: ['背景融合', '食欲增强', '光影匹配', '商业品质', '批量处理']
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
            <Badge variant="secondary" className="text-sm px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200 shadow-sm">
              外卖商家图片智能设计生成系统
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent mb-6 leading-tight">
              AI驱动的外卖设计解决方案
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              通过先进的AI技术，为外卖商家提供专业的图片设计服务。
              从单品图优化到品牌设计，一站式解决您的视觉营销需求。
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Badge variant="outline" className="text-base px-6 py-3 bg-white/80 backdrop-blur-sm border-blue-200 text-blue-700 hover:bg-blue-50 transition-all duration-300 shadow-sm">
                🎨 智能设计
              </Badge>
              <Badge variant="outline" className="text-base px-6 py-3 bg-white/80 backdrop-blur-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-all duration-300 shadow-sm">
                ⚡ 快速生成
              </Badge>
              <Badge variant="outline" className="text-base px-6 py-3 bg-white/80 backdrop-blur-sm border-purple-200 text-purple-700 hover:bg-purple-50 transition-all duration-300 shadow-sm">
                🎯 专业品质
              </Badge>
            </div>
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      </section>

      {/* Features Grid */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              7大核心功能模块
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              专业AI技术驱动，为您的外卖业务提供全方位的视觉设计解决方案
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={feature.id} className="group relative overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-2xl">
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <CardHeader className="pb-4 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-4 rounded-2xl ${feature.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="h-7 w-7" />
                      </div>
                      <Badge variant="secondary" className="text-sm px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 font-semibold border-0 shadow-sm">
                        {feature.badge}
                      </Badge>
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
