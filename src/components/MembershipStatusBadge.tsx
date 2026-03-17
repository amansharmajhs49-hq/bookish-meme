import { cn } from '@/lib/utils';
import { MembershipStatus, getStatusColorClass, getStatusDotColor } from '@/lib/membership';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MembershipStatusBadgeProps {
  status: MembershipStatus;
  tooltip?: string;
  className?: string;
  showDot?: boolean;
}

const statusLabels: Record<MembershipStatus, string> = {
  ACTIVE: 'Active',
  PAYMENT_DUE: 'Payment Due',
  EXPIRED: 'Expired',
  LEFT: 'Left',
  INACTIVE: 'Inactive',
};

export function MembershipStatusBadge({ 
  status, 
  tooltip, 
  className,
  showDot = true 
}: MembershipStatusBadgeProps) {
  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        getStatusColorClass(status),
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full flex-shrink-0',
            getStatusDotColor(status)
          )}
        />
      )}
      {statusLabels[status]}
    </span>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
