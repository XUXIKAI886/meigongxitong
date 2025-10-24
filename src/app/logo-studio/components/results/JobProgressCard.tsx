'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { LogoStudioJobStatus } from '../../types';

interface JobProgressCardProps {
  jobStatus: LogoStudioJobStatus;
}

const STATUS_TEXT: Record<LogoStudioJobStatus['status'], string> = {
  queued: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '失败',
};

export function JobProgressCard({ jobStatus }: JobProgressCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">生成进度</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <Progress value={jobStatus.progress} className="h-2 w-full" />
        <p className="text-xs text-gray-600">
          状态：{STATUS_TEXT[jobStatus.status]}
        </p>
      </CardContent>
    </Card>
  );
}
