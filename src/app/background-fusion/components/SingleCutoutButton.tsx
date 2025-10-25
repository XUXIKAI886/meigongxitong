import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScissorsIcon, Loader2Icon } from 'lucide-react';

interface SingleCutoutButtonProps {
  hasSourceImage: boolean;
  isCutting: boolean;
  cutoutProgress: number;
  onStartCutout: () => void;
}

/**
 * SingleCutoutButton 组件
 * 单张抠图按钮，显示进度和状态
 *
 * 功能：
 * - 单张图片抠图
 * - 处理中显示进度条
 * - 动画加载图标
 * - 禁用状态管理
 */
export default function SingleCutoutButton({
  hasSourceImage,
  isCutting,
  cutoutProgress,
  onStartCutout,
}: SingleCutoutButtonProps) {
  const canStartCutout = hasSourceImage && !isCutting;

  return (
    <div className="space-y-3">
      <Button
        onClick={onStartCutout}
        disabled={true}
        variant="secondary"
        size="lg"
        className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-400 transition-all duration-300"
      >
        {isCutting ? (
          <>
            <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
            抠图中...
          </>
        ) : (
          <>
            <ScissorsIcon className="w-5 h-5 mr-2" />
            一键抠图
          </>
        )}
      </Button>

      {/* 进度条 - 仅在处理中显示 */}
      {isCutting && (
        <div className="space-y-2 px-1">
          <div className="flex justify-between items-center text-xs text-gray-600">
            <span className="font-medium">抠图进度</span>
            <span className="font-bold text-purple-600">{cutoutProgress}%</span>
          </div>
          <Progress value={cutoutProgress} className="h-2 bg-gray-200" />
          <p className="text-xs text-gray-500 text-center">
            正在处理，请稍候...
          </p>
        </div>
      )}
    </div>
  );
}
