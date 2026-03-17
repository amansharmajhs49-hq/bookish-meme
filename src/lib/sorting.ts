// ─────────────────────────────────────────────────────────
// Reusable Sorting Utilities
// ─────────────────────────────────────────────────────────
// COPY-PASTE GUIDE — to reuse in another project:
//   1. Copy this file → src/lib/sorting.ts
//   2. Copy src/components/SortSelect.tsx
//   3. Make sure you have shadcn/ui <Select> + lucide-react installed
//   4. Done! Import and use anywhere.
// ─────────────────────────────────────────────────────────

export type SortOption = 'newest' | 'oldest' | 'a-z' | 'z-a' | 'expiry-asc' | 'expiry-desc';

export interface SortConfig {
  key: SortOption;
  label: string;
  icon: string;
}

export const SORT_OPTIONS: SortConfig[] = [
  { key: 'newest', label: 'Newest First', icon: '🕐' },
  { key: 'oldest', label: 'Oldest First', icon: '🕰️' },
  { key: 'a-z', label: 'A → Z', icon: '🔤' },
  { key: 'z-a', label: 'Z → A', icon: '🔤' },
  { key: 'expiry-asc', label: 'Expiry (Soonest)', icon: '📅' },
  { key: 'expiry-desc', label: 'Expiry (Latest)', icon: '📅' },
];

/** Build a subset of sort options (e.g. exclude expiry for non-membership lists) */
export function filterSortOptions(keys: SortOption[]): SortConfig[] {
  return SORT_OPTIONS.filter((o) => keys.includes(o.key));
}

/**
 * Generic sort function.
 * @param items       Array of items to sort
 * @param sortBy      The sort option to apply
 * @param getName     Extract name/label string from an item
 * @param getDate     Extract created date string from an item
 * @param getExpiry   (optional) Extract expiry date string from an item
 * @returns A new sorted array (does not mutate the original)
 */
export function sortItems<T>(
  items: T[],
  sortBy: SortOption,
  getName: (item: T) => string,
  getDate: (item: T) => string,
  getExpiry?: (item: T) => string,
): T[] {
  const sorted = [...items];
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime());
    case 'a-z':
      return sorted.sort((a, b) => getName(a).localeCompare(getName(b)));
    case 'z-a':
      return sorted.sort((a, b) => getName(b).localeCompare(getName(a)));
    case 'expiry-asc':
      if (!getExpiry) return sorted;
      return sorted.sort((a, b) => {
        const dateA = getExpiry(a);
        const dateB = getExpiry(b);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        const now = Date.now();
        const diffA = new Date(dateA).getTime() - now;
        const diffB = new Date(dateB).getTime() - now;
        // Active (future) memberships first, sorted by soonest expiry
        // Expired (past) memberships after, sorted by most recently expired
        const aExpired = diffA < 0;
        const bExpired = diffB < 0;
        if (aExpired && !bExpired) return 1;
        if (!aExpired && bExpired) return -1;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });
    case 'expiry-desc':
      if (!getExpiry) return sorted;
      return sorted.sort((a, b) => {
        const dateA = getExpiry(a);
        const dateB = getExpiry(b);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    default:
      return sorted;
  }
}
