import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScissorsIcon, Loader2Icon } from 'lucide-react';

interface BatchCutoutButtonProps {
  sourceImagesCount: number;
  isCutting: boolean;
  cutoutProgress: number;
  currentImageIndex: number;
  onStartCutout: () => void;
}

/**
 * BatchCutoutButton 组件
 * 批量抠图按钮，显示进度和状态
 *
 * 功能：
 * - 显示可抠图的图片数量
 * - 处理中显示进度条和当前图片索引
 * - 动画加载图标
 * - 禁用状态管理
 */
export default function BatchCutoutButton({
  sourceImagesCount,
  isCutting,
  cutoutProgress,
  currentImageIndex,
  onStartCutout,
}: BatchCutoutButtonProps) {
  const canStartCutout = sourceImagesCount > 0 && !isCutting;

  return (
    <div className="space-y-3">
      <Button
        onClick={onStartCutout}
        disabled={!canStartCutout}
        variant="secondary"
        size="lg"
        className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-400 transition-all duration-300"
      >
        {isCutting ? (
          <>
            <Loader2Icon className="w-5 h-5 mr-2 animate-spin" />
            抠图中... ({currentImageIndex + 1}/{sourceImagesCount})
          </>
        ) : (
          <>
            <ScissorsIcon className="w-5 h-5 mr-2" />
            一键批量抠图 ({sourceImagesCount}张)
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
            正在处理第 {currentImageIndex + 1} 张，请稍候...
          </p>
        </div>
      )}
    </div>
  );
}
