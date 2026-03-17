import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSettings } from '@/hooks/useAppSettings';

export function getSwipeEnabled(): boolean {
  const saved = localStorage.getItem('swipe-navigation-enabled');
  return saved !== null ? saved === 'true' : true;
}

export function setSwipeEnabled(enabled: boolean) {
  localStorage.setItem('swipe-navigation-enabled', String(enabled));
}

const BASE_ROUTES = ['/', '/clients', '/plans', '/products'];

// Global direction state — 1 = forward (left), -1 = backward (right), 0 = no slide
let _navDirection = 0;
export function getNavDirection() { return _navDirection; }
export function setNavDirection(d: number) { _navDirection = d; }

function isInsideScrollable(el: HTMLElement | null): boolean {
  let node = el;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflowX = style.overflowX;
    if (
      (overflowX === 'auto' || overflowX === 'scroll') &&
      node.scrollWidth > node.clientWidth
    ) {
      return true;
    }
    // Also check explicit classes
    if (
      node.classList.contains('overflow-x-auto') ||
      node.classList.contains('overflow-x-scroll') ||
      node.classList.contains('scrollbar-hide')
    ) {
      if (node.scrollWidth > node.clientWidth) return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function useSwipeNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: settings } = useAppSettings();
  const touchRef = useRef<{ startX: number; startY: number; startTime: number; blocked: boolean } | null>(null);
  const enabledRef = useRef(getSwipeEnabled());

  const expenseEnabled = settings?.expense_tracker_enabled?.enabled ?? false;

  const routes = useMemo(() => [
    ...BASE_ROUTES,
    ...(expenseEnabled ? ['/expenses'] : []),
    '/settings',
  ], [expenseEnabled]);

  const routesRef = useRef(routes);
  routesRef.current = routes;
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const sync = () => { enabledRef.current = getSwipeEnabled(); };
    window.addEventListener('swipe-setting-changed', sync);
    return () => window.removeEventListener('swipe-setting-changed', sync);
  }, []);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      const blocked = isInsideScrollable(target);
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        blocked,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchRef.current || !enabledRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchRef.current.startX;
      const deltaY = touch.clientY - touchRef.current.startY;
      const elapsed = Date.now() - touchRef.current.startTime;
      const blocked = touchRef.current.blocked;

      touchRef.current = null;

      // Don't navigate if swipe started inside a horizontally scrollable element
      if (blocked) return;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX < 80 || absDeltaY > absDeltaX * 0.6 || elapsed > 400) return;

      const currentRoutes = routesRef.current;
      const currentPath = pathnameRef.current;
      let currentIndex = currentRoutes.indexOf(currentPath);

      // Only allow swipe navigation on exact base routes, not sub-routes like /clients/:id
      if (currentIndex === -1) return;

      const direction = deltaX > 0 ? -1 : 1;
      const nextIndex = currentIndex + direction;

      if (nextIndex >= 0 && nextIndex < currentRoutes.length) {
        setNavDirection(direction);
        navigateRef.current(currentRoutes[nextIndex]);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Detect direction for non-swipe nav (clicking nav items)
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    const prev = prevPathRef.current;
    const curr = location.pathname;
    prevPathRef.current = curr;
    
    const currentRoutes = routesRef.current;
    const prevIndex = currentRoutes.indexOf(prev);
    const currIndex = currentRoutes.indexOf(curr);
    
    if (prevIndex !== -1 && currIndex !== -1 && prevIndex !== currIndex) {
      if (_navDirection === 0) {
        setNavDirection(currIndex > prevIndex ? 1 : -1);
      }
    }
  }, [location.pathname]);
}
