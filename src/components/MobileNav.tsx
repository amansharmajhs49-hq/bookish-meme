import { Home, Users, CreditCard, Package, Settings, Receipt } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppSettings } from '@/hooks/useAppSettings';
import { setNavDirection } from '@/hooks/useSwipeNavigation';
import { useClients } from '@/hooks/useClients';

const baseNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { icon: CreditCard, label: 'Plans', path: '/plans' },
  { icon: Package, label: 'Products', path: '/products' },
];

const BASE_ROUTES = ['/', '/clients', '/plans', '/products'];
export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: settings } = useAppSettings();
  const { data: clients } = useClients();

  const expenseEnabled = settings?.expense_tracker_enabled?.enabled ?? false;

  // Alert badge: due + expiring today/soon
  const alertCount = clients
    ? clients.filter(c =>
        c.status !== 'Deleted' &&
        (c.membershipStatus === 'PAYMENT_DUE' ||
          (c.membershipStatus === 'ACTIVE' && c.daysLeft >= 0 && c.daysLeft <= 3))
      ).length
    : 0;

  const navItems = [
    ...baseNavItems,
    ...(expenseEnabled ? [{ icon: Receipt, label: 'Expenses', path: '/expenses' }] : []),
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const routes = [
    ...BASE_ROUTES,
    ...(expenseEnabled ? ['/expenses'] : []),
    '/settings',
  ];

  const handleNav = (path: string) => {
    const currentIdx = routes.indexOf(location.pathname);
    const nextIdx = routes.indexOf(path);
    if (currentIdx !== -1 && nextIdx !== -1 && currentIdx !== nextIdx) {
      setNavDirection(nextIdx > currentIdx ? 1 : -1);
    }
    navigate(path);
  };

  return (
    <nav className="mobile-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const showBadge = item.path === '/clients' && alertCount > 0 && !isActive;
        return (
          <motion.button
            key={item.path}
            onClick={() => handleNav(item.path)}
            className={cn('nav-item relative flex-1', isActive && 'active')}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            {isActive && (
              <motion.div
                layoutId="nav-active-glow"
                className="absolute inset-0 rounded-xl bg-primary/12"
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              />
            )}
            <div className="relative">
              <item.icon className={cn("h-5 w-5 relative z-10", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]")} />
              {showBadge && (
                <span className="absolute -top-1 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center z-20 tabular-nums">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </div>
            <span className={cn(
              "text-[10px] transition-all relative z-10",
              isActive ? "font-semibold" : "font-normal"
            )}>
              {item.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
