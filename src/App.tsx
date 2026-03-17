import { lazy, Suspense, useEffect, useRef } from "react";
import { useSwipeNavigation, getNavDirection, setNavDirection } from "@/hooks/useSwipeNavigation";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { DashboardSkeleton, ClientsPageSkeleton, ClientDetailSkeleton } from "@/components/DashboardSkeleton";
import { AnimatePresence, motion } from "framer-motion";
import { Dumbbell } from "lucide-react";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Plans = lazy(() => import("./pages/Plans"));
const Products = lazy(() => import("./pages/Products"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Portal = lazy(() => import("./pages/Portal"));
const PortalDashboard = lazy(() => import("./pages/PortalDashboard"));
const Website = lazy(() => import("./pages/Website"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
  },
});

// Scroll restoration component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

function safeGetCachedWebsiteSettings(): { gym_name: string; primary_color: string } {
  const defaults = { gym_name: 'Aesthetic Gym', primary_color: '' };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem('website_settings_cache_v1');
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      gym_name: typeof parsed?.gym_name === 'string' && parsed.gym_name.trim() ? parsed.gym_name.trim() : defaults.gym_name,
      primary_color: typeof parsed?.primary_color === 'string' ? parsed.primary_color.trim() : '',
    };
  } catch {
    return defaults;
  }
}

function hexToInlineHsl(hex: string): string | null {
  const raw = (hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) h = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function NeutralPageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center" style={{ boxShadow: '0 4px 16px -4px hsl(var(--primary) / 0.15)' }}>
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-1 h-1 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WebsiteBrandedLoader() {
  const { gym_name, primary_color = "#9c9c9c" } = safeGetCachedWebsiteSettings();
  const hsl = hexToInlineHsl(primary_color);
  const style = hsl ? { '--primary': hsl, '--accent': hsl } as React.CSSProperties & Record<string, string> : undefined;
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" style={style}>
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <Dumbbell className="h-8 w-8 text-primary-foreground" />
        </div>
        <div className="text-center">
          <div className="text-xl font-bold tracking-tight text-foreground">{gym_name}</div>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:120ms]" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse [animation-delay:240ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Page-specific fallback skeletons
function PageFallback({
  pathname,
  showAdminSkeleton,
}: {
  pathname: string;
  showAdminSkeleton: boolean;
}) {
  // For public/unauthenticated states (or while auth is still determining), never show admin skeletons.
  if (!showAdminSkeleton) {
    // Public website: show branded loader instead of generic "Loading..."
    if (pathname === '/website') return <WebsiteBrandedLoader />;
    return <NeutralPageLoader />;
  }

  if (pathname === '/website') {
    return <WebsiteBrandedLoader />;
  }
  if (pathname === '/' || pathname === '') {
    return <DashboardSkeleton />;
  }
  if (pathname === '/clients') {
    return <ClientsPageSkeleton />;
  }
  if (pathname.startsWith('/clients/')) {
    return <ClientDetailSkeleton />;
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="page-header">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

const pageVariants = {
  enter: (direction: number) => ({
    x: direction === 0 ? 0 : direction > 0 ? '4%' : '-4%',
    opacity: direction === 0 ? 1 : 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction === 0 ? 0 : direction > 0 ? '-2%' : '2%',
    opacity: 0,
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
  }),
};

const pageTransition = {
  duration: 0.18,
  ease: [0.25, 0.46, 0.45, 0.94],
};

// Router content component to access location
function AppRoutes() {
  const location = useLocation();
  useSwipeNavigation();

  const { user, loading } = useAuth();
  const showAdminSkeleton = !loading && !!user;

  const direction = getNavDirection();

  // Reset direction after capturing it for this render
  const directionRef = useRef(direction);
  directionRef.current = direction;
  useEffect(() => {
    // Reset after animation starts so next non-swipe nav doesn't slide
    const timer = setTimeout(() => setNavDirection(0), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      <ScrollToTop />
      <div className="relative w-full min-h-screen bg-background">
        <AnimatePresence mode="wait" custom={directionRef.current}>
          <motion.div
            className="w-full min-h-screen"
            key={location.pathname}
            custom={directionRef.current}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={pageTransition}
          >
            <Suspense
              fallback={
                <PageFallback
                  pathname={location.pathname}
                  showAdminSkeleton={showAdminSkeleton}
                />
              }
            >
              <Routes location={location}>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientDetail />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/products" element={<Products />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/bin" element={<Settings />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/portal" element={<Portal />} />
                <Route path="/portal/dashboard" element={<PortalDashboard />} />
                <Route path="/website" element={<Website />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
      <PWAInstallBanner />
    </>
  );
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
