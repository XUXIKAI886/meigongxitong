import type { ReactNode } from 'react';

// Logo Studio 相关的通用类型定义
export type LogoJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface LogoStudioJobResult {
  avatarUrl?: string;
  storefrontUrl?: string;
  posterUrl?: string;
  reversePrompt?: string;
  finalPrompt?: string;
  fusionPrompts?: {
    avatar?: string;
    storefront?: string;
    poster?: string;
  };
}

export interface LogoStudioJobStatus {
  id: string;
  status: LogoJobStatus;
  progress: number;
  result?: LogoStudioJobResult;
  error?: string;
}

export interface LogoTemplate {
  id: string;
  name: string;
  path: string;
  url: string;
}

export interface LogoTemplateCategory {
  category: string;
  categoryDisplayName: string;
  templates: LogoTemplate[];
}

export interface LogoStudioChildrenProps {
  children: ReactNode;
}
