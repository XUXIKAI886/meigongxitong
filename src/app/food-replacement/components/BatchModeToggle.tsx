import { Badge } from '@/components/ui/badge';
import { ImageIcon, ImagesIcon } from 'lucide-react';

interface BatchModeToggleProps {
  isBatchMode: boolean;
  onToggle: (batchMode: boolean) => void;
}

export default function BatchModeToggle({ isBatchMode, onToggle }: BatchModeToggleProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-gray-600">处理模式:</span>
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
        <button
          onClick={() => onToggle(false)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            !isBatchMode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          单张模式
        </button>

        <button
          onClick={() => onToggle(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            isBatchMode
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ImagesIcon className="w-4 h-4" />
          批量模式
          {isBatchMode && (
            <Badge variant="secondary" className="ml-1 bg-white/20 text-white text-xs px-1.5 py-0">
              最多10张
            </Badge>
          )}
        </button>
      </div>
    </div>
  );
}