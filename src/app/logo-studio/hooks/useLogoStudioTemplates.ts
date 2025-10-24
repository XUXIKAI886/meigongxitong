'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { templateStoreNameMap } from '../constants/templateStoreNameMap';
import type { LogoTemplate, LogoTemplateCategory } from '../types';

interface UseLogoStudioTemplatesParams {
  setTemplateStoreName: (value: string) => void;
}

type TemplateType = 'avatar' | 'storefront' | 'poster';

// Logo Studio 模板管理与快捷映射
export function useLogoStudioTemplates({ setTemplateStoreName }: UseLogoStudioTemplatesParams) {
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [avatarTemplateCategories, setAvatarTemplateCategories] = useState<LogoTemplateCategory[]>([]);
  const [storefrontTemplateCategories, setStorefrontTemplateCategories] = useState<LogoTemplateCategory[]>([]);
  const [posterTemplateCategories, setPosterTemplateCategories] = useState<LogoTemplateCategory[]>([]);

  const [avatarTemplate, setAvatarTemplate] = useState<LogoTemplate | null>(null);
  const [storefrontTemplate, setStorefrontTemplate] = useState<LogoTemplate | null>(null);
  const [posterTemplate, setPosterTemplate] = useState<LogoTemplate | null>(null);

  const [avatarCategory, setAvatarCategory] = useState('通用');
  const [storefrontCategory, setStorefrontCategory] = useState('通用');
  const [posterCategory, setPosterCategory] = useState('通用');

  const sortTemplatesByNumber = useCallback((templates: LogoTemplate[]) => {
    const getNumber = (id: string) => {
      const match = id.match(/-(\d+)\.(png|jpg|jpeg)$/i);
      return match ? parseInt(match[1], 10) : 0;
    };
    return [...templates].sort((a, b) => getNumber(b.id) - getNumber(a.id));
  }, []);

  const handleTemplateSelect = useCallback(
    (template: LogoTemplate, type: TemplateType) => {
      switch (type) {
        case 'avatar':
          setAvatarTemplate(template);
          break;
        case 'storefront':
          setStorefrontTemplate(template);
          break;
        case 'poster':
          setPosterTemplate(template);
          break;
      }

      const idParts = template.id.split('-');
      if (idParts.length < 3) {
        return;
      }

      const category = idParts[1];
      const templateNumber = idParts[2]?.replace(/\.(png|jpg|jpeg)$/i, '');
      if (!category || !templateNumber) {
        return;
      }

      const mapKey = `${category}-${templateNumber}`;
      const mappedName = templateStoreNameMap[mapKey];
      if (mappedName) {
        setTemplateStoreName(mappedName);
      }
    },
    [setTemplateStoreName]
  );

  useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const [avatarResponse, storefrontResponse, posterResponse] = await Promise.all([
          fetch('/api/logo-templates?type=avatar'),
          fetch('/api/logo-templates?type=storefront'),
          fetch('/api/logo-templates?type=poster'),
        ]);

        const [avatarData, storefrontData, posterData] = await Promise.all([
          avatarResponse.json(),
          storefrontResponse.json(),
          posterResponse.json(),
        ]);

        setAvatarTemplateCategories(avatarData.categories || []);
        setStorefrontTemplateCategories(storefrontData.categories || []);
        setPosterTemplateCategories(posterData.categories || []);
      } catch (error) {
        console.error('获取 Logo 模板失败:', error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);

  const currentAvatarTemplates = useMemo(
    () =>
      sortTemplatesByNumber(
        avatarTemplateCategories.find((cat) => cat.category === avatarCategory)?.templates || []
      ),
    [avatarTemplateCategories, avatarCategory, sortTemplatesByNumber]
  );

  const currentStorefrontTemplates = useMemo(
    () =>
      sortTemplatesByNumber(
        storefrontTemplateCategories.find((cat) => cat.category === storefrontCategory)?.templates || []
      ),
    [storefrontTemplateCategories, storefrontCategory, sortTemplatesByNumber]
  );

  const currentPosterTemplates = useMemo(
    () =>
      sortTemplatesByNumber(
        posterTemplateCategories.find((cat) => cat.category === posterCategory)?.templates || []
      ),
    [posterTemplateCategories, posterCategory, sortTemplatesByNumber]
  );

  return {
    loadingTemplates,
    avatarTemplateCategories,
    storefrontTemplateCategories,
    posterTemplateCategories,
    avatarTemplate,
    storefrontTemplate,
    posterTemplate,
    avatarCategory,
    storefrontCategory,
    posterCategory,
    setAvatarCategory,
    setStorefrontCategory,
    setPosterCategory,
    currentAvatarTemplates,
    currentStorefrontTemplates,
    currentPosterTemplates,
    handleTemplateSelect,
  };
}
