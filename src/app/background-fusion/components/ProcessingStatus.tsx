import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          处理状态
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{statusMessage}</span>
          <span className="text-sm font-medium text-orange-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500">AI正在智能分析图片并进行背景融合，请耐心等待...</p>
      </CardContent>
    </Card>
  );
}
