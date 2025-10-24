'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from './components/PageHeader';
import { StoreInfoCard } from './components/StoreInfoCard';
import { ManualDishUpload } from './components/ManualDishUpload';
import { DishUploadModeSelector, UploadMode } from './components/DishUploadModeSelector';
import { AIDishGenerator } from './components/AIDishGenerator';
import { TemplateSelector } from './components/TemplateSelector';
import { ActionPanel } from './components/ActionPanel';
import { ResultsSection } from './components/results/ResultsSection';
import { useLogoStudioForm } from './hooks/useLogoStudioForm';
import { useLogoStudioTemplates } from './hooks/useLogoStudioTemplates';
import { useLogoStudioGeneration } from './hooks/useLogoStudioGeneration';

export default function LogoStudioPage() {
  // 上传模式状态（手动上传 vs AI生成）
  const [uploadMode, setUploadMode] = useState<UploadMode>('manual');

  const form = useLogoStudioForm();
  const templates = useLogoStudioTemplates({
    setTemplateStoreName: form.setTemplateStoreName,
  });
  const generation = useLogoStudioGeneration({
    storeName: form.storeName,
    templateStoreName: form.templateStoreName,
    dishImage: form.dishImage,
    avatarTemplate: templates.avatarTemplate,
    storefrontTemplate: templates.storefrontTemplate,
    posterTemplate: templates.posterTemplate,
  });

  /**
   * 处理AI生成的图片应用
   * 将AI生成的File对象设置为菜品图
   */
  const handleAIImageApply = (imageFile: File) => {
    // 使用现有的handleDishImageUpload方法
    // 需要模拟一个ChangeEvent
    const mockEvent = {
      target: {
        files: [imageFile],
      },
    } as React.ChangeEvent<HTMLInputElement>;

    form.handleDishImageUpload(mockEvent);
  };

  const computedFlags = useMemo(() => {
    const hasDish = Boolean(form.dishImage);
    return {
      canAvatarStep1: hasDish && Boolean(templates.avatarTemplate),
      canAvatarStep2:
        hasDish &&
        Boolean(templates.avatarTemplate) &&
        Boolean(generation.avatarStep1Result) &&
        Boolean(form.storeName.trim()) &&
        Boolean(form.templateStoreName.trim()),
      canStorefront: hasDish && Boolean(templates.storefrontTemplate),
      canPoster: hasDish && Boolean(templates.posterTemplate),
    };
  }, [
    form.dishImage,
    form.storeName,
    form.templateStoreName,
    generation.avatarStep1Result,
    templates.avatarTemplate,
    templates.posterTemplate,
    templates.storefrontTemplate,
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader onBack={() => (window.location.href = '/')} />

        {/* 门店信息 */}
        <StoreInfoCard
          storeName={form.storeName}
          templateStoreName={form.templateStoreName}
          onStoreNameChange={form.setStoreName}
          onTemplateStoreNameChange={form.setTemplateStoreName}
        />

        {/* 上传模式选择 */}
        <DishUploadModeSelector mode={uploadMode} onChange={setUploadMode} />

        {/* 菜品图上传/生成 */}
        {uploadMode === 'manual' ? (
          <ManualDishUpload
            dishImagePreview={form.dishImagePreview}
            onDishImageChange={form.handleDishImageUpload}
          />
        ) : (
          <AIDishGenerator
            onApplyImage={handleAIImageApply}
            onModeChange={() => setUploadMode('manual')}
          />
        )}

        <TemplateSelector
          loading={templates.loadingTemplates}
          avatarCategory={templates.avatarCategory}
          storefrontCategory={templates.storefrontCategory}
          posterCategory={templates.posterCategory}
          setAvatarCategory={templates.setAvatarCategory}
          setStorefrontCategory={templates.setStorefrontCategory}
          setPosterCategory={templates.setPosterCategory}
          avatarTemplateCategories={templates.avatarTemplateCategories}
          storefrontTemplateCategories={templates.storefrontTemplateCategories}
          posterTemplateCategories={templates.posterTemplateCategories}
          currentAvatarTemplates={templates.currentAvatarTemplates}
          currentStorefrontTemplates={templates.currentStorefrontTemplates}
          currentPosterTemplates={templates.currentPosterTemplates}
          avatarTemplate={templates.avatarTemplate}
          storefrontTemplate={templates.storefrontTemplate}
          posterTemplate={templates.posterTemplate}
          onSelectTemplate={templates.handleTemplateSelect}
        />

        <ActionPanel
          avatarStep1Generating={generation.avatarStep1Generating}
          avatarStep2Generating={generation.avatarStep2Generating}
          storefrontGenerating={generation.storefrontGenerating}
          posterGenerating={generation.posterGenerating}
          avatarStep1Result={generation.avatarStep1Result}
          canGenerateAvatarStep1={computedFlags.canAvatarStep1}
          canGenerateAvatarStep2={computedFlags.canAvatarStep2}
          canGenerateStorefront={computedFlags.canStorefront}
          canGeneratePoster={computedFlags.canPoster}
          onAvatarStep1={generation.generateAvatarStep1}
          onAvatarStep2={generation.generateAvatarStep2}
          onGenerateStorefront={() => generation.generateSingle('storefront')}
          onGeneratePoster={() => generation.generateSingle('poster')}
        />

        <ResultsSection
          jobStatus={generation.jobStatus}
          storeName={form.storeName}
          storefrontResult={generation.storefrontResult}
          posterResult={generation.posterResult}
          avatarResult={generation.avatarResult}
          avatarStep1Result={generation.avatarStep1Result}
          onDownloadAll={generation.downloadAllAssets}
          onDownloadElemeSet={generation.downloadElemeSet}
          onDownloadImage={generation.downloadImage}
        />
      </div>
    </div>
  );
}
