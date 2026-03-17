import { LucideIcon, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

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
    const controls = animate(motionVal, value, { duration: 0.5, ease: [0.32, 0.72, 0, 1] });
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
  sparkline?: number[]; // last 6 months values
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.03, duration: 0.3, ease: [0.32, 0.72, 0, 1] },
  }),
};

export function StatCard({ title, value, icon: Icon, onClick, variant = 'default', index = 0, sparkline }: StatCardProps) {
  const styles = {
    default: { border: 'border-border', icon: 'text-primary', iconBg: 'bg-primary/10', value: 'text-foreground', glow: '', spark: 'hsl(var(--primary))' },
    success: { border: 'border-green-500/20', icon: 'text-green-500', iconBg: 'bg-green-500/10', value: 'text-green-500', glow: 'shadow-green-500/5', spark: '#22c55e' },
    danger: { border: 'border-destructive/20', icon: 'text-destructive', iconBg: 'bg-destructive/10', value: 'text-destructive', glow: 'shadow-destructive/5', spark: 'hsl(var(--destructive))' },
    warning: { border: 'border-yellow-500/20', icon: 'text-yellow-500', iconBg: 'bg-yellow-500/10', value: 'text-yellow-500', glow: 'shadow-yellow-500/5', spark: '#eab308' },
    info: { border: 'border-blue-500/20', icon: 'text-blue-500', iconBg: 'bg-blue-500/10', value: 'text-blue-500', glow: 'shadow-blue-500/5', spark: '#3b82f6' },
  };

  const s = styles[variant];
  const numericValue = typeof value === 'number' ? value : parseInt(String(value).replace(/[^\d]/g, ''), 10);
  const sparkData = sparkline?.map((v, i) => ({ v, i }));

  // Trend: compare last value to first
  const trend = sparkline && sparkline.length >= 2
    ? sparkline[sparkline.length - 1] - sparkline[0]
    : null;

  return (
    <motion.button
      onClick={onClick}
      className={cn('w-full rounded-xl border bg-card p-3 shadow-sm transition-colors', s.border, s.glow)}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex flex-col items-center text-center gap-1 min-w-0 overflow-hidden">
        <div className={cn('rounded-lg p-2 shrink-0', s.iconBg)}>
          <Icon className={cn('h-4 w-4', s.icon)} />
        </div>
        <p className={cn('text-lg sm:text-xl font-bold leading-none tabular-nums truncate w-full', s.value)}>
          {typeof value === 'number' ? <AnimatedNumber value={numericValue} /> : value}
        </p>
        <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none truncate w-full">{title}</p>

        {/* Sparkline */}
        {sparkData && sparkData.length >= 2 && (
          <div className="w-full h-6 mt-0.5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={s.spark}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Trend indicator */}
        {trend !== null && sparkline && sparkline.length >= 2 && (
          <span className={cn('text-[9px] font-bold', trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-destructive' : 'text-muted-foreground')}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}{Math.abs(trend)}
          </span>
        )}
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
  delta?: number | null;    // month-over-month change %
  deltaAmount?: number | null; // absolute ₹ change
}

export function RevenueCard({ title, value, icon: Icon, variant, index = 0, delta, deltaAmount }: RevenueCardProps) {
  const isSuccess = variant === 'success';
  const [revealed, setRevealed] = useState(false);
  const numericValue = parseInt(String(value).replace(/[^\d]/g, ''), 10) || 0;

  return (
    <motion.div
      className={cn('rounded-xl border bg-card p-3.5 overflow-hidden shadow-sm', isSuccess ? 'border-green-500/20 shadow-green-500/5' : 'border-destructive/20 shadow-destructive/5')}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('rounded-lg p-1.5', isSuccess ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive')}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground flex-1">{title}</span>
        <button
          type="button"
          onMouseDown={() => setRevealed(true)}
          onMouseUp={() => setRevealed(false)}
          onMouseLeave={() => setRevealed(false)}
          onTouchStart={() => setRevealed(true)}
          onTouchEnd={() => setRevealed(false)}
          className="p-1 rounded-md hover:bg-muted/50 transition-colors"
        >
          {revealed ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground/50" />}
        </button>
      </div>

      <p className={cn('text-xl font-bold tracking-tight tabular-nums truncate', isSuccess ? 'text-green-500' : 'text-destructive')}>
        {revealed ? <AnimatedNumber value={numericValue} prefix="₹" /> : <span className="select-none">₹ ****</span>}
      </p>

      {/* Always-visible delta — doesn't reveal the amount */}
      {delta !== null && delta !== undefined && isSuccess && (
        <div className={cn('flex items-center gap-1 mt-1.5', delta >= 0 ? 'text-emerald-500' : 'text-destructive')}>
          <span className="text-[11px] font-bold">{delta >= 0 ? '↑' : '↓'}{Math.abs(delta)}%</span>
          {deltaAmount !== null && deltaAmount !== undefined && revealed && (
            <span className="text-[10px] text-muted-foreground">
              ({deltaAmount >= 0 ? '+' : ''}₹{Math.abs(deltaAmount).toLocaleString('en-IN')})
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">vs last month</span>
        </div>
      )}
    </motion.div>
  );
}
