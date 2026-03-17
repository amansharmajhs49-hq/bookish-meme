import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dumbbell, LogIn, Eye, EyeOff, Phone, Lock, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Portal() {
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !pin.trim()) {
      toast({ title: 'Enter phone number and PIN', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_client_portal', {
        p_phone: phone.trim(),
        p_pin: pin.trim(),
      });

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        toast({ title: result.error || 'Invalid credentials', variant: 'destructive' });
        return;
      }

      // Log the portal login
      await supabase.from('portal_logins' as any).insert({
        client_id: result.client_id,
        client_name: result.client_name,
        client_phone: phone.trim(),
      } as any).then(() => {});

      sessionStorage.setItem('portal_client_id', result.client_id);
      sessionStorage.setItem('portal_pin', pin.trim());
      sessionStorage.setItem('portal_name', result.client_name);
      window.location.href = '/portal/dashboard';
    } catch (err: any) {
      toast({ title: 'Login failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/3 blur-3xl" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-primary/4 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo & Branding */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
          className="text-center mb-8"
        >
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 mb-5">
            <Dumbbell className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Aesthetic Gym
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Member Portal
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-[var(--shadow-card)]"
        >
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Phone Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full pl-10 pr-3 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                  maxLength={15}
                />
              </div>
            </div>

            {/* PIN Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">PIN</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter your PIN"
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all tracking-[0.3em]"
                  maxLength={6}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2.5 hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-primary/20 text-[15px]"
            >
              {loading ? (
                <span className="animate-spin w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
              ) : (
                <>
                  <LogIn className="w-4.5 h-4.5" />
                  View My Details
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center space-y-2"
        >
          <p className="text-xs text-muted-foreground/70">
            Don't have a PIN? Ask your gym admin
          </p>
          <button
            onClick={() => window.location.href = '/website'}
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
          >
            <Globe className="w-3 h-3" />
            Visit Website
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/40">
            <Dumbbell className="w-3 h-3" />
            <span>Powered by Aesthetic Gym</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
