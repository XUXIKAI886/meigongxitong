import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, SparklesIcon } from 'lucide-react';

interface ProcessingStatusProps {
  isProcessing: boolean;
  statusMessage: string;
  progress: number;
}

export default function ProcessingStatus({
  isProcessing,
  statusMessage,
  progress,
}: ProcessingStatusProps) {
  if (!isProcessing) return null;

  const getStatusEmoji = () => {
    if (progress === 0) return '⏳';
    if (progress < 100) return '✨';
    return '✅';
  };

  return (
    <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
            <span className="text-gray-900">处理状态</span>
          </div>
          <Badge variant="default" className="bg-orange-500">
            {getStatusEmoji()} 处理中
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-gray-700 font-medium leading-relaxed">
          {statusMessage || 'AI正在智能分析图片并进行背景融合，请耐心等待...'}
        </p>

        <div className="space-y-3">
          <Progress value={progress} className="w-full h-2.5" />
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">进度</span>
            <span className="font-semibold text-orange-600">{progress}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
