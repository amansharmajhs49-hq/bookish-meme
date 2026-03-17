// ─────────────────────────────────────────────────────────
// Reusable SortSelect Component
// ─────────────────────────────────────────────────────────
// COPY-PASTE GUIDE:
//   1. Copy src/lib/sorting.ts + this file
//   2. Needs: shadcn/ui Select, lucide-react, tailwind
//   3. Usage:
//        import { SortSelect } from '@/components/SortSelect';
//        <SortSelect value={sortBy} onChange={setSortBy} />
//   4. To limit options:
//        <SortSelect options={['newest','oldest','a-z','z-a']} ... />
// ─────────────────────────────────────────────────────────

import { ArrowUpDown } from 'lucide-react';
import { SortOption, SortConfig, SORT_OPTIONS, filterSortOptions } from '@/lib/sorting';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  /** Limit which sort options to show. Defaults to all. */
  options?: SortOption[];
  className?: string;
}

export function SortSelect({ value, onChange, options, className }: SortSelectProps) {
  const sortOptions: SortConfig[] = options ? filterSortOptions(options) : SORT_OPTIONS;

  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
      <SelectTrigger
        className={cn(
          'h-8 w-auto min-w-[44px] max-w-[150px] rounded-xl border-border bg-card px-2.5 text-[11px] font-semibold gap-1 shadow-sm transition-all duration-200 hover:border-primary/30 focus:ring-1 focus:ring-primary/20',
          className,
        )}
      >
        <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl min-w-[160px]" align="end">
        {sortOptions.map((opt) => (
          <SelectItem key={opt.key} value={opt.key} className="text-xs py-2 cursor-pointer">
            <span className="flex items-center gap-2">
              <span className="text-sm leading-none">{opt.icon}</span>
              <span>{opt.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
