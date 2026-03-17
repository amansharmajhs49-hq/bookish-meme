import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, Users, Flame } from 'lucide-react';

interface AiMotivationalCardProps {
  clientName: string;
  progressPct: number;
  daysLeft: number;
  planName: string;
  membershipStatus?: string;
  netDue?: number;
  joinDate?: string;
}

interface MessageConfig {
  messages: string[];
  icon: 'sparkles' | 'flame' | 'trending' | 'users';
  label: string;
  borderClass: string;
  bgClass: string;
  iconClass: string;
  labelClass: string;
  textClass: string;
}

function getMessageConfig(
  name: string,
  pct: number,
  daysLeft: number,
  status: string,
  netDue: number,
): MessageConfig {
  const firstName = name.split(' ')[0];

  // EXPIRED — urgent FOMO
  if (status === 'EXPIRED') {
    return {
      messages: [
        `${firstName}, your membership expired. Every day you're away, others are getting the results you wanted.`,
        `While you're out, ${firstName}, the gym community is growing stronger. Don't fall behind.`,
        `${firstName}, momentum is everything. The longer you wait, the harder the comeback. Renew today.`,
        `The members who never stop are the ones who transform. Get back in, ${firstName}.`,
      ],
      icon: 'flame',
      label: 'Don\'t Fall Behind',
      borderClass: 'border-destructive/15',
      bgClass: 'bg-destructive/[0.04]',
      iconClass: 'text-destructive/70',
      labelClass: 'text-destructive/60',
      textClass: 'text-destructive/80',
    };
  }

  // HAS DUES — psychological nudge
  if (netDue > 0) {
    return {
      messages: [
        `${firstName}, clear your ₹${netDue.toLocaleString('en-IN')} dues — your competitors aren't pausing.`,
        `₹${netDue.toLocaleString('en-IN')} stands between you and uninterrupted progress, ${firstName}. Settle up.`,
        `The dedicated ones never let dues hold them back. Be that person, ${firstName}.`,
      ],
      icon: 'flame',
      label: 'Action Needed',
      borderClass: 'border-warning/15',
      bgClass: 'bg-warning/[0.04]',
      iconClass: 'text-warning/70',
      labelClass: 'text-warning/60',
      textClass: 'text-warning/80',
    };
  }

  // LAST DAY
  if (daysLeft === 0) {
    return {
      messages: [
        `TODAY is your last day, ${firstName}. Renew now — one day off becomes a week, a week becomes a month.`,
        `Last chance, ${firstName}. The strongest members never let their streak break.`,
      ],
      icon: 'flame',
      label: 'Final Day',
      borderClass: 'border-destructive/15',
      bgClass: 'bg-destructive/[0.04]',
      iconClass: 'text-destructive/70',
      labelClass: 'text-destructive/60',
      textClass: 'text-destructive/80',
    };
  }

  // 1-3 DAYS LEFT — urgency + FOMO
  if (daysLeft >= 1 && daysLeft <= 3) {
    return {
      messages: [
        `${daysLeft} day${daysLeft > 1 ? 's' : ''} left, ${firstName}. The top members are already renewing. Don't be the one who falls off.`,
        `Your cycle ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}, ${firstName}. Gaps in training cost you weeks of progress.`,
        `${firstName}, ${daysLeft} day${daysLeft > 1 ? 's' : ''} to go. The difference between fit and average? Never stopping.`,
      ],
      icon: 'flame',
      label: 'Renew Soon',
      borderClass: 'border-destructive/12',
      bgClass: 'bg-destructive/[0.03]',
      iconClass: 'text-destructive/60',
      labelClass: 'text-destructive/50',
      textClass: 'text-foreground/70',
    };
  }

  // 4-7 DAYS LEFT — soft urgency
  if (daysLeft >= 4 && daysLeft <= 7) {
    return {
      messages: [
        `${daysLeft} days until your cycle ends, ${firstName}. Plan your renewal — the disciplined ones never miss a beat.`,
        `Your membership ends soon, ${firstName}. The members who transform are the ones who stay consistent.`,
        `${firstName}, successful members renew early. ${daysLeft} days left in this cycle.`,
      ],
      icon: 'trending',
      label: 'Stay Ahead',
      borderClass: 'border-warning/12',
      bgClass: 'bg-warning/[0.03]',
      iconClass: 'text-warning/60',
      labelClass: 'text-warning/50',
      textClass: 'text-foreground/70',
    };
  }

  // ACTIVE — competitive motivation based on progress
  if (pct <= 15) {
    return {
      messages: [
        `Day one energy, ${firstName}. The members who show up in the first week set the tone for everything.`,
        `You're just getting started, ${firstName}. The community is watching. Make your mark.`,
        `Fresh start, ${firstName}. The ones who build habits in week one are the ones who transform.`,
      ],
      icon: 'sparkles',
      label: 'New Cycle',
      borderClass: 'border-primary/10',
      bgClass: 'bg-primary/[0.03]',
      iconClass: 'text-primary/60',
      labelClass: 'text-primary/50',
      textClass: 'text-foreground/65',
    };
  }

  if (pct <= 35) {
    return {
      messages: [
        `Building momentum, ${firstName}. You're in the top tier of members who actually show up consistently.`,
        `${firstName}, most people quit by now. You didn't. That's what separates you.`,
        `Great start, ${firstName}. The community respects those who stay disciplined.`,
      ],
      icon: 'trending',
      label: 'Building Momentum',
      borderClass: 'border-primary/10',
      bgClass: 'bg-primary/[0.03]',
      iconClass: 'text-primary/60',
      labelClass: 'text-primary/50',
      textClass: 'text-foreground/65',
    };
  }

  if (pct <= 60) {
    return {
      messages: [
        `Halfway through, ${firstName}. You're outperforming most members. Keep that energy.`,
        `${firstName}, you're in the zone. The ones who push through the middle are the ones who see real results.`,
        `Consistency is your superpower, ${firstName}. You're proving it every day.`,
      ],
      icon: 'users',
      label: 'Halfway Strong',
      borderClass: 'border-primary/10',
      bgClass: 'bg-primary/[0.03]',
      iconClass: 'text-primary/60',
      labelClass: 'text-primary/50',
      textClass: 'text-foreground/65',
    };
  }

  if (pct <= 85) {
    return {
      messages: [
        `${firstName}, your discipline is elite. Most members dream of this consistency.`,
        `You're in the final stretch, ${firstName}. The community looks up to members like you.`,
        `${firstName}, you've trained harder than 90% this cycle. Finish what you started.`,
      ],
      icon: 'trending',
      label: 'Elite Consistency',
      borderClass: 'border-success/10',
      bgClass: 'bg-success/[0.03]',
      iconClass: 'text-success/60',
      labelClass: 'text-success/50',
      textClass: 'text-foreground/65',
    };
  }

  return {
    messages: [
      `Outstanding, ${firstName}. You're in the top 1% of committed members. Legends don't stop.`,
      `${firstName}, you've nearly completed a full cycle. That's rare. That's powerful. Renew and go again.`,
      `The strongest version of you is being built right now, ${firstName}. Don't stop.`,
    ],
    icon: 'flame',
    label: 'Peak Performance',
    borderClass: 'border-success/12',
    bgClass: 'bg-success/[0.03]',
    iconClass: 'text-success/60',
    labelClass: 'text-success/50',
    textClass: 'text-foreground/65',
  };
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
}: AiMotivationalCardProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  const config = useMemo(
    () => getMessageConfig(clientName, progressPct, daysLeft, membershipStatus, netDue),
    [clientName, progressPct, daysLeft, membershipStatus, netDue],
  );

  // Initial delay reveal
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, []);

  // Rotate messages
  useEffect(() => {
    if (config.messages.length <= 1) return;
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % config.messages.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [config.messages.length]);

  // Reset index when config changes
  useEffect(() => {
    setMessageIndex(0);
  }, [membershipStatus, daysLeft <= 3 ? 'urgent' : 'normal', netDue > 0 ? 'due' : 'clear']);

  const IconComp = iconMap[config.icon];
  const message = config.messages[messageIndex % config.messages.length];

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
      </div>

      <AnimatePresence mode="wait">
        {visible ? (
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`relative text-[11px] leading-relaxed font-medium ${config.textClass}`}
          >
            {message}
          </motion.p>
        ) : (
          <motion.div key="skeleton" className="h-3.5 w-3/4 bg-muted/30 rounded animate-pulse" />
        )}
      </AnimatePresence>
    </div>
  );
}
