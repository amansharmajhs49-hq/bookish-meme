import { useState, useRef, useCallback, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 80;
const MAX_PULL = 130;

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullDistance = useMotionValue(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const currentPull = useRef(0);

  const indicatorHeight = useTransform(pullDistance, [0, MAX_PULL], [0, MAX_PULL]);
  const indicatorOpacity = useTransform(pullDistance, [0, THRESHOLD * 0.4, THRESHOLD], [0, 0.6, 1]);
  const indicatorRotation = useTransform(pullDistance, [0, THRESHOLD], [0, 360]);
  const indicatorScale = useTransform(pullDistance, [0, THRESHOLD * 0.5, THRESHOLD], [0.5, 0.8, 1]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Pulling down
      const distance = Math.min(MAX_PULL, diff * 0.45);
      pullDistance.set(distance);
      currentPull.current = distance;
    } else {
      // Scrolling or pulling up
      pulling.current = false;
      animate(pullDistance, 0, { type: 'spring', stiffness: 300, damping: 25 });
      currentPull.current = 0;
    }
  }, [isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (currentPull.current >= THRESHOLD) {
      setIsRefreshing(true);
      animate(pullDistance, THRESHOLD * 0.5, { type: 'spring', stiffness: 200, damping: 20 });
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(pullDistance, 0, { type: 'spring', stiffness: 300, damping: 25 });
        currentPull.current = 0;
      }
    } else {
      animate(pullDistance, 0, { type: 'spring', stiffness: 400, damping: 25 });
      currentPull.current = 0;
    }
  }, [onRefresh, pullDistance]);

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="flex items-center justify-center overflow-hidden"
        style={{ height: indicatorHeight }}
      >
        <motion.div
          className={cn(
            'flex items-center justify-center rounded-full h-10 w-10 bg-card border shadow-lg transition-colors',
            currentPull.current >= THRESHOLD ? 'border-primary/50 bg-primary/5' : 'border-border',
            isRefreshing && 'animate-spin'
          )}
          style={{
            opacity: indicatorOpacity,
            rotate: isRefreshing ? undefined : indicatorRotation,
            scale: indicatorScale,
          }}
        >
          <RefreshCw className={cn(
            "h-5 w-5 transition-colors",
            currentPull.current >= THRESHOLD ? "text-primary scale-110" : "text-muted-foreground"
          )} />
        </motion.div>
      </motion.div>

      {children}
    </div>
  );
}
