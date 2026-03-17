import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Dashboard from './Dashboard';

export default function Index() {
  const { user, loading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/website');
      return;
    }

    // Role-based redirect
    if (role === 'moderator') {
      navigate('/moderator');
      return;
    }
    // 'user' role = member → portal
    if (role === 'user') {
      navigate('/portal');
      return;
    }
    // admin / super_admin stay on dashboard (default)
  }, [user, loading, role, navigate]);

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  // Only admin/super_admin see the dashboard
  if (role === 'moderator' || role === 'user') {
    return null;
  }

  return <Dashboard />;
}
