import { useState, useCallback } from 'react';
import { Template } from '../types';

export function useTemplates() {
  const [meituanTemplates, setMeituanTemplates] = useState<Template[]>([]);
  const [elemeTemplates, setElemeTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(true); // 默认显示风格选择器
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<'meituan' | 'eleme'>('meituan'); // 当前选择的平台

  // 加载美团风格列表
  const loadMeituanTemplates = useCallback(async () => {
    setCurrentPlatform('meituan'); // 设置当前平台

    // 如果已经加载过，直接返回
    if (meituanTemplates.length > 0) {
      return;
    }

    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setMeituanTemplates(data.templates || []);
    } catch (error) {
      console.error('加载美团风格失败:', error);
    } finally {
      setLoadingTemplates(false);
    }
  }, [meituanTemplates.length]);

  // 加载饿了么风格列表
  const loadElemeTemplates = useCallback(async () => {
    setCurrentPlatform('eleme'); // 设置当前平台

    // 如果已经加载过，直接返回
    if (elemeTemplates.length > 0) {
      return;
    }

    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/eleme-templates');
      const data = await response.json();
      setElemeTemplates(data.templates || []);
    } catch (error) {
      console.error('加载饿了么风格失败:', error);
    } finally {
      setLoadingTemplates(false);
    }
  }, [elemeTemplates.length]);

  // 选择风格
  const selectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
  }, []);

  // 清除风格选择
  const clearTemplateSelection = useCallback(() => {
    setSelectedTemplate(null);
  }, []);

  return {
    // 状态
    meituanTemplates,
    elemeTemplates,
    selectedTemplate,
    showTemplateSelector,
    loadingTemplates,
    currentPlatform,

    // 操作
    loadMeituanTemplates,
    loadElemeTemplates,
    selectTemplate,
    clearTemplateSelection,
    setShowTemplateSelector,
  };
}