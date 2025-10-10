import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleLeftIcon, ToggleRightIcon, GridIcon } from 'lucide-react';

interface BatchModeToggleProps {
  isBatchMode: boolean;
  onToggle: (batchMode: boolean) => void;
}

export default function BatchModeToggle({ isBatchMode, onToggle }: BatchModeToggleProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2">
        <GridIcon className="w-5 h-5 text-blue-600" />
        <span className="font-medium text-gray-700">处理模式:</span>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant={!isBatchMode ? "default" : "outline"}
          size="sm"
          onClick={() => onToggle(false)}
          className={!isBatchMode ? "bg-blue-600 hover:bg-blue-700" : ""}
        >
          单张模式
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggle(!isBatchMode)}
          className="p-2 hover:bg-blue-100"
        >
          {isBatchMode ? (
            <ToggleRightIcon className="w-6 h-6 text-blue-600" />
          ) : (
            <ToggleLeftIcon className="w-6 h-6 text-gray-400" />
          )}
        </Button>

        <Button
          variant={isBatchMode ? "default" : "outline"}
          size="sm"
          onClick={() => onToggle(true)}
          className={isBatchMode ? "bg-blue-600 hover:bg-blue-700" : ""}
        >
          批量模式
          <Badge variant="secondary" className="ml-2">最多10张</Badge>
        </Button>
      </div>
    </div>
  );
}