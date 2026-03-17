import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => {
    if (prefix) {
      const rv = Math.round(v);
      if (rv >= 100000) return `${prefix}${(rv / 100000).toFixed(1)}L`;
      if (rv >= 1000) return `${prefix}${(rv / 1000).toFixed(1)}k`;
      return `${prefix}${rv.toLocaleString('en-IN')}`;
    }
    return Math.round(v).toString();
  });

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 0.5,
      ease: [0.32, 0.72, 0, 1],
    });
    return () => controls.stop();
  }, [value, motionVal]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [rounded]);

  return <span ref={ref}>{prefix ? `${prefix}0` : '0'}</span>;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'success' | 'warning' | 'info';
  index?: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.03, duration: 0.3, ease: [0.32, 0.72, 0, 1] },
  }),
};

export function StatCard({ title, value, icon: Icon, onClick, variant = 'default', index = 0 }: StatCardProps) {
  const styles = {
    default: {
      border: 'border-border',
      icon: 'text-primary',
      iconBg: 'bg-primary/10',
      value: 'text-foreground',
      glow: '',
    },
    success: {
      border: 'border-green-500/20',
      icon: 'text-green-500',
      iconBg: 'bg-green-500/10',
      value: 'text-green-500',
      glow: 'shadow-green-500/5',
    },
    danger: {
      border: 'border-destructive/20',
      icon: 'text-destructive',
      iconBg: 'bg-destructive/10',
      value: 'text-destructive',
      glow: 'shadow-destructive/5',
    },
    warning: {
      border: 'border-yellow-500/20',
      icon: 'text-yellow-500',
      iconBg: 'bg-yellow-500/10',
      value: 'text-yellow-500',
      glow: 'shadow-yellow-500/5',
    },
    info: {
      border: 'border-blue-500/20',
      icon: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
      value: 'text-blue-500',
      glow: 'shadow-blue-500/5',
    },
  };

  const s = styles[variant];
  const numericValue = typeof value === 'number' ? value : parseInt(String(value).replace(/[^\d]/g, ''), 10);

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border bg-card p-3 shadow-sm',
        'transition-colors',
        s.border,
        s.glow,
      )}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex flex-col items-center text-center gap-1.5">
        <div className={cn('rounded-lg p-2', s.iconBg)}>
          <Icon className={cn('h-4 w-4', s.icon)} />
        </div>
        <p className={cn('text-xl font-bold leading-none tabular-nums', s.value)}>
          {typeof value === 'number' ? <AnimatedNumber value={numericValue} /> : value}
        </p>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none">{title}</p>
      </div>
    </motion.button>
  );
}

interface RevenueCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant: 'success' | 'danger';
  index?: number;
}

export function RevenueCard({ title, value, icon: Icon, variant, index = 0 }: RevenueCardProps) {
  const isSuccess = variant === 'success';

  // Extract numeric value for animation
  const numericValue = parseInt(String(value).replace(/[^\d]/g, ''), 10) || 0;

  return (
    <motion.div
      className={cn(
        'rounded-xl border bg-card p-3.5 overflow-hidden shadow-sm',
        isSuccess ? 'border-green-500/20 shadow-green-500/5' : 'border-destructive/20 shadow-destructive/5'
      )}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          'rounded-lg p-1.5',
          isSuccess ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
        )}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{title}</span>
      </div>
      <p className={cn(
        'text-xl font-bold tracking-tight tabular-nums truncate',
        isSuccess ? 'text-green-500' : 'text-destructive'
      )}>
        <AnimatedNumber value={numericValue} prefix="₹" />
      </p>
    </motion.div>
  );
}
