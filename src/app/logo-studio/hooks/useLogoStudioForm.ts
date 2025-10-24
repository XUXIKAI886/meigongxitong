'use client';

import { useState } from 'react';

// Logo Studio 表单与菜品图片上传管理
export function useLogoStudioForm() {
  const [storeName, setStoreName] = useState('');
  const [templateStoreName, setTemplateStoreName] = useState('');
  const [dishImage, setDishImage] = useState<File | null>(null);
  const [dishImagePreview, setDishImagePreview] = useState('');

  const handleDishImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setDishImage(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setDishImagePreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return {
    storeName,
    setStoreName,
    templateStoreName,
    setTemplateStoreName,
    dishImage,
    dishImagePreview,
    handleDishImageUpload,
  };
}
