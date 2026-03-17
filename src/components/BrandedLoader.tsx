import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell } from 'lucide-react';

const MESSAGES = [
  'Preparing your dashboard…',
  'Loading your progress…',
  'Syncing your fitness journey…',
];

interface BrandedLoaderProps {
  label?: string;
  showMessage?: boolean;
}

export function BrandedLoader({ label, showMessage = true }: BrandedLoaderProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!showMessage) return;
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % MESSAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [showMessage]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <motion.div
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ boxShadow: '0 6px 24px -6px hsl(var(--primary) / 0.15)' }}
          >
            <Dumbbell className="w-7 h-7 text-primary-foreground" />
          </motion.div>
          <motion.div
            className="absolute -inset-2.5 rounded-3xl bg-primary/5 blur-xl"
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground tracking-wide">Aesthetic Gym</p>
          <motion.p
            key={showMessage ? msgIndex : label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-muted-foreground/60"
          >
            {label || (showMessage ? MESSAGES[msgIndex] : 'Loading…')}
          </motion.p>
          <div className="flex items-center gap-1.5 mt-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full bg-primary/40"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
