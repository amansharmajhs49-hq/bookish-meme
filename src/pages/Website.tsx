import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Users, Trophy, Heart, Clock, MapPin, Phone,
  Mail, ChevronRight, Star, Zap, Shield, ArrowRight, Menu, X, ChevronUp, ChevronLeft,
  Instagram, Facebook,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useGalleryPhotos } from '@/hooks/useGalleryPhotos';

type CSSVarStyle = CSSProperties & Record<string, string>;

function hexToHslVar(hexColor: string): string | null {
  const raw = (hexColor || '').trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;

  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        h = (g - b) / delta + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }

    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const NAV_LINKS = [
  { label: 'Home', href: '#hero' },
  { label: 'Services', href: '#services' },
  { label: 'Why Us', href: '#why-us' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Contact', href: '#contact' },
];

const SERVICES = [
  { icon: Dumbbell, title: 'Strength Training', desc: 'Build muscle and power with expert-guided weightlifting programs tailored to your level.' },
  { icon: Zap, title: 'HIIT & Cardio', desc: 'Torch calories and boost endurance with high-intensity interval training sessions.' },
  { icon: Users, title: 'Personal Training', desc: 'One-on-one coaching with certified trainers who design your perfect fitness plan.' },
  { icon: Heart, title: 'Nutrition Guidance', desc: 'Fuel your gains with personalized diet plans and supplement advice.' },
  { icon: Trophy, title: 'Body Transformation', desc: 'Complete 90-day transformation challenges with progress tracking and accountability.' },
  { icon: Shield, title: 'Functional Fitness', desc: 'Improve daily movement, flexibility, and injury prevention with functional exercises.' },
];

const STATS = [
  { value: '500+', label: 'Active Members' },
  { value: '10+', label: 'Expert Trainers' },
  { value: '5+', label: 'Years Experience' },
  { value: '98%', label: 'Client Satisfaction' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  }),
};


export default function Website() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [autoplayPaused, setAutoplayPaused] = useState(false);

  const ws = useWebsiteSettings();
  const { data: galleryPhotos } = useGalleryPhotos();

  const themeHsl = useMemo(() => {
    return hexToHslVar(ws.primary_color) ?? '0 72% 51%';
  }, [ws.primary_color]);

  const websiteThemeStyle = useMemo((): CSSVarStyle => {
    return {
      '--primary': themeHsl,
      '--accent': themeHsl,
      '--ring': themeHsl,
      '--sidebar-primary': themeHsl,
      '--sidebar-ring': themeHsl,
    };
  }, [themeHsl]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard nav for lightbox
  useEffect(() => {
    if (!lightboxOpen || !galleryPhotos?.length) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') setGalleryIndex(i => (i - 1 + galleryPhotos.length) % galleryPhotos.length);
      if (e.key === 'ArrowRight') setGalleryIndex(i => (i + 1) % galleryPhotos.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, galleryPhotos]);

  // Auto-slideshow (pauses on hover and when lightbox is open)
  useEffect(() => {
    if (!galleryPhotos?.length || galleryPhotos.length <= 1 || lightboxOpen || autoplayPaused) return;
    const timer = setInterval(() => {
      setGalleryIndex(i => (i + 1) % galleryPhotos.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [galleryPhotos, lightboxOpen, autoplayPaused]);

  const navLinks = ws.gallery_enabled
    ? NAV_LINKS
    : NAV_LINKS.filter(l => l.href !== '#gallery');

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
      <div
        className="min-h-screen bg-background text-foreground overflow-x-hidden"
        style={websiteThemeStyle}
      >
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo('#hero')} className="flex items-center gap-2">
            {ws.logo_url ? (
              <img src={ws.logo_url} alt={ws.gym_name} className="h-9 w-9 rounded-xl object-contain" />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <span className="font-bold text-lg tracking-tight">{ws.gym_name}</span>
          </button>

          <div className="hidden sm:flex items-center gap-6">
            {navLinks.map(l => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </button>
            ))}
            <button onClick={() => navigate('/auth')}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              Admin Login
            </button>
          </div>

          <button className="sm:hidden p-2 rounded-lg hover:bg-muted" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="sm:hidden border-t border-border bg-background/95 backdrop-blur-xl px-4 pb-4 pt-2 space-y-1">
            {navLinks.map(l => (
              <button key={l.href} onClick={() => scrollTo(l.href)}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                {l.label}
              </button>
            ))}
            <button onClick={() => navigate('/auth')}
              className="w-full mt-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
              Admin Login
            </button>
          </motion.div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section id="hero" className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 px-4 sm:px-6 overflow-hidden">
        {/* Hero background image */}
        {ws.hero_bg_url && (
          <>
            <div className="absolute inset-0 z-0">
              <img src={ws.hero_bg_url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 z-0 bg-background/80 dark:bg-background/85 backdrop-blur-sm" />
          </>
        )}
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
              <Star className="h-3 w-3" /> #1 Fitness Destination
            </span>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-6">
              {ws.tagline.includes(' ') ? (
                <>
                  {ws.tagline.split(' ').slice(0, 2).join(' ')}
                  <span className="block text-primary">{ws.tagline.split(' ').slice(2).join(' ')}</span>
                </>
              ) : (
                <span className="text-primary">{ws.tagline}</span>
              )}
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              {ws.description}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => scrollTo('#contact')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                Join Now <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => navigate('/portal')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-border bg-card text-foreground font-bold text-sm hover:bg-muted transition-all flex items-center justify-center gap-2">
                Member Portal <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            {STATS.map((s, i) => (
              <motion.div key={s.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="p-4 rounded-2xl bg-card border border-border">
                <p className="text-2xl sm:text-3xl font-black text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" className="py-20 px-4 sm:px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="text-primary text-xs font-bold tracking-widest uppercase">What We Offer</span>
            <h2 className="text-3xl sm:text-4xl font-black mt-2">Our Services</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
              Everything you need to achieve your dream physique, all under one roof.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((s, i) => (
              <motion.div key={s.title} custom={i} initial="hidden" whileInView="visible"
                viewport={{ once: true, margin: '-40px' }} variants={fadeUp}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Us ── */}
      <section id="why-us" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="text-primary text-xs font-bold tracking-widest uppercase">Why Choose Us</span>
            <h2 className="text-3xl sm:text-4xl font-black mt-2">The {ws.gym_name} Difference</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { title: 'Premium Equipment', desc: 'Top-of-the-line machines and free weights from leading brands.' },
              { title: 'Expert Coaching', desc: 'Certified trainers with years of competitive and coaching experience.' },
              { title: 'Hygiene First', desc: 'Sanitized equipment, clean locker rooms, and fresh towels daily.' },
              { title: 'Flexible Timings', desc: 'Open early morning to late night — train when it suits you.' },
              { title: 'Progress Tracking', desc: 'Digital body progress tracking with photos and measurements.' },
              { title: 'Supportive Community', desc: 'A motivated community that celebrates every PR and milestone.' },
            ].map((item, i) => (
              <motion.div key={item.title} custom={i} initial="hidden" whileInView="visible"
                viewport={{ once: true, margin: '-40px' }} variants={fadeUp}
                className="flex gap-4 p-5 rounded-2xl bg-card border border-border">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gallery Slideshow ── */}
      {ws.gallery_enabled && galleryPhotos && galleryPhotos.length > 0 && (
        <section id="gallery" className="py-20 px-4 sm:px-6 bg-card/50">
          <div className="max-w-6xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
              <span className="text-primary text-xs font-bold tracking-widest uppercase">Our Space</span>
              <h2 className="text-3xl sm:text-4xl font-black mt-2">Photo Gallery</h2>
              <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
                Take a peek inside {ws.gym_name} — where transformations happen daily.
              </p>
            </motion.div>

            {/* Main Slideshow */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
              className="relative max-w-4xl mx-auto">
              <div
                className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-border bg-muted cursor-pointer group"
                onClick={() => setLightboxOpen(true)}
                onMouseEnter={() => setAutoplayPaused(true)}
                onMouseLeave={() => setAutoplayPaused(false)}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.img
                    key={galleryPhotos[galleryIndex]?.name}
                    src={galleryPhotos[galleryIndex]?.url}
                    alt={`${ws.gym_name} gallery`}
                    className="absolute inset-0 w-full h-full object-cover will-change-transform"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    Tap to expand
                  </span>
                </div>

                {/* Nav arrows */}
                {galleryPhotos.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => (i - 1 + galleryPhotos.length) % galleryPhotos.length); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => (i + 1) % galleryPhotos.length); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Dot indicators */}
              {galleryPhotos.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-4">
                  {galleryPhotos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIndex(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === galleryIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                    />
                  ))}
                </div>
              )}

            </motion.div>
          </div>
        </section>
      )}

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxOpen && galleryPhotos && galleryPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>

            <AnimatePresence initial={false} mode="popLayout">
              <motion.img
                key={galleryPhotos[galleryIndex]?.name}
                src={galleryPhotos[galleryIndex]?.url}
                alt={`${ws.gym_name} gallery`}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl will-change-transform"
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                onClick={e => e.stopPropagation()}
              />
            </AnimatePresence>

            {galleryPhotos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => (i - 1 + galleryPhotos.length) % galleryPhotos.length); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => (i + 1) % galleryPhotos.length); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-xs font-medium">
              {galleryIndex + 1} / {galleryPhotos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contact ── */}
      <section id="contact" className="py-20 px-4 sm:px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="text-primary text-xs font-bold tracking-widest uppercase">Get In Touch</span>
            <h2 className="text-3xl sm:text-4xl font-black mt-2">Contact Us</h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm sm:text-base">
              Ready to start your fitness journey? Reach out and we'll get you started.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="space-y-4">
              <div className="p-5 rounded-2xl bg-card border border-border space-y-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Visit Us</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ws.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Call Us</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ws.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Gym Timings</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ws.timings_weekday}<br />{ws.timings_weekend}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Email</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ws.email}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
              className="relative p-6 rounded-2xl overflow-hidden flex flex-col justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 50%, hsl(var(--primary) / 0.9) 100%)' }}>
              {/* Decorative background elements */}
              <div className="absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 50% 50%, white 1px, transparent 1px)', backgroundSize: '60px 60px, 80px 80px, 40px 40px' }} />
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-foreground/10 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-primary-foreground/5 blur-xl" />
              <Dumbbell className="absolute top-4 right-4 h-20 w-20 text-primary-foreground/[0.06] rotate-12" />

              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-foreground/15 text-primary-foreground text-[10px] font-bold uppercase tracking-wider mb-4">
                  <Zap className="h-3 w-3" /> Free Trial Available
                </span>
                <h3 className="text-2xl font-black mb-3 text-primary-foreground">Start Your Journey Today</h3>
                <p className="text-sm text-primary-foreground/80 leading-relaxed mb-6">
                  Walk in for a free trial session. No commitments, no pressure — just results.
                  Our team is ready to help you achieve the physique you've always wanted.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={`https://wa.me/${ws.whatsapp_number}?text=${encodeURIComponent(`Hi, I'm interested in joining ${ws.gym_name}!`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="px-6 py-3 rounded-xl bg-primary-foreground text-primary font-bold text-sm text-center hover:opacity-90 transition-all hover:shadow-lg hover:shadow-primary-foreground/20">
                    WhatsApp Us 💬
                  </a>
                  <button onClick={() => navigate('/portal')}
                    className="px-6 py-3 rounded-xl border-2 border-primary-foreground/25 text-primary-foreground font-bold text-sm text-center hover:bg-primary-foreground/10 transition-all">
                    Member Portal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Google Maps Embed */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
            className="mt-8 max-w-4xl mx-auto rounded-2xl overflow-hidden border border-border">
            <iframe
              title={`${ws.gym_name} Location`}
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3602.8345100440847!2d78.5652739!3d25.4437957!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39777174ee9dde5b%3A0x78df23f030ef4eaa!2sAesthetic%20Gym!5e0!3m2!1sen!2sin!4v1773010762231!5m2!1sen!2sin"
              width="100%"
              height="300"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full"
            />
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">{ws.gym_name}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {ws.gym_name}. All rights reserved.
          </p>
          <div className="flex flex-col items-center sm:items-end gap-2">
            <div className="flex items-center gap-4">
              {ws.instagram_url && (
                <a
                  href={ws.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="sr-only">Instagram</span>
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {ws.facebook_url && (
                <a
                  href={ws.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="sr-only">Facebook</span>
                  <Facebook className="h-4 w-4" />
                </a>
              )}

              <button
                onClick={() => navigate('/portal')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Member Portal
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Admin
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.15em] uppercase font-light">
              Crafted with <span className="text-primary/70">♥</span> by{' '}
              <span className="font-semibold text-foreground/70 tracking-wider">Aman</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Scroll to Top */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: showScrollTop ? 1 : 0, scale: showScrollTop ? 1 : 0.8 }}
        transition={{ duration: 0.2 }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 z-50 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:bg-primary/90 transition-colors"
        style={{ pointerEvents: showScrollTop ? 'auto' : 'none' }}
        aria-label="Scroll to top"
      >
        <ChevronUp className="h-5 w-5" />
      </motion.button>
      </div>
  );
}
