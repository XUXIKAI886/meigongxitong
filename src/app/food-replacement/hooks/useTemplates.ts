import { useState, useCallback } from 'react';
import { Template } from '../types';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // 加载模板列表
  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // 选择模板
  const selectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
  }, []);

  // 清除模板选择
  const clearTemplateSelection = useCallback(() => {
    setSelectedTemplate(null);
  }, []);

  return {
    // 状态
    templates,
    selectedTemplate,
    showTemplateSelector,
    loadingTemplates,

    // 操作
    loadTemplates,
    selectTemplate,
    clearTemplateSelection,
    setShowTemplateSelector,
  };
}