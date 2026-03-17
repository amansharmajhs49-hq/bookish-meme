import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Download, Trash2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClientAvatar } from './ClientAvatar';

interface ProfilePhotoViewerProps {
  src?: string | null;
  name: string;
  onChangePhoto?: () => void;
  onRemovePhoto?: () => void;
}

export function ProfilePhotoViewer({ src, name, onChangePhoto, onRemovePhoto }: ProfilePhotoViewerProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 200);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [open, close]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) close();
  };

  const handleDownload = async () => {
    if (!src) return;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_')}_photo.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  };

  return (
    <>
      {/* Clickable avatar trigger */}
      <button
        onClick={() => setOpen(true)}
        className="relative group cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`View ${name}'s profile photo`}
      >
        <ClientAvatar src={src} name={name} size="lg" className="transition-transform duration-200 group-hover:scale-105" />
        {src && (
          <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
            <span className="text-white/0 group-hover:text-white/90 text-xs font-medium transition-colors duration-200">
              View
            </span>
          </div>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8',
            closing ? 'animate-fade-out' : 'animate-fade-in'
          )}
          style={{ backgroundColor: 'hsla(var(--background) / 0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className={cn(
              'relative flex flex-col items-center gap-4 max-w-md w-full',
              closing ? 'animate-scale-out' : 'animate-scale-in'
            )}
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute -top-2 -right-2 sm:top-0 sm:right-0 z-10 p-2 rounded-full bg-card border border-border shadow-lg hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>

            {/* Image */}
            {src ? (
              <div className="w-full aspect-square max-h-[70vh] rounded-2xl overflow-hidden border border-border shadow-2xl bg-card">
                <img
                  src={src}
                  alt={name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-full aspect-square max-h-[70vh] rounded-2xl overflow-hidden border border-border shadow-2xl bg-card flex items-center justify-center">
                <ClientAvatar name={name} size="lg" className="h-32 w-32 text-4xl" />
              </div>
            )}

            {/* Name */}
            <p className="text-foreground font-semibold text-lg">{name}</p>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {onChangePhoto && (
                <button
                  onClick={() => { close(); setTimeout(onChangePhoto, 250); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Change
                </button>
              )}
              {src && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-foreground text-sm hover:bg-muted/80 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              )}
              {src && onRemovePhoto && (
                <button
                  onClick={() => { close(); setTimeout(onRemovePhoto, 250); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
