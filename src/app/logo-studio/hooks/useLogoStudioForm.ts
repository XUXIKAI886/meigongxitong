'use client';

import { useState } from 'react';

/**
 * 压缩图片文件
 * @param file 原始图片文件
 * @param maxWidth 最大宽度（默认1920）
 * @param maxHeight 最大高度（默认1920）
 * @param quality 压缩质量（0-1，默认0.85）
 * @returns 压缩后的Blob
 */
async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // 计算缩放比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取Canvas上下文'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('图片压缩失败'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

// Logo Studio 表单与菜品图片上传管理
export function useLogoStudioForm() {
  const [storeName, setStoreName] = useState('');
  const [templateStoreName, setTemplateStoreName] = useState('');
  const [dishImage, setDishImage] = useState<File | null>(null);
  const [dishImagePreview, setDishImagePreview] = useState('');

  const handleDishImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      // 压缩图片
      console.log('[useLogoStudioForm] 原始文件大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      const compressedBlob = await compressImage(file, 1920, 1920, 0.85);
      console.log('[useLogoStudioForm] 压缩后大小:', (compressedBlob.size / 1024 / 1024).toFixed(2), 'MB');

      // 转换为File对象
      const compressedFile = new File([compressedBlob], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      setDishImage(compressedFile);

      // 生成预览
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          setDishImagePreview(e.target.result);
        }
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('[useLogoStudioForm] 图片压缩失败:', error);
      // 压缩失败时使用原始文件
      setDishImage(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          setDishImagePreview(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
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
