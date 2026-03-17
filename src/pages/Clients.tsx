import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, LayoutGrid, AlignJustify, Search, Users, X, ArrowUpDown } from 'lucide-react';
import { useClients, ClientWithMembership } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { ClientCard } from '@/components/ClientCard';
import { ClientListItem } from '@/components/ClientListItem';
import { FilterTabs } from '@/components/FilterTabs';
import { AddClientModal } from '@/components/AddClientModal';
import { AddPaymentModal } from '@/components/AddPaymentModal';
import { RenewSubscriptionModal } from '@/components/RenewSubscriptionModal';
import { MobileNav } from '@/components/MobileNav';
import { ClientsPageSkeleton } from '@/components/DashboardSkeleton';
import { FilterType, ViewMode } from '@/lib/types';
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
  const [quickPayClient, setQuickPayClient] = useState<ClientWithMembership | null>(null);
  const [quickRenewClient, setQuickRenewClient] = useState<ClientWithMembership | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleHeaderScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleHeaderScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleHeaderScroll);
  }, []);
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (location.state?.filter) setFilter(location.state.filter);
  }, [location.state]);

  // Scroll restoration — double rAF ensures DOM is painted before scrolling
  useEffect(() => {
    if (!isLoading && clients) {
      const savedScroll = sessionStorage.getItem('clientsListScrollPos');
      if (savedScroll) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo(0, parseInt(savedScroll, 10));
          });
        });
      }
    }

    const handleScroll = () => {
      sessionStorage.setItem('clientsListScrollPos', window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, clients]);

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
      result = result.filter((c) => 
        c.name.toLowerCase().includes(query) || 
        c.phone.includes(query) ||
        (c.alias_name && c.alias_name.toLowerCase().includes(query))
      );
    }
    result = sortItems(
  result,
  sortBy,
    (c) => c.name,
    (c) => c.created_at,
    (c) => c.latestJoin?.expiry_date || '',
  );

return result;
  }, [clients, filter, searchQuery, sortBy]);


  if (authLoading || isLoading) return <ClientsPageSkeleton />;
  if (!user) return null;

  return (
    <div className="page-container min-h-screen">
      <div className={cn(
        "sticky top-0 z-40 transition-all duration-300 ease-in-out",
        isScrolled 
          ? "bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-md shadow-black/5" 
          : "bg-background/0 backdrop-blur-none border-b border-transparent"
      )}>
        {/* Glass highlight line */}
        <div className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent transition-opacity duration-500",
          isScrolled ? "opacity-100" : "opacity-0"
        )} />
        
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-muted transition-colors shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight">Clients</h1>
              <p className="text-[11px] text-muted-foreground">{filterCounts.all} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-lg bg-muted/60 p-0.5 sm:p-1 gap-1">
              <div className="flex rounded-md bg-background/50 p-0.5 shadow-sm shrink-0">
                <button
                  onClick={() => setViewMode('card')}
                  className={cn(
                    'p-1.5 sm:p-2 rounded-md transition-all duration-200',
                    viewMode === 'card' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-1.5 sm:p-2 rounded-md transition-all duration-200',
                    viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <AlignJustify className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="w-px h-4 bg-border self-center mx-0 opacity-30" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/50 transition-all duration-200 active:scale-95">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold hidden md:inline uppercase tracking-wider">Sort</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl min-w-[170px] p-1 shadow-xl border-primary/10">
                  <div className="px-2 py-1.5 mb-1 border-b border-border/50">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sort Items By</p>
                  </div>
                  {SORT_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.key}
                      onClick={() => setSortBy(opt.key)}
                      className={cn(
                        'text-xs py-2.5 px-3 cursor-pointer gap-3 rounded-lg transition-colors',
                        sortBy === opt.key ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted font-medium'
                      )}
                    >
                      <span className="text-sm">{opt.icon}</span>
                      <span>{opt.label}</span>
                      {sortBy === opt.key && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Improved Search & Tabs Section */}
        <div className="px-4 pb-2 space-y-3">
          <div className={cn(
            'relative group rounded-2xl border transition-all duration-300',
            searchFocused ? 'border-primary shadow-lg shadow-primary/10 bg-card' : 'border-border bg-card/50'
          )}>
            <Search className={cn(
              "absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-300",
              searchFocused ? "text-primary" : "text-muted-foreground"
            )} />
            <input
              type="text"
              placeholder="Search name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full bg-transparent pl-10 pr-9 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          
          <div className="relative -mx-4 px-4 overflow-hidden">
             <FilterTabs activeFilter={filter} onFilterChange={setFilter} counts={filterCounts} />
          </div>
        </div>
      </div>

      <div className="px-4 pt-2 pb-6 space-y-2.5">

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
                <ClientCard
                  client={client}
                  onAddPayment={setQuickPayClient}
                  onRenew={setQuickRenewClient}
                  searchQuery={searchQuery}
                />
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

      {/* close sticky header wrapper */}
      </div>

      <motion.button
        className="fixed bottom-24 right-5 p-4 rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/40 z-40"
        onClick={() => setShowAddModal(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
        whileTap={{ scale: 0.9 }}
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      <MobileNav />
      <AddClientModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

      {quickPayClient && (
        <AddPaymentModal
          isOpen={true}
          onClose={() => setQuickPayClient(null)}
          clientId={quickPayClient.id}
          clientName={quickPayClient.name}
          membershipDues={quickPayClient.dueAmount}
          productDues={quickPayClient.productDues}
          latestJoinId={quickPayClient.latestJoin?.id}
        />
      )}
      {quickRenewClient && (
        <RenewSubscriptionModal
          isOpen={true}
          onClose={() => setQuickRenewClient(null)}
          clientId={quickRenewClient.id}
          clientName={quickRenewClient.name}
          clientPhone={quickRenewClient.phone}
          currentJoin={quickRenewClient.latestJoin}
        />
      )}
    </div>
  );
}
