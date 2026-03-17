import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedMode, setMode, mode } = useTheme();

  const toggle = () => {
    setMode(resolvedMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-lg hover:bg-muted transition-colors ${className}`}
      title={`Switch to ${resolvedMode === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedMode === 'dark' ? (
        <Sun className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Moon className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );
}
