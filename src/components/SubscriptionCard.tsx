import { CreditCard, QrCode, ExternalLink, AlertTriangle, ShieldCheck, Zap, Info } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { GymSubscription, HostingPlan } from '@/hooks/useSubscription';
import { format, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';

interface SubscriptionCardProps {
  subscription: GymSubscription & { hosting_plan?: HostingPlan | null };
  className?: string;
}

export function SubscriptionCard({ subscription, className }: SubscriptionCardProps) {
  const plan: HostingPlan | null = (subscription as any).hosting_plan || null;

  const isExpired = subscription.status === 'expired' || subscription.status === 'locked';
  const expiryDate = new Date(subscription.expiry_date);
  const now = new Date();
  const daysLeft = Math.max(0, differenceInDays(expiryDate, now));

  const totalDuration = 30;
  const progressPercent = Math.min(100, Math.max(0, (daysLeft / totalDuration) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-6 transition-all",
        isExpired
          ? "bg-gradient-to-br from-destructive/10 via-card to-destructive/20 border-destructive/30 shadow-xl"
          : "bg-gradient-to-br from-primary/10 via-card to-background border-primary/20 shadow-xl",
        className
      )}
    >
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              isExpired ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
            )}>
              {isExpired ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{plan?.plan_name || 'Standard Hosting'}</h3>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {isExpired ? 'Account Restricted' : 'Active Subscription'}
              </p>
            </div>
          </div>
          <span className={cn(
            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
            isExpired
              ? "bg-destructive/10 text-destructive border-destructive/20"
              : "bg-primary/10 text-primary border-primary/20"
          )}>
            {subscription.status}
          </span>
        </div>

        {/* Plan Details */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Renewal Amount</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(plan?.price || 0)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cycle</p>
              <p className="text-xs font-bold">{plan?.billing_cycle || 'monthly'}</p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Zap className={cn("h-3 w-3", daysLeft <= 3 ? "text-destructive" : "text-primary")} />
                Time Remaining
              </span>
              <span className={cn("text-xs font-bold", daysLeft <= 3 ? "text-destructive" : "text-foreground")}>
                {daysLeft} Days Left
              </span>
            </div>
            <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={cn("h-full rounded-full", daysLeft <= 3 ? "bg-destructive" : "bg-primary")}
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">
              Next Renewal: {format(expiryDate, 'MMMM dd, yyyy')}
            </p>
          </div>
        </div>

        {/* Payment */}
        {(subscription.payment_qr || subscription.payment_link) && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-border/30">
              <div className="shrink-0">
                <img
                  src={subscription.payment_qr || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(subscription.payment_link || '')}`}
                  alt="Payment QR"
                  className="w-16 h-16"
                />
              </div>
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-black"><QrCode className="h-3.5 w-3.5" /> Scan to Pay</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">UPI payment for instant renewal</p>
              </div>
            </div>

            {subscription.payment_link && (
              <a
                href={subscription.payment_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                Pay via Online Link
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 opacity-40">
          <Info className="h-3 w-3 text-muted-foreground" />
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Secure billing system</p>
        </div>
      </div>
    </motion.div>
  );
}
