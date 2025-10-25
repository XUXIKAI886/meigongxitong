import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RefreshCwIcon, SparklesIcon } from 'lucide-react';
import { JobStatus } from '../types';

interface ProcessingStatusProps {
  isProcessing: boolean;
  jobStatus: JobStatus | null;
}

export default function ProcessingStatus({ isProcessing, jobStatus }: ProcessingStatusProps) {
  if (!isProcessing && !jobStatus) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'queued':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">⏳ 排队中</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-orange-500">✨ 处理中</Badge>;
      case 'succeeded':
        return <Badge variant="default" className="bg-green-500">✅ 完成</Badge>;
      case 'failed':
        return <Badge variant="destructive">❌ 失败</Badge>;
      default:
        return <Badge variant="outline">未知状态</Badge>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
      case 'queued':
        return 'AI正在准备处理您的图片...';
      case 'running':
        return '正在智能识别和替换食物内容...';
      case 'succeeded':
        return '图片处理完成！';
      case 'failed':
        return jobStatus?.error || '处理失败，请重试';
      default:
        return '正在处理...';
    }
  };

  return (
    <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            {isProcessing && jobStatus?.status === 'running' ? (
              <RefreshCwIcon className="w-5 h-5 animate-spin text-orange-600" />
            ) : (
              <SparklesIcon className="w-5 h-5 text-orange-600" />
            )}
            <span className="text-gray-900">处理状态</span>
          </div>
          {jobStatus && getStatusBadge(jobStatus.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-gray-700 font-medium leading-relaxed">
          {jobStatus ? getStatusText(jobStatus.status) : '准备开始处理...'}
        </p>

        {jobStatus && (
          <>
            <div className="space-y-3">
              <Progress
                value={jobStatus.progress || 0}
                className="w-full h-2.5"
              />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">进度</span>
                <span className="font-semibold text-orange-600">{jobStatus.progress || 0}%</span>
              </div>
              {jobStatus.result?.processedCount && (
                <div className="text-xs text-gray-500">
                  已处理: {jobStatus.result.processedCount} 张
                </div>
              )}
            </div>
          </>
        )}

        {jobStatus?.status === 'failed' && jobStatus.error && (
          <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-700">错误详情:</p>
            <p className="text-xs text-red-600 mt-2 leading-relaxed">{jobStatus.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}