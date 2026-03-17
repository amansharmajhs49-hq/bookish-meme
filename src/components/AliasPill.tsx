import { Tag, Lock } from 'lucide-react';
import { useIsFeatureLocked } from '@/hooks/useSubscription';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AliasPillProps {
  alias: string;
}

export function AliasPill({ alias }: AliasPillProps) {
  const { isLocked } = useIsFeatureLocked('alias_system');
  if (!alias || isLocked) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border border-border/60 cursor-help"
          style={{
            backgroundImage: 'linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted) / 0.5) 100%)',
          }}
        >
          <Tag className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-muted-foreground max-w-[80px] truncate">{alias}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p className="text-muted-foreground">Alias: <span className="font-semibold text-foreground">{alias}</span></p>
      </TooltipContent>
    </Tooltip>
  );
}
