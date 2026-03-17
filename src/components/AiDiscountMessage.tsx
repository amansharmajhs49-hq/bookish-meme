import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AiDiscountMessageProps {
  clientName: string;
  discount: number;
  planName: string;
}

const FALLBACK = "You've been given a valuable opportunity. Turn it into real progress.";

export function AiDiscountMessage({ clientName, discount, planName }: AiDiscountMessageProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (discount <= 0) return;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('ai-motivational-quote', {
          body: { type: 'discount', clientName, discount, planName },
        });

        if (error || !data?.quote || data.fallback) {
          setMessage(FALLBACK);
        } else {
          setMessage(data.quote);
        }
      } catch {
        setMessage(FALLBACK);
      } finally {
        setLoading(false);
      }
    })();
  }, [clientName, discount, planName]);

  if (discount <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="rounded-lg border border-success/12 bg-success/[0.03] p-2.5 flex items-start gap-2"
    >
      <Gift className="w-3.5 h-3.5 text-success/60 shrink-0 mt-0.5" />
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" className="h-3 w-3/4 bg-muted/30 rounded animate-pulse" />
        ) : (
          <motion.p
            key="msg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] leading-relaxed text-success/70 font-medium"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
