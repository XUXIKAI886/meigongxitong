'use client';

import { Button } from '@/components/ui';

export interface ApplyCutoutButtonProps {
  /** 抠图结果数量 */
  cutoutResultsCount: number;
  /** 点击应用按钮的回调 */
  onApply: () => void;
}

/**
 * ApplyCutoutButton - 一键应用抠图结果按钮
 *
 * 功能：
 * - 显示抠图结果数量
 * - 点击后应用所有抠图结果替换原图
 * - 只有存在抠图结果时才显示
 */
export default function ApplyCutoutButton({
  cutoutResultsCount,
  onApply,
}: ApplyCutoutButtonProps) {
  if (cutoutResultsCount === 0) {
    return null;
  }

  return (
    <Button
      onClick={onApply}
      variant="default"
      className="w-full bg-green-600 hover:bg-green-700"
    >
      一键应用抠图结果 ({cutoutResultsCount}张)
    </Button>
  );
}
