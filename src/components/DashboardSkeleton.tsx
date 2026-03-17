import { useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getRandomVerse } from '@/lib/bible-verses';

function VerseCard() {
  const verse = useMemo(() => getRandomVerse(), []);
  return (
    <div className="mx-4 mt-4 rounded-xl border border-border bg-card px-5 py-4 text-center space-y-1.5 animate-fade-in">
      <BookOpen className="h-4 w-4 text-primary mx-auto mb-1 opacity-70" />
      <p className="text-sm italic text-muted-foreground leading-relaxed">"{verse.text}"</p>
      <p className="text-xs font-medium text-primary/80">— {verse.ref}</p>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page-container">
      {/* Header Skeleton */}
      <header className="page-header">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-16 mt-1" />
          </div>
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </header>
      <VerseCard />

      <div className="p-4 space-y-6">
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>

        {/* Revenue Stats Skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>

        {/* Search Skeleton */}
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
        </div>

        {/* Filter Tabs Skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
          ))}
        </div>

        {/* Client Cards Skeleton */}
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <ClientCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClientCardSkeleton() {
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-5 w-16 rounded-full ml-auto" />
          <Skeleton className="h-3 w-12 ml-auto" />
        </div>
      </div>
    </div>
  );
}

export function ClientDetailSkeleton() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </header>
      <VerseCard />

      <div className="p-4 space-y-6">
        {/* Profile Section */}
        <div className="flex flex-col items-center text-center">
          <Skeleton className="h-24 w-24 rounded-full mb-4" />
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-28 mb-3" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="stat-card text-center">
              <Skeleton className="h-3 w-12 mx-auto mb-2" />
              <Skeleton className="h-6 w-16 mx-auto" />
            </div>
          ))}
        </div>

        {/* Current Subscription */}
        <div className="stat-card space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>

        {/* Payment History */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-36" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="stat-card">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClientsPageSkeleton() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </header>
      <VerseCard />

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-20 rounded-lg" />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
          ))}
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <ClientCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function BinSkeleton() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-4 w-16" />
      </header>
      <VerseCard />

      <div className="p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlansPageSkeleton() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-20 mt-1" />
          </div>
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </header>
      <VerseCard />

      <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-28" />
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductsPageSkeleton() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-28 mt-1" />
          </div>
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </header>
      <VerseCard />

      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3.5">
              <Skeleton className="h-8 w-8 rounded-lg mb-3" />
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-3 w-14 mb-2" />
              <Skeleton className="h-6 w-16 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
