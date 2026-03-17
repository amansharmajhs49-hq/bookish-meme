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
    <div className="bg-card rounded-xl border border-border p-3.5 space-y-3">
      <div>
        <h3 className="text-xs font-bold text-foreground tracking-wide">Loyalty Milestones</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Badges earned by staying a consistent member. You've been with us for {monthsActive} month{monthsActive !== 1 ? 's' : ''}.
        </p>
      </div>

      <div className="flex items-end gap-2 justify-center">
        {BADGES.map((badge, i) => {
          const unlocked = monthsActive >= badge.months;
          const monthsToUnlock = badge.months - monthsActive;
          return (
            <motion.div
              key={badge.months}
              initial={unlocked ? { scale: 0.8, opacity: 0 } : false}
              animate={unlocked ? { scale: 1, opacity: 1 } : undefined}
              transition={unlocked ? { delay: i * 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } : undefined}
              whileHover={unlocked ? { scale: 1.08, y: -3 } : undefined}
              className={`relative flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-[10px] font-bold border transition-all duration-300 cursor-default ${
                unlocked
                  ? 'border-primary/25 bg-primary/[0.07] text-foreground shadow-sm'
                  : 'border-border/30 bg-muted/20 text-muted-foreground/30 grayscale'
              }`}
              title={unlocked ? badge.full : `Unlock in ${monthsToUnlock} more month${monthsToUnlock !== 1 ? 's' : ''}`}
            >
              <span className="text-lg leading-none">{unlocked ? badge.emoji : '🔒'}</span>
              <span className={`text-[9px] font-bold ${unlocked ? 'text-primary' : 'text-muted-foreground/30'}`}>{badge.label}</span>
              {!unlocked && monthsToUnlock <= 3 && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] bg-amber-500 text-white px-1.5 rounded-full font-bold whitespace-nowrap">
                  {monthsToUnlock}mo
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {monthsActive < 12 && (
        <p className="text-[10px] text-muted-foreground text-center">
          {BADGES.find(b => b.months > monthsActive) && (
            <>Next: {BADGES.find(b => b.months > monthsActive)!.full} in {BADGES.find(b => b.months > monthsActive)!.months - monthsActive} month{BADGES.find(b => b.months > monthsActive)!.months - monthsActive !== 1 ? 's' : ''}</>
          )}
        </p>
      )}
    </div>
  );
}
