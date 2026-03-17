import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { differenceInMonths } from 'date-fns';

interface ConsistencyBadgesProps {
  firstJoinDate: string;
}

const BADGES = [
  { months: 1, emoji: '🥉', label: '1M', full: '1 Month Strong' },
  { months: 3, emoji: '🥈', label: '3M', full: '3 Months Strong' },
  { months: 6, emoji: '🥇', label: '6M', full: '6 Months Strong' },
  { months: 12, emoji: '💎', label: '1Y', full: '1 Year Strong' },
];

export function ConsistencyBadges({ firstJoinDate }: ConsistencyBadgesProps) {
  const monthsActive = useMemo(() => {
    return differenceInMonths(new Date(), new Date(firstJoinDate));
  }, [firstJoinDate]);

  return (
    <div className="bg-card rounded-xl border border-border p-3.5 space-y-2.5">
      <div>
        <h3 className="text-xs font-semibold text-foreground tracking-wide">Consistency Badges</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Earn badges by staying consistent with your membership.
        </p>
      </div>

      <div className="flex items-center gap-2 justify-center">
        {BADGES.map((badge, i) => {
          const unlocked = monthsActive >= badge.months;
          return (
            <motion.div
              key={badge.months}
              initial={unlocked ? { scale: 0.8, opacity: 0 } : false}
              animate={unlocked ? { scale: 1, opacity: 1 } : undefined}
              transition={unlocked ? {
                delay: i * 0.1,
                duration: 0.5,
                ease: [0.34, 1.56, 0.64, 1],
              } : undefined}
              whileTap={unlocked ? { scale: 0.9 } : undefined}
              whileHover={unlocked ? { scale: 1.08, y: -2 } : undefined}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold border transition-all duration-300 cursor-default ${
                unlocked
                  ? 'border-primary/20 bg-primary/[0.06] text-foreground shadow-[0_0_12px_hsl(var(--primary)/0.08)]'
                  : 'border-border/30 bg-muted/20 text-muted-foreground/25'
              }`}
              title={badge.full}
            >
              <span className={`text-base leading-none transition-all ${unlocked ? '' : 'grayscale opacity-30'}`}>
                {badge.emoji}
              </span>
              <span className="tracking-wider">{badge.label}</span>
              {unlocked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 + 0.3, type: 'spring', stiffness: 400 }}
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success flex items-center justify-center"
                >
                  <span className="text-[7px] text-success-foreground">✓</span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
