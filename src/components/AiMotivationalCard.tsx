import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, Users, Flame, Lock } from 'lucide-react';
import { fetchAiQuotesBatch } from '@/lib/aiQuotes';
import { useIsFeatureLocked } from '@/hooks/useSubscription';

interface AiMotivationalCardProps {
  clientName: string;
  progressPct: number;
  daysLeft: number;
  planName: string;
  membershipStatus?: string;
  netDue?: number;
  joinDate?: string;
  isCustomPrice?: boolean;
  paidAmount?: number;
}

interface MessageConfig {
  icon: 'sparkles' | 'flame' | 'trending' | 'users';
  label: string;
  borderClass: string;
  bgClass: string;
  iconClass: string;
  labelClass: string;
  textClass: string;
}

function getCardConfig(
  pct: number,
  daysLeft: number,
  status: string,
  netDue: number,
): MessageConfig {
  if (status === 'EXPIRED') {
    return { icon: 'flame', label: "Don't Fall Behind", borderClass: 'border-destructive/15', bgClass: 'bg-destructive/[0.04]', iconClass: 'text-destructive/70', labelClass: 'text-destructive/60', textClass: 'text-destructive/80' };
  }
  if (netDue > 0) {
    return { icon: 'flame', label: 'Action Needed', borderClass: 'border-warning/15', bgClass: 'bg-warning/[0.04]', iconClass: 'text-warning/70', labelClass: 'text-warning/60', textClass: 'text-warning/80' };
  }
  if (daysLeft === 0) {
    return { icon: 'flame', label: 'Final Day', borderClass: 'border-destructive/15', bgClass: 'bg-destructive/[0.04]', iconClass: 'text-destructive/70', labelClass: 'text-destructive/60', textClass: 'text-destructive/80' };
  }
  if (daysLeft >= 1 && daysLeft <= 3) {
    return { icon: 'flame', label: 'Renew Soon', borderClass: 'border-destructive/12', bgClass: 'bg-destructive/[0.03]', iconClass: 'text-destructive/60', labelClass: 'text-destructive/50', textClass: 'text-foreground/70' };
  }
  if (daysLeft >= 4 && daysLeft <= 7) {
    return { icon: 'trending', label: 'Stay Ahead', borderClass: 'border-warning/12', bgClass: 'bg-warning/[0.03]', iconClass: 'text-warning/60', labelClass: 'text-warning/50', textClass: 'text-foreground/70' };
  }
  if (pct <= 15) {
    return { icon: 'sparkles', label: 'New Cycle', borderClass: 'border-primary/10', bgClass: 'bg-primary/[0.03]', iconClass: 'text-primary/60', labelClass: 'text-primary/50', textClass: 'text-foreground/65' };
  }
  if (pct <= 85) {
    return { icon: 'trending', label: 'Building Momentum', borderClass: 'border-primary/10', bgClass: 'bg-primary/[0.03]', iconClass: 'text-primary/60', labelClass: 'text-primary/50', textClass: 'text-foreground/65' };
  }
  return { icon: 'flame', label: 'Peak Performance', borderClass: 'border-success/12', bgClass: 'bg-success/[0.03]', iconClass: 'text-success/60', labelClass: 'text-success/50', textClass: 'text-foreground/65' };
}

const iconMap = {
  sparkles: Sparkles,
  flame: Flame,
  trending: TrendingUp,
  users: Users,
};

export function AiMotivationalCard({
  clientName,
  progressPct,
  daysLeft,
  planName,
  membershipStatus = 'ACTIVE',
  netDue = 0,
  isCustomPrice = false,
  paidAmount,
}: AiMotivationalCardProps) {
  const [quotes, setQuotes] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isLocked, message: lockMessage } = useIsFeatureLocked('ai_quotes');

  const config = useMemo(
    () => getCardConfig(progressPct, daysLeft, membershipStatus, netDue),
    [progressPct, daysLeft, membershipStatus, netDue],
  );

  // Fetch quotes in bulk on mount — single API call, no per-refresh hits
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchAiQuotesBatch({
      clientName,
      progressPct,
      daysLeft,
      membershipStatus,
      netDue,
      isCustomPrice,
      paidAmount,
    }).then(batch => {
      if (!isMounted) return;
      setQuotes(batch);
      setIsLoading(false);
    });

    return () => { isMounted = false; };
  }, [clientName, membershipStatus, isCustomPrice]);

  // Once quotes are loaded, cycle through them every 8 seconds (no API calls)
  useEffect(() => {
    if (quotes.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % quotes.length);
    }, 8000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [quotes.length]);

  const IconComp = iconMap[config.icon];
  const currentQuote = quotes[currentIndex] || '';

  if (isLocked) {
    return (
      <div className="relative rounded-lg border border-border/40 bg-muted/20 p-3 flex items-center gap-3">
        <div className="p-1.5 rounded-md bg-destructive/10 text-destructive/40">
          <Lock className="w-3 h-3" />
        </div>
        <p className="text-[10px] font-medium text-muted-foreground italic">
          AI Quotes feature is currently locked.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg border ${config.borderClass} ${config.bgClass} p-3 space-y-1.5 overflow-hidden`}>
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-primary/[0.03] blur-2xl pointer-events-none" />

      <div className="relative flex items-center gap-1.5">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <IconComp className={`w-3 h-3 ${config.iconClass}`} />
        </motion.div>
        <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${config.labelClass}`}>
          {config.label}
        </span>
        {isCustomPrice && paidAmount && (
          <div className="ml-auto px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[8px] font-bold tracking-tighter">
            SPECIAL RATE: ₹{paidAmount.toLocaleString('en-IN')}
          </div>
        )}
        {/* Dot indicators */}
        {!isLoading && quotes.length > 1 && (
          <div className="ml-auto flex gap-0.5 items-center">
            {quotes.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? `w-3 ${config.iconClass.replace('/60', '/80').replace('/70', '/90')} bg-current` : 'w-1 bg-muted-foreground/20'}`}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-1.5"
          >
            <div className="h-3 w-full bg-muted/30 rounded animate-pulse" />
            <div className="h-3 w-3/4 bg-muted/20 rounded animate-pulse" />
          </motion.div>
        ) : (
          <motion.p
            key={currentIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`relative text-[11px] leading-relaxed font-medium ${config.textClass}`}
          >
            {currentQuote}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
