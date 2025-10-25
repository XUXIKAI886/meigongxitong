import { Badge } from '@/components/ui/badge';
import { ImageIcon, ImagesIcon } from 'lucide-react';

interface BatchModeToggleProps {
  isBatchMode: boolean;
  onToggle: (batchMode: boolean) => void;
}

export default function BatchModeToggle({ isBatchMode, onToggle }: BatchModeToggleProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100 shadow-sm">
      <span className="text-sm font-medium text-gray-700">处理模式:</span>
      <div className="inline-flex rounded-lg border-2 border-orange-200 bg-white p-1.5 shadow-sm">
        <button
          onClick={() => onToggle(false)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            !isBatchMode
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md scale-105'
              : 'text-gray-700 hover:bg-orange-50 hover:scale-102'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          单张模式
        </button>

        <button
          onClick={() => onToggle(true)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            isBatchMode
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md scale-105'
              : 'text-gray-700 hover:bg-purple-50 hover:scale-102'
          }`}
        >
          <ImagesIcon className="w-4 h-4" />
          批量模式
          {isBatchMode && (
            <Badge variant="secondary" className="ml-1 bg-white/20 text-white text-xs px-2 py-0.5">
              最多10张
            </Badge>
          )}
        </button>
      </div>
    </div>
  );
}
