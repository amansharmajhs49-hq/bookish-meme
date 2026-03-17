import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientAvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Generate a consistent color from a name
function getAvatarColor(name: string): string {
  const colors = [
    'from-primary/60 to-primary/30',
    'from-blue-500/50 to-cyan-400/30',
    'from-emerald-500/50 to-teal-400/30',
    'from-amber-500/50 to-orange-400/30',
    'from-rose-500/50 to-pink-400/30',
    'from-violet-500/50 to-purple-400/30',
    'from-indigo-500/50 to-blue-400/30',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function ClientAvatar({ src, name, size = 'md', className }: ClientAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-24 w-24 text-2xl',
  };

  const rawParts = name.trim().split(/\s+/).filter(Boolean);
  const initials = rawParts.length >= 2
    ? (rawParts[0][0] + rawParts[rawParts.length - 1][0]).toUpperCase()
    : (rawParts[0]?.slice(0, 2) || '??').toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          'rounded-full object-cover ring-2 ring-border',
          size === 'lg' && 'ring-4 ring-primary/30',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-foreground/80 ring-2 ring-border',
        getAvatarColor(name),
        size === 'lg' && 'ring-4 ring-primary/30',
        sizeClasses[size],
        className
      )}
    >
      {initials || <User className="h-1/2 w-1/2 opacity-60" />}
    </div>
  );
}
