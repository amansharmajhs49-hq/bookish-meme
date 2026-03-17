import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  ReactNode,
} from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type AccentColor = 'grey' | 'crimson' | 'purple' | 'blue' | 'emerald' | 'amber';

interface ThemeContextType {
  mode: ThemeMode;
  accent: AccentColor;
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ACCENT_COLORS: Record<AccentColor, { h: number; s: number; l: number }> = {
  grey: { h: 0, s: 0, l: 61 },
  crimson: { h: 0, s: 72, l: 51 },
  purple: { h: 270, s: 60, l: 55 },
  blue: { h: 217, s: 91, l: 60 },
  emerald: { h: 160, s: 84, l: 39 },
  amber: { h: 38, s: 92, l: 50 },
};

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme-mode') as ThemeMode) || 'dark';
  });
  const [accent, setAccentState] = useState<AccentColor>(() => {
    return (localStorage.getItem('theme-accent') as AccentColor) || 'grey';
  });

  const resolvedMode = mode === 'system' ? getSystemTheme() : mode;

  // Listen for system theme changes
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setModeState('system'); // trigger re-render
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  // Apply theme + accent before paint and suppress transitions during the change
  useLayoutEffect(() => {
    const root = document.documentElement;

    root.classList.add('suppress-transitions');

    // Apply dark/light class
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedMode);
    // Hint native controls
    (root.style as any).colorScheme = resolvedMode;

    // Apply accent color CSS variables
    const c = ACCENT_COLORS[accent];
    const hsl = `${c.h} ${c.s}% ${c.l}%`;
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--accent', hsl);
    root.style.setProperty('--ring', hsl);
    root.style.setProperty('--sidebar-primary', hsl);
    root.style.setProperty('--sidebar-ring', hsl);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => root.classList.remove('suppress-transitions'));
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      root.classList.remove('suppress-transitions');
    };
  }, [resolvedMode, accent]);

  const setMode = (m: ThemeMode) => {
    localStorage.setItem('theme-mode', m);
    setModeState(m);
  };

  const setAccent = (a: AccentColor) => {
    localStorage.setItem('theme-accent', a);
    setAccentState(a);
  };

  return (
    <ThemeContext.Provider value={{ mode, accent, resolvedMode, setMode, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export const ACCENT_OPTIONS: { key: AccentColor; label: string; color: string }[] = [
  { key: 'grey', label: 'Grey', color: 'hsl(0, 0%, 61%)' },
  { key: 'crimson', label: 'Crimson', color: 'hsl(0, 72%, 51%)' },
  { key: 'purple', label: 'Purple', color: 'hsl(270, 60%, 55%)' },
  { key: 'blue', label: 'Blue', color: 'hsl(217, 91%, 60%)' },
  { key: 'emerald', label: 'Emerald', color: 'hsl(160, 84%, 39%)' },
  { key: 'amber', label: 'Amber', color: 'hsl(38, 92%, 50%)' },
];
