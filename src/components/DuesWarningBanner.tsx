import { AlertTriangle, IndianRupee } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface DuesWarningBannerProps {
  dueAmount: number;
  productDues?: number;
  advanceBalance?: number;
  className?: string;
  showBreakdown?: boolean;
}

export function DuesWarningBanner({
  dueAmount,
  productDues = 0,
  advanceBalance = 0,
  className,
  showBreakdown = false,
}: DuesWarningBannerProps) {
  const netDue = Math.max(0, dueAmount + productDues - advanceBalance);

  if (netDue <= 0) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        'bg-yellow-500/10 border-yellow-500/30',
        className
      )}
    >
      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="font-medium text-yellow-400 text-sm">
          Payment Required
        </p>
        <p className="text-sm text-muted-foreground">
          Clear <span className="text-yellow-400 font-semibold">{formatCurrency(netDue)}</span> to enable membership actions.
        </p>
        
        {showBreakdown && (dueAmount > 0 || productDues > 0) && (
          <div className="mt-2 pt-2 border-t border-yellow-500/20 space-y-1 text-xs">
            {dueAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Membership Dues</span>
                <span className="text-yellow-400">{formatCurrency(dueAmount)}</span>
              </div>
            )}
            {productDues > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Product Dues</span>
                <span className="text-yellow-400">{formatCurrency(productDues)}</span>
              </div>
            )}
            {advanceBalance > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Advance Balance</span>
                <span className="text-green-400">-{formatCurrency(advanceBalance)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium pt-1 border-t border-yellow-500/20">
              <span>Net Due</span>
              <span className="text-yellow-400">{formatCurrency(netDue)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simpler inline warning for lists
export function DuesBadge({ amount, className }: { amount: number; className?: string }) {
  if (amount <= 0) return null;
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
        'bg-red-500/20 text-red-400',
        className
      )}
    >
      <IndianRupee className="h-3 w-3" />
      {amount.toLocaleString('en-IN')}
    </span>
  );
}
