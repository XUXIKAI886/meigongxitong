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
        return <Badge variant="secondary">排队中</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-500">处理中</Badge>;
      case 'succeeded':
        return <Badge variant="default" className="bg-green-500">完成</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
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
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isProcessing && jobStatus?.status === 'running' ? (
              <RefreshCwIcon className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <SparklesIcon className="w-5 h-5 text-blue-600" />
            )}
            处理状态
          </div>
          {jobStatus && getStatusBadge(jobStatus.status)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {jobStatus ? getStatusText(jobStatus.status) : '准备开始处理...'}
          </p>

          {jobStatus && (
            <>
              <Progress
                value={jobStatus.progress || 0}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>进度: {jobStatus.progress || 0}%</span>
                {jobStatus.result?.processedCount && (
                  <span>已处理: {jobStatus.result.processedCount} 张</span>
                )}
              </div>
            </>
          )}

          {jobStatus?.status === 'failed' && jobStatus.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">错误详情:</p>
              <p className="text-xs text-red-600 mt-1">{jobStatus.error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}