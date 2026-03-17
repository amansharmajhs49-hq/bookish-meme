import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Dumbbell } from 'lucide-react';

interface PortalOnboardingProps {
  clientId: string;
  clientName: string;
  onComplete: () => void;
}

const SCENE_DURATIONS = [3200, 4000, 5500];

const sceneVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, scale: 1.02, filter: 'blur(4px)' },
};

const sceneTransition = { duration: 0.7, ease: [0.22, 1, 0.36, 1] };

/* ── Fitness background illustrations (SVG-based, subtle) ── */
function FitnessBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.025]">
      {/* Dumbbell silhouettes */}
      <svg className="absolute top-[10%] left-[5%] w-32 h-32 text-foreground rotate-[-15deg]" viewBox="0 0 100 100" fill="currentColor">
        <rect x="10" y="42" width="20" height="16" rx="3" />
        <rect x="70" y="42" width="20" height="16" rx="3" />
        <rect x="28" y="46" width="44" height="8" rx="2" />
        <rect x="5" y="38" width="8" height="24" rx="2" />
        <rect x="87" y="38" width="8" height="24" rx="2" />
      </svg>
      
      {/* Energy wave */}
      <svg className="absolute bottom-[15%] right-[8%] w-40 h-20 text-foreground rotate-[8deg]" viewBox="0 0 200 60" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 30 Q30 10 50 30 Q70 50 90 30 Q110 10 130 30 Q150 50 170 30 Q190 10 200 30" />
      </svg>
      
      {/* Abstract strength symbol */}
      <svg className="absolute top-[60%] left-[10%] w-24 h-24 text-foreground rotate-[20deg]" viewBox="0 0 80 80" fill="currentColor">
        <polygon points="40,5 50,30 75,30 55,48 62,75 40,58 18,75 25,48 5,30 30,30" opacity="0.4" />
      </svg>
      
      {/* Barbell plate */}
      <svg className="absolute top-[20%] right-[12%] w-20 h-20 text-foreground" viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="30" cy="30" r="25" />
        <circle cx="30" cy="30" r="18" />
        <circle cx="30" cy="30" r="8" />
      </svg>
    </div>
  );
}

/* ── Subtle light sweep ── */
function LightSweep() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.15, 0] }}
      transition={{ duration: 4, ease: 'easeInOut' }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, transparent 35%, hsl(var(--primary) / 0.01) 45%, hsl(var(--primary) / 0.018) 50%, hsl(var(--primary) / 0.01) 55%, transparent 65%)',
        }}
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ duration: 4, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.div>
  );
}

/* ── Celebratory effect — confetti + sparkles + shimmer particles ── */
function CelebratoryEffect() {
  // Confetti pieces
  const confetti = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * 360 + (Math.random() * 15 - 7.5);
    const rad = (angle * Math.PI) / 180;
    const dist = 50 + Math.random() * 120;
    const size = 3 + Math.random() * 4;
    const delay = Math.random() * 0.6;
    const colors = [
      'hsl(38 90% 55%)',      // gold
      'hsl(var(--primary))',   // primary  
      'hsl(210 80% 60%)',     // blue
      'hsl(340 75% 55%)',     // rose
      'hsl(150 60% 50%)',     // green
    ];
    const color = colors[i % colors.length];
    const rotation = Math.random() * 360;
    return { id: i, x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, size, delay, color, rotation };
  });

  // Sparkle particles
  const sparkles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 280,
    y: (Math.random() - 0.5) * 200,
    size: 1.5 + Math.random() * 2.5,
    delay: 0.3 + Math.random() * 1,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
      {/* Confetti burst */}
      {confetti.map(p => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            width: p.size,
            height: p.size * 1.5,
            background: p.color,
            borderRadius: p.size > 5 ? '1px' : '50%',
            opacity: 0.8,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0, rotate: 0 }}
          animate={{
            x: p.x,
            y: [p.y * 0.3, p.y],
            opacity: [0, 0.9, 0],
            scale: [0, 1.2, 0.5],
            rotate: [0, p.rotation],
          }}
          transition={{
            duration: 1.8 + Math.random() * 0.6,
            delay: p.delay,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}

      {/* Sparkles */}
      {sparkles.map(s => (
        <motion.div
          key={`sp-${s.id}`}
          className="absolute rounded-full bg-primary/40"
          style={{ width: s.size, height: s.size, boxShadow: '0 0 6px hsl(var(--primary) / 0.3)' }}
          initial={{ x: s.x, y: s.y, opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{ duration: 1.5, delay: s.delay, ease: 'easeOut' }}
        />
      ))}

      {/* Expanding rings */}
      {[0, 0.15, 0.35].map((delay, i) => (
        <motion.div
          key={`ring-${i}`}
          className="absolute rounded-full border"
          style={{
            width: 20 + i * 8,
            height: 20 + i * 8,
            borderColor: i === 0
              ? 'hsl(38 80% 55% / 0.12)'
              : 'hsl(var(--primary) / 0.06)',
          }}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 2.5 + i * 0.5], opacity: [0.3, 0] }}
          transition={{ duration: 1.6, ease: 'easeOut', delay }}
        />
      ))}

      {/* Central glow */}
      <motion.div
        className="absolute w-12 h-12 rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(38 80% 55% / 0.1) 0%, transparent 70%)' }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 2, 2.5], opacity: [0, 0.4, 0] }}
        transition={{ duration: 1.8, ease: 'easeOut', delay: 0.1 }}
      />
    </div>
  );
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Premium ascending chime: C5 → E5 → G5 → C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + i * 0.18 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.9);
    });
    setTimeout(() => ctx.close(), 2500);
  } catch {}
}

export function PortalOnboarding({ clientId, clientName, onComplete }: PortalOnboardingProps) {
  const [scene, setScene] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const [showSweep, setShowSweep] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exiting, setExiting] = useState(false);
  const audioPlayed = useRef(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (scene < 3) {
      timeout = setTimeout(() => {
        const next = scene + 1;
        if (next >= 2) setShowSweep(true);
        setScene(next);
        if (next === 3) {
          try { navigator.vibrate?.([30, 15, 30, 15, 50]); } catch {}
          if (!audioPlayed.current) {
            audioPlayed.current = true;
            playChime();
          }
          setShowCelebration(true);
          // Show button 2s after identity line for cinematic pacing
          setTimeout(() => setShowButton(true), 3600);
        }
      }, scene === 0 ? 600 : SCENE_DURATIONS[scene - 1]);
    }
    return () => clearTimeout(timeout);
  }, [scene]);

  useEffect(() => {
    if (showSweep) {
      const t = setTimeout(() => setShowSweep(false), 4200);
      return () => clearTimeout(t);
    }
  }, [showSweep]);

  const handleContinue = useCallback(async () => {
    setSaving(true);
    try {
      await supabase
        .from('clients')
        .update({ onboarding_completed: true } as any)
        .eq('id', clientId);
    } catch {}
    sessionStorage.setItem('portal_onboarding_done', '1');
    setExiting(true);
    setTimeout(onComplete, 800);
  }, [clientId, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'hsl(var(--background))' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: exiting ? 0.7 : 1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Fitness background illustrations */}
      <FitnessBackground />

      {/* Soft gradient overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(var(--background) / 0.6) 70%, hsl(var(--background)) 100%)',
        }}
      />

      {/* Breathing glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full bg-primary/[0.01] blur-[140px]"
          animate={{ scale: [1, 1.05, 1], opacity: [0.01, 0.025, 0.01] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <AnimatePresence>{showSweep && <LightSweep key="sweep" />}</AnimatePresence>

      <div className="relative z-10 flex flex-col items-center text-center w-full px-6 justify-center">
        <AnimatePresence mode="wait">
          {/* SCENE 1 — Welcome */}
          {scene === 1 && (
            <motion.div
              key="s1"
              variants={sceneVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={sceneTransition}
              className="flex flex-col items-center gap-5"
            >
              <motion.div
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                style={{ boxShadow: '0 6px 24px -6px hsl(var(--primary) / 0.15)' }}
              >
                <Dumbbell className="w-7 h-7 text-primary-foreground" />
              </motion.div>
              <h1
                className="text-[clamp(1.75rem,6vw,2.75rem)] font-bold text-foreground tracking-tight leading-tight"
                style={{ textShadow: '0 0 30px hsl(var(--primary) / 0.03)' }}
              >
                Welcome, {clientName}
              </h1>
            </motion.div>
          )}

          {/* SCENE 2 — Community */}
          {scene === 2 && (
            <motion.div
              key="s2"
              variants={sceneVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ ...sceneTransition, duration: 0.7 }}
              className="flex flex-col items-center gap-4"
            >
              <h2
                className="text-[clamp(1.25rem,4.5vw,1.75rem)] font-semibold text-foreground/90 leading-snug"
                style={{ textShadow: '0 0 20px hsl(var(--primary) / 0.02)' }}
              >
                To the Aesthetic Gym Community
              </h2>
              <motion.p
                className="text-[clamp(0.8rem,2.8vw,1rem)] text-muted-foreground font-light leading-relaxed max-w-xs"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Your journey of strength, discipline & transformation starts here
              </motion.p>
            </motion.div>
          )}

          {/* SCENE 3 — Identity + celebration */}
          {scene === 3 && (
            <motion.div
              key="s3"
              variants={sceneVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ ...sceneTransition, duration: 0.7 }}
              className="relative flex flex-col items-center gap-3"
            >
              {showCelebration && <CelebratoryEffect />}

              <motion.div className="relative z-10">
                <motion.h2
                  className="text-[clamp(1.15rem,4.2vw,1.6rem)] font-bold text-foreground leading-snug"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  You are part of the
                  <br />
                  <motion.span
                    className="text-primary inline-block"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    Aesthetic Gym
                  </motion.span>
                  {' '}community now
                </motion.h2>
              </motion.div>

              {/* Core values */}
              <motion.div
                className="flex items-center gap-3 relative z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                {['Consistency', 'Discipline', 'Transformation'].map((word, i) => (
                  <motion.span
                    key={word}
                    className="text-[10px] sm:text-xs tracking-[0.2em] uppercase text-primary/40 font-semibold"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1 + i * 0.15 }}
                  >
                    {i > 0 && <span className="mr-3 text-primary/20">·</span>}
                    {word}
                  </motion.span>
                ))}
              </motion.div>

              <motion.p
                className="text-[11px] text-muted-foreground/40 font-medium relative z-10 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.6 }}
              >
                The strongest version of you starts today
              </motion.p>

              {/* Enter Dashboard — cinematic reveal with staggered layers */}
              <AnimatePresence>
                {showButton && (
                  <motion.div
                    className="relative z-10 mt-6 flex flex-col items-center gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Subtle line divider that draws in */}
                    <motion.div
                      className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 120, opacity: 1 }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    />

                    {/* Glow backdrop behind button */}
                    <motion.div
                      className="absolute top-8 w-40 h-16 rounded-full blur-3xl"
                      style={{ background: 'hsl(var(--primary) / 0.06)' }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: [0, 1, 0.7], scale: [0.5, 1.3, 1.1] }}
                      transition={{ duration: 2, ease: 'easeOut', delay: 0.3 }}
                    />

                    {/* The button itself */}
                    <motion.button
                      initial={{ opacity: 0, y: 24, scale: 0.9, filter: 'blur(8px)' }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        filter: 'blur(0px)',
                        x: [0, -2, 2, -1.5, 1.5, -1, 1, -0.5, 0.5, 0],
                      }}
                      transition={{
                        duration: 1.2,
                        delay: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                        x: {
                          delay: 1.8,
                          duration: 0.6,
                          ease: 'easeInOut',
                          repeat: 2,
                          repeatDelay: 4,
                        },
                      }}
                      whileHover={{ boxShadow: '0 8px 32px -6px hsl(var(--primary) / 0.25)', scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleContinue}
                      disabled={saving}
                      className="relative px-12 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm tracking-wide transition-colors disabled:opacity-50 overflow-hidden"
                      style={{ boxShadow: '0 4px 20px -4px hsl(var(--primary) / 0.15)' }}
                    >
                      {/* Shimmer sweep */}
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/[0.06] to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: ['−100%', '200%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut', delay: 1.5 }}
                      />
                      {/* Border glow pulse */}
                      <motion.span
                        className="absolute inset-0 rounded-2xl"
                        style={{ boxShadow: '0 0 0 1px hsl(var(--primary-foreground) / 0.08) inset' }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <span className="relative flex items-center gap-2">
                        {saving ? (
                          <span className="inline-block w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                          <>
                            Enter Dashboard
                            <motion.span
                              className="inline-block"
                              animate={{ x: [0, 4, 0] }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                            >
                              →
                            </motion.span>
                          </>
                        )}
                      </span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
