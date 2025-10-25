import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export function useImageUpload() {
  // 单张模式状态
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [targetImage, setTargetImage] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string>('');
  const [targetImagePreview, setTargetImagePreview] = useState<string>('');

  // 批量模式状态
  const [sourceImages, setSourceImages] = useState<File[]>([]);
  const [sourceImagePreviews, setSourceImagePreviews] = useState<string[]>([]);
  const [batchTargetImage, setBatchTargetImage] = useState<File | null>(null);
  const [batchTargetImagePreview, setBatchTargetImagePreview] = useState<string>('');

  // 单张模式 - 源图片上传
  const onSourceImageDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSourceImage(file);
      const reader = new FileReader();
      reader.onload = () => setSourceImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  // 单张模式 - 目标图片上传
  const onTargetImageDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setTargetImage(file);
      const reader = new FileReader();
      reader.onload = () => setTargetImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  // 批量模式 - 多张源图片上传
  const onBatchSourceImagesDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...sourceImages, ...acceptedFiles].slice(0, 10);
    setSourceImages(newFiles);

    const newPreviews: string[] = [];
    newFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        newPreviews[index] = reader.result as string;
        if (newPreviews.length === newFiles.length) {
          setSourceImagePreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [sourceImages]);

  // 批量模式 - 目标图片上传
  const onBatchTargetImageDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setBatchTargetImage(file);
      const reader = new FileReader();
      reader.onload = () => setBatchTargetImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  // 移除批量模式中的源图片
  const removeBatchSourceImage = useCallback((index: number) => {
    const newFiles = sourceImages.filter((_, i) => i !== index);
    const newPreviews = sourceImagePreviews.filter((_, i) => i !== index);
    setSourceImages(newFiles);
    setSourceImagePreviews(newPreviews);
  }, [sourceImages, sourceImagePreviews]);

  // 替换批量模式中指定索引的图片（用于抠图后替换）
  const replaceBatchSourceImage = useCallback((index: number, newFile: File) => {
    setSourceImages(prevImages => {
      const newImages = [...prevImages];
      newImages[index] = newFile;
      return newImages;
    });

    // 更新预览
    const reader = new FileReader();
    reader.onload = () => {
      setSourceImagePreviews(prevPreviews => {
        const newPreviews = [...prevPreviews];
        // 释放旧预览URL（如果是blob URL）
        if (prevPreviews[index] && prevPreviews[index].startsWith('blob:')) {
          URL.revokeObjectURL(prevPreviews[index]);
        }
        newPreviews[index] = reader.result as string;
        return newPreviews;
      });
    };
    reader.readAsDataURL(newFile);
  }, []);

  // 替换单张模式的源图片（用于抠图后替换）
  const replaceSourceImage = useCallback((newFile: File) => {
    setSourceImage(newFile);

    // 更新预览
    const reader = new FileReader();
    reader.onload = () => {
      // 释放旧预览URL（如果是blob URL）
      if (sourceImagePreview && sourceImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(sourceImagePreview);
      }
      setSourceImagePreview(reader.result as string);
    };
    reader.readAsDataURL(newFile);
  }, [sourceImagePreview]);

  // 设置风格预览
  const setTemplatePreview = useCallback((templateUrl: string, isBatchMode: boolean) => {
    if (isBatchMode) {
      setBatchTargetImagePreview(templateUrl);
      setBatchTargetImage(null);
    } else {
      setTargetImagePreview(templateUrl);
      setTargetImage(null);
    }
  }, []);

  // 清除预览
  const clearPreviews = useCallback(() => {
    setTargetImagePreview('');
    setBatchTargetImagePreview('');
  }, []);

  // dropzone配置
  const sourceDropzone = useDropzone({
    onDrop: onSourceImageDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  const targetDropzone = useDropzone({
    onDrop: onTargetImageDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  const batchSourceDropzone = useDropzone({
    onDrop: onBatchSourceImagesDrop,
    accept: { 'image/*': [] },
    multiple: true
  });

  const batchTargetDropzone = useDropzone({
    onDrop: onBatchTargetImageDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  return {
    // 状态
    sourceImage,
    targetImage,
    sourceImagePreview,
    targetImagePreview,
    sourceImages,
    sourceImagePreviews,
    batchTargetImage,
    batchTargetImagePreview,

    // dropzone
    sourceDropzone,
    targetDropzone,
    batchSourceDropzone,
    batchTargetDropzone,

    // 操作
    removeBatchSourceImage,
    replaceBatchSourceImage,  // 替换批量图片
    replaceSourceImage,       // 替换单张图片
    setTemplatePreview,
    clearPreviews,
    setSourceImages,
    setSourceImagePreviews,
  };
}