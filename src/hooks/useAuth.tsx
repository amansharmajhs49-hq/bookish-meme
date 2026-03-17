import { useEffect, useState, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: 'moderator' | 'super_admin' | 'admin' | 'user' | null;
  subscription: {
    status: 'active' | 'expired' | 'pending' | 'locked';
    expiry_date: string;
  } | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'moderator' | 'super_admin' | 'admin' | 'user' | null>(null);
  const [subscription, setSubscription] = useState<AuthContextType['subscription']>(null);

  const fetchUserRole = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', uid)
        .single();
      
      if (error) throw error;
      setRole((data as any)?.role || 'user');
    } catch (err) {
      console.error('Error fetching user role:', err);
      setRole('user');
    }
  };

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('hosting_subscriptions')
        .select('status, expiry_date')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data) {
        // Fallback to active to avoid locking out during errors
        setSubscription({ status: 'active', expiry_date: new Date(Date.now() + 86400000).toISOString() });
        return;
      }
      setSubscription({
        status: (data as any).status as any,
        expiry_date: (data as any).expiry_date,
      });
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setSubscription({ status: 'active', expiry_date: new Date(Date.now() + 86400000).toISOString() });
    }
  };

  useEffect(() => {
    const handleInit = async (currentSession: Session | null) => {
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await Promise.all([
          fetchUserRole(currentUser.id),
          fetchSubscription()
        ]);
      } else {
        setRole(null);
        setSubscription(null);
      }
      setLoading(false);
    };

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        handleInit(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleInit(session);
    });

    return () => authSub.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, subscription, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
