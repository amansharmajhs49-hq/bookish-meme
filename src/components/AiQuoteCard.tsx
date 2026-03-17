import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AiQuoteCardProps {
  clientName: string;
  membershipStatus?: string;
  daysLeft?: number;
  discount?: number;
  planName?: string;
}

const FALLBACK_QUOTES = [
  "Consistency beats intensity. Show up today.",
  "Every rep is a vote for the body you want.",
  "Your future self is built in today's workout.",
  "The iron doesn't lie. Neither does your effort.",
  "Discipline is choosing between what you want now and what you want most.",
];

const FALLBACK_DISCOUNT = "You've been given a valuable opportunity. Turn it into real progress.";

type QuoteType = 'general' | 'discount';

export function AiQuoteCard({ clientName, membershipStatus, daysLeft, discount, planName }: AiQuoteCardProps) {
  const [quote, setQuote] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentType, setCurrentType] = useState<QuoteType>('general');
  const cycleRef = useRef(0);

  // Determine which type to show based on cycle
  const getNextType = useCallback((): QuoteType => {
    if (!discount || discount <= 0) return 'general';
    // Show discount quote every 3rd cycle (index 0, 1 = discount, 2 = general)
    const cycle = cycleRef.current;
    cycleRef.current = (cycle + 1) % 3;
    return cycle < 2 ? 'discount' : 'general';
  }, [discount]);

  const fetchQuote = useCallback(async (isRefresh = false) => {
    const type = isRefresh ? getNextType() : (discount && discount > 0 ? 'discount' : 'general');
    setCurrentType(type);
    
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const body = type === 'discount'
        ? { type: 'discount', clientName, discount, planName }
        : { type: 'general', clientName, status: membershipStatus, daysLeft };

      const { data, error } = await supabase.functions.invoke('ai-motivational-quote', { body });

      if (error || !data?.quote || data.fallback) {
        setQuote(type === 'discount' ? FALLBACK_DISCOUNT : FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]);
      } else {
        setQuote(data.quote);
      }
    } catch {
      setQuote(type === 'discount' ? FALLBACK_DISCOUNT : FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientName, membershipStatus, daysLeft, discount, planName, getNextType]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const isDiscount = currentType === 'discount';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className={`relative overflow-hidden rounded-xl border p-4 ${
        isDiscount 
          ? 'border-success/15 bg-gradient-to-br from-success/[0.05] to-transparent' 
          : 'border-primary/10 bg-gradient-to-br from-primary/[0.04] to-transparent'
      }`}
    >
      {/* Subtle glow accent */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
        isDiscount ? 'bg-success/[0.06]' : 'bg-primary/[0.06]'
      }`} />

      <div className="relative flex items-start gap-3">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="shrink-0 mt-0.5"
        >
          {isDiscount ? (
            <Gift className="w-4 h-4 text-success/60" />
          ) : (
            <Sparkles className="w-4 h-4 text-primary/60" />
          )}
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${
              isDiscount ? 'text-success/50' : 'text-primary/50'
            }`}>
              {isDiscount ? 'Special Discount' : 'AI Motivation'}
            </span>
            <motion.button
              whileTap={{ scale: 0.85, rotate: 180 }}
              onClick={() => fetchQuote(true)}
              disabled={refreshing}
              className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground/50 hover:text-primary/60 transition-colors disabled:opacity-30"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-1.5"
              >
                <div className="h-3 w-full bg-muted/40 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-muted/30 rounded animate-pulse" />
              </motion.div>
            ) : (
              <motion.p
                key={quote}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.4 }}
                className={`text-[12px] leading-relaxed font-medium italic ${
                  isDiscount ? 'text-success/70' : 'text-foreground/70'
                }`}
              >
                "{quote}"
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
