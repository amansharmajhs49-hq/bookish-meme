import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, LayoutGrid, AlignJustify, Search, Users, X, ArrowUpDown } from 'lucide-react';
import { useClients, ClientWithMembership } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { ClientCard } from '@/components/ClientCard';
import { ClientListItem } from '@/components/ClientListItem';
import { FilterTabs } from '@/components/FilterTabs';
import { AddClientModal } from '@/components/AddClientModal';
import { MobileNav } from '@/components/MobileNav';
import { ClientsPageSkeleton } from '@/components/DashboardSkeleton';
import { FilterType, ViewMode } from '@/lib/types';
import { PullToRefresh } from '@/components/PullToRefresh';
import { SortOption, sortItems, SORT_OPTIONS } from '@/lib/sorting';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
export default function Clients() {
  const { user, loading: authLoading } = useAuth();
  const { data: clients, isLoading, refetch } = useClients();
  const location = useLocation();
  const navigate = useNavigate();

  const initialFilter = (location.state as { filter?: FilterType })?.filter || 'all';
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (location.state?.filter) setFilter(location.state.filter);
  }, [location.state]);

  const filterCounts = useMemo<Record<FilterType, number>>(() => {
    if (!clients) return { all: 0, paid: 0, due: 0, partial: 0, active: 0, expired: 0, left: 0, deleted: 0, inactive: 0, payment_due: 0, expiring_soon: 0 };
    const activeClients = clients.filter((c) => c.status !== 'Deleted');
    return {
      all: activeClients.length,
      paid: activeClients.filter((c) => c.paymentStatus === 'Paid').length,
      due: activeClients.filter((c) => c.paymentStatus === 'Due').length,
      partial: activeClients.filter((c) => c.paymentStatus === 'Partial').length,
      active: activeClients.filter((c) => c.membershipStatus === 'ACTIVE').length,
      expired: activeClients.filter((c) => c.membershipStatus === 'EXPIRED').length,
      left: activeClients.filter((c) => c.membershipStatus === 'LEFT').length,
      deleted: clients.filter((c) => c.status === 'Deleted').length,
      inactive: activeClients.filter((c) => c.membershipStatus === 'INACTIVE').length,
      payment_due: activeClients.filter((c) => c.membershipStatus === 'PAYMENT_DUE').length,
      expiring_soon: activeClients.filter((c) => c.daysLeft >= 0 && c.daysLeft <= 7 && c.membershipStatus === 'ACTIVE').length,
    };
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    let result: ClientWithMembership[] = clients.filter((c) => c.status !== 'Deleted');
    switch (filter) {
      case 'paid': result = result.filter((c) => c.paymentStatus === 'Paid'); break;
      case 'due': result = result.filter((c) => c.paymentStatus === 'Due'); break;
      case 'partial': result = result.filter((c) => c.paymentStatus === 'Partial'); break;
      case 'active': result = result.filter((c) => c.membershipStatus === 'ACTIVE'); break;
      case 'expired': result = result.filter((c) => c.membershipStatus === 'EXPIRED'); break;
      case 'left': result = result.filter((c) => c.membershipStatus === 'LEFT'); break;
      case 'inactive': result = result.filter((c) => c.membershipStatus === 'INACTIVE'); break;
      case 'payment_due': result = result.filter((c) => c.membershipStatus === 'PAYMENT_DUE'); break;
      case 'expiring_soon': result = result.filter((c) => c.daysLeft >= 0 && c.daysLeft <= 7 && c.membershipStatus === 'ACTIVE'); break;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(query) || c.phone.includes(query));
    }
    result = sortItems(
  result,
  sortBy,
  (c) => c.name,
  (c) => c.created_at,
  (c) => c.latestJoin?.expiry_date ?? c.created_at,
);

return result;
  }, [clients, filter, searchQuery]);

  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  if (authLoading || isLoading) return <ClientsPageSkeleton />;
  if (!user) return null;

  return (
    <PullToRefresh onRefresh={handleRefresh} className="page-container overflow-x-hidden">
      {/* Header */}
      <header className="page-header">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-muted transition-colors shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight">Clients</h1>
            <p className="text-[11px] text-muted-foreground">{filterCounts.all} members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          {/* View & Sort Toggle */}
<div className="flex rounded-lg bg-muted/60 p-0.5">
  <button
    onClick={() => setViewMode('card')}
    className={cn(
      'p-1.5 rounded-md transition-all duration-200',
      viewMode === 'card' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
    )}
  >
    <LayoutGrid className="h-3.5 w-3.5" />
  </button>

  <button
    onClick={() => setViewMode('list')}
    className={cn(
      'p-1.5 rounded-md transition-all duration-200',
      viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
    )}
  >
    <AlignJustify className="h-3.5 w-3.5" />
  </button>

  <div className="w-px h-4 bg-border self-center mx-0.5" />

  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground">
        <ArrowUpDown className="h-3.5 w-3.5" />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" className="rounded-xl min-w-[160px]">
      {SORT_OPTIONS.map((opt) => (
        <DropdownMenuItem
          key={opt.key}
          onClick={() => setSortBy(opt.key)}
          className={cn(
            'text-xs py-2 cursor-pointer gap-2',
            sortBy === opt.key && 'bg-accent font-semibold'
          )}
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
</div>
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                'p-1.5 rounded-md transition-all duration-200',
                viewMode === 'card' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-md transition-all duration-200',
                viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      <div className="px-4 pt-3 pb-24 space-y-3 overflow-x-hidden">
        {/* Search */}
        <div className={cn(
          'relative rounded-2xl border bg-card transition-all duration-200',
          searchFocused ? 'border-primary shadow-sm shadow-primary/10' : 'border-border'
        )}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full bg-transparent pl-10 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <FilterTabs activeFilter={filter} onFilterChange={setFilter} counts={filterCounts} />

        {/* Result info */}
        {(searchQuery || filter !== 'all') && filteredClients.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {filteredClients.length} {filteredClients.length === 1 ? 'result' : 'results'}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setFilter('all'); }}
              className="text-[11px] text-primary font-medium"
            >
              Reset
            </button>
          </div>
        )}

        {/* Client Cards */}
        {viewMode === 'card' ? (
          <div className="space-y-2">
            {filteredClients.map((client, i) => (
              <div
                key={client.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms`, animationFillMode: 'both' }}
              >
                <ClientCard client={client} />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="py-2.5 px-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client</th>
                  <th className="py-2.5 px-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="py-2.5 px-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Plan</th>
                  <th className="py-2.5 px-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Expiry</th>
                  <th className="py-2.5 px-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Paid</th>
                  <th className="py-2.5 px-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <ClientListItem key={client.id} client={client} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {filteredClients.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-5">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {searchQuery ? 'No matches found' : 'No clients yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px] mx-auto leading-relaxed">
              {searchQuery
                ? 'Try a different search term or adjust filters'
                : 'Add your first client to start managing memberships'}
            </p>
            {!searchQuery && filter === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/25"
              >
                <Plus className="h-4 w-4" /> Add Client
              </button>
            )}
          </div>
        )}
      </div>

      <MobileNav />
      <AddClientModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
    </PullToRefresh>
  );
}
