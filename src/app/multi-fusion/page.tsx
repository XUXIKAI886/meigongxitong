'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Upload, Download, Loader2, Grid, Image as ImageIcon, Trash2, ArrowLeft, Plus, X } from 'lucide-react';

export default function MultiFusionPage() {
  // 多张源图片状态
  const [sourceImages, setSourceImages] = useState<File[]>([]);
  const [sourceImagePreviews, setSourceImagePreviews] = useState<string[]>([]);
  
  // 目标背景状态
  const [targetImage, setTargetImage] = useState<File | null>(null);
  const [targetImagePreview, setTargetImagePreview] = useState<string | null>(null);
  
  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  // 模板相关状态
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);



  // 加载模板 - 使用背景融合工具的模板API
  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/background-fusion/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 选择模板
  const selectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setTargetImage(null);
    setTargetImagePreview(template.url);
  };

  // 清除模板选择
  const clearTemplateSelection = () => {
    setSelectedTemplate(null);
    setTargetImagePreview(null);
  };

  // 页面加载时加载模板
  useEffect(() => {
    loadTemplates();
  }, []);

  // 处理多张源图片上传
  const handleSourceImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 限制最多上传8张图片
    const maxFiles = 8;
    const selectedFiles = files.slice(0, maxFiles);
    
    setSourceImages(prev => [...prev, ...selectedFiles].slice(0, maxFiles));
    
    // 生成预览
    selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSourceImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 删除源图片
  const removeSourceImage = (index: number) => {
    setSourceImages(prev => prev.filter((_, i) => i !== index));
    setSourceImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // 处理目标背景上传
  const handleTargetImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTargetImage(file);
    clearTemplateSelection();
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setTargetImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 轮询作业状态
  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        const apiResponse = await response.json();
        
        if (apiResponse.ok && apiResponse.job) {
          const job = apiResponse.job;
          
          setProgress(job.progress || 0);
          setStatusMessage(job.status === 'running' ? '正在生成套餐图...' : '处理中...');

          if (job.status === 'succeeded') {
            setResult(job.result?.imageUrl || job.result);
            setIsProcessing(false);
            setCurrentJobId(null);
            setProgress(100);
            setStatusMessage('套餐图生成完成！');
            

            
            return;
          } else if (job.status === 'failed') {
            throw new Error(job.error || '处理失败');
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          throw new Error('处理超时');
        }
      } catch (error) {
        console.error('Polling error:', error);
        setIsProcessing(false);
        setCurrentJobId(null);
        setStatusMessage('处理失败，请重试');
      }
    };

    poll();
  };

  // 开始多图融合
  const handleMultiFusion = async () => {
    if (sourceImages.length === 0) {
      alert('请至少上传一张源图片');
      return;
    }

    if (!targetImage && !selectedTemplate) {
      alert('请选择目标背景或上传背景图片');
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setProgress(0);
    setStatusMessage('正在上传图片...');

    try {
      const formData = new FormData();
      
      // 添加所有源图片
      sourceImages.forEach((file, index) => {
        formData.append(`sourceImages`, file);
      });
      
      // 添加目标背景
      if (targetImage) {
        formData.append('targetImage', targetImage);
      } else if (selectedTemplate) {
        formData.append('templateUrl', selectedTemplate.url);
      }

      const response = await fetch('/api/multi-fusion', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // 如果API直接返回了结果，立即显示
        if (data.result) {
          setResult(data.result.imageUrl || data.result);
          setIsProcessing(false);
          setCurrentJobId(null);
          setProgress(100);
          setStatusMessage('套餐图生成完成！');


        } else {
          // 否则开始轮询
          setCurrentJobId(data.jobId);
          setStatusMessage('开始处理...');
          pollJobStatus(data.jobId);
        }
      } else {
        throw new Error(data.error || '提交失败');
      }
    } catch (error) {
      console.error('Multi-fusion error:', error);
      setIsProcessing(false);
      setStatusMessage('处理失败，请重试');
    }
  };

  // 下载结果
  const downloadResult = () => {
    if (!result) return;
    
    const link = document.createElement('a');
    link.href = result;
    link.download = `multi-fusion-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 清除所有状态
  const clearAll = () => {
    setSourceImages([]);
    setSourceImagePreviews([]);
    setTargetImage(null);
    setTargetImagePreview(null);
    setSelectedTemplate(null);
    setResult(null);
    setProgress(0);
    setStatusMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-100/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/20 via-transparent to-pink-50/20"></div>
      </div>
      
      {/* Header */}
      <header className="border-b border-white/20 bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="h-5 w-5" />
                <span>返回首页</span>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                  <Grid className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  多图融合工具
                </h1>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-2 rounded-lg border border-purple-200">
              F8 - 套餐图生成
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* 功能说明 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 border border-white/20">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center">
              <ImageIcon className="h-5 w-5 mr-2 text-purple-600" />
              多图融合套餐图生成
            </h2>
            <p className="text-gray-600 leading-relaxed">
              上传多张美食图片，选择一个背景模板，AI将智能地将所有美食融合到同一个背景中，
              生成具有高度一致性的外卖店铺套餐图，完美展示您的美食组合。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">多图融合</span>
              <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">套餐展示</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">风格统一</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">商业品质</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 左侧：图片上传区域 */}
            <div className="space-y-6">
              {/* 源图片上传 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Upload className="h-5 w-5 mr-2 text-purple-600" />
                  上传源图片 ({sourceImages.length}/8)
                </h3>

                {/* 源图片预览网格 */}
                {sourceImagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                    {sourceImagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`源图片 ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-gray-200 group-hover:border-purple-300 transition-colors"
                        />
                        <button
                          onClick={() => removeSourceImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {/* 添加更多图片按钮 */}
                    {sourceImages.length < 8 && (
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-purple-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors">
                        <Plus className="h-6 w-6 text-purple-400 mb-1" />
                        <span className="text-xs text-purple-600">添加图片</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleSourceImagesChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* 初始上传区域 */}
                {sourceImagePreviews.length === 0 && (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-10 w-10 text-purple-400 mb-3" />
                      <p className="mb-2 text-sm text-gray-600">
                        <span className="font-semibold">点击上传</span> 或拖拽图片到此处
                      </p>
                      <p className="text-xs text-gray-500">支持 PNG, JPG, JPEG 格式，最多8张图片</p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleSourceImagesChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* 目标背景选择 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2 text-purple-600" />
                  选择背景
                </h3>

                <div className="space-y-4">
                  {/* 模板选择按钮 */}
                  <button
                    onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg"
                  >
                    <Grid className="h-5 w-5 mr-2" />
                    {selectedTemplate ? '更换背景模板' : '选择背景模板'}
                  </button>

                  {/* 或者分隔线 */}
                  <div className="flex items-center">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="px-3 text-sm text-gray-500">或者</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>

                  {/* 自定义背景上传 */}
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors">
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">上传自定义背景</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleTargetImageChange}
                      className="hidden"
                    />
                  </label>

                  {/* 背景预览 */}
                  {targetImagePreview && (
                    <div className="relative">
                      <img
                        src={targetImagePreview}
                        alt="目标背景"
                        className="w-full h-48 object-cover rounded-xl border-2 border-purple-200"
                      />
                      <button
                        onClick={() => {
                          setTargetImage(null);
                          setTargetImagePreview(null);
                          clearTemplateSelection();
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 右侧：处理结果区域 */}
            <div className="space-y-6">
              {/* 操作按钮 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
                <div className="space-y-4">
                  <button
                    onClick={handleMultiFusion}
                    disabled={isProcessing || sourceImages.length === 0 || (!targetImage && !selectedTemplate)}
                    className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg text-lg font-semibold"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Grid className="h-5 w-5 mr-2" />
                        开始多图融合
                      </>
                    )}
                  </button>

                  <button
                    onClick={clearAll}
                    className="w-full flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    清除所有
                  </button>
                </div>

                {/* 进度显示 */}
                {isProcessing && (
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{statusMessage}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* 结果显示 */}
              {result && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <ImageIcon className="h-5 w-5 mr-2 text-green-600" />
                    套餐图生成结果
                  </h3>
                  <div className="space-y-4">
                    <img
                      src={result}
                      alt="多图融合结果"
                      className="w-full rounded-xl border-2 border-green-200 shadow-lg"
                    />
                    <button
                      onClick={downloadResult}
                      className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      下载套餐图
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 模板选择器 */}
          {showTemplateSelector && (
            <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Grid className="h-5 w-5 mr-2 text-purple-600" />
                  选择背景模板
                </h3>
                <button
                  onClick={() => setShowTemplateSelector(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {loadingTemplates ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  <span className="ml-2 text-gray-600">加载模板中...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {templates.map((template, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        selectTemplate(template);
                        setShowTemplateSelector(false);
                      }}
                      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                        selectedTemplate?.url === template.url
                          ? 'border-purple-500 shadow-lg'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div style={{ position: 'relative', width: '100%', height: '128px' }}>
                        <img
                          src={template.url}
                          alt={template.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background-color 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                          const span = e.currentTarget.querySelector('span');
                          if (span) span.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0)';
                          const span = e.currentTarget.querySelector('span');
                          if (span) span.style.opacity = '0';
                        }}>
                          <span style={{
                            color: 'white',
                            fontWeight: '500',
                            opacity: '0',
                            transition: 'opacity 0.3s ease'
                          }}>
                            选择此模板
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
