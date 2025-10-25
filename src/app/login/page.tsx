'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SparklesIcon, LockIcon, ArrowRightIcon } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 模拟加载延迟，提升用户体验
    setTimeout(() => {
      if (password === 'csch903') {
        // 登录成功，保存到localStorage
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('loginTime', new Date().toISOString());
        router.push('/');
      } else {
        setError('密码错误，请重试');
        setIsLoading(false);
        setPassword('');
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/20 via-transparent to-pink-100/20"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F97316' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-orange-400/20 to-red-500/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-to-br from-pink-400/20 to-orange-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section - 营销文案 */}
          <div className="text-center mb-12">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-2xl">
                <SparklesIcon className="h-12 w-12 text-white" />
              </div>
            </div>

            {/* 主标题 */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-orange-800 to-red-900 bg-clip-text text-transparent mb-6 leading-tight">
              美团+饿了么全套店铺装修<br className="hidden md:block" />
              AI一键生成，告别传统设计的漫长等待
            </h1>

            {/* 三大亮点卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
              {/* 极速交付 */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-5 border-2 border-orange-200 shadow-lg">
                <div className="text-3xl mb-3">✨</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">极速交付</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  日均产能100+店铺<br />
                  批量装修也能快速完成
                </p>
              </div>

              {/* 全套覆盖 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border-2 border-blue-200 shadow-lg">
                <div className="text-3xl mb-3">✨</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">全套覆盖</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  三件套+P门头+图片墙<br />
                  全店图+套餐图一站配齐
                </p>
              </div>

              {/* 专业品质 */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border-2 border-purple-200 shadow-lg">
                <div className="text-3xl mb-3">✨</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">专业品质</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  AI精准适配双平台规范<br />
                  让您的店铺脱颖而出
                </p>
              </div>
            </div>

            {/* 底部Slogan */}
            <div className="mb-10">
              <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent leading-relaxed">
                从视觉优化到品牌升级，用AI重新定义外卖装修效率
              </p>
            </div>
          </div>

          {/* 登录卡片 */}
          <div className="max-w-md mx-auto">
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                  <LockIcon className="h-6 w-6 text-orange-600" />
                  <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    系统登录
                  </span>
                </CardTitle>
                <CardDescription className="text-center text-base">
                  输入密码访问美工设计系统
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">
                      访问密码
                    </label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="请输入访问密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 text-base border-2 focus:border-orange-500 focus:ring-orange-500"
                      disabled={isLoading}
                      autoFocus
                    />
                    {error && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <span className="text-red-500">⚠️</span>
                        {error}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !password}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span>
                        验证中...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        进入系统
                        <ArrowRightIcon className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>

                {/* 提示信息 */}
                <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                  <p className="text-xs text-gray-600 text-center leading-relaxed">
                    <span className="font-semibold text-orange-700">💡 提示：</span>
                    本系统仅供授权用户使用，请妥善保管访问密码
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 底部信息 */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                © 2025 呈尚策划 美工设计系统
              </p>
              <p className="text-xs text-gray-500 mt-2">
                基于先进AI技术，为外卖商家提供专业的图片智能设计服务
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
