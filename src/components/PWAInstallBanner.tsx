import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAInstallBanner() {
  const { isInstallable, install, dismiss } = usePWAInstall();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isInstallable) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50 bg-card border border-primary/20 rounded-2xl p-4 shadow-xl max-w-sm mx-auto"
      >
        <button
          onClick={() => { dismiss(); setShow(false); }}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Install Aesthetic Gym</p>
            <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
          </div>
          <button
            onClick={async () => {
              await install();
              setShow(false);
            }}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0"
          >
            Install
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
