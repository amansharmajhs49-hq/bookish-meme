import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Mail, Lock, Eye, EyeOff, BookOpen, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getRandomVerse } from '@/lib/bible-verses';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupEnabled, setSignupEnabled] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const { signIn, signUp, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const verse = useMemo(() => getRandomVerse(), []);

  // Check if current user is pending approval
  useEffect(() => {
    if (!user) {
      setPendingApproval(false);
      return;
    }
    
    const checkApproval = async () => {
      // Check if user has any role (approved users have roles)
      const { data: roles } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (roles && roles.length > 0) {
        // User is approved, go to dashboard
        navigate('/');
        return;
      }

      // Check if there's a pending signup record
      const { data: pending } = await supabase
        .from('pending_signups')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (pending && pending.length > 0) {
        if (pending[0].status === 'approved') {
          navigate('/');
          return;
        }
        if (pending[0].status === 'rejected') {
          toast({ title: 'Your signup was rejected by the admin', variant: 'destructive' });
          await signOut();
          return;
        }
        // pending status
        setPendingApproval(true);
      } else {
        // First-time user with no pending record and no role — create pending signup
        // But first check if this is the very first user (super admin)
        const { data: isSa } = await supabase.rpc('is_super_admin', { _user_id: user.id });
        if (isSa) {
          navigate('/');
          return;
        }
        
        // Create pending signup
        await supabase.from('pending_signups').insert({
          user_id: user.id,
          email: user.email || '',
        } as any);
        setPendingApproval(true);
      }
    };

    checkApproval();
  }, [user]);

  useEffect(() => {
    supabase.rpc('is_signup_enabled').then(({ data }) => {
      setSignupEnabled(data === true);
    });
  }, []);

  useEffect(() => {
    if (!signupEnabled && !isLogin) setIsLogin(true);
  }, [signupEnabled, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        let message = error.message;
        if (message.includes('Invalid login credentials')) {
          message = 'Invalid email or password';
        } else if (message.includes('User already registered')) {
          message = 'An account with this email already exists';
        }
        toast({ title: message, variant: 'destructive' });
      } else if (!isLogin) {
        toast({ title: 'Account created! Waiting for admin approval.' });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({ title: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePendingLogout = async () => {
    await signOut();
    setPendingApproval(false);
  };

  // Pending approval screen
  if (pendingApproval && user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 mb-2">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Pending Approval</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your account <span className="font-medium text-foreground">{user.email}</span> is awaiting approval from a Super Admin. You'll be able to access the dashboard once approved.
          </p>
          <button
            onClick={handlePendingLogout}
            className="text-sm text-primary hover:underline font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Dumbbell className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Aesthetic Gym</h1>
          <p className="text-muted-foreground">
            {isLogin ? 'Welcome back, owner!' : 'Create your account'}
          </p>
        </div>

        {/* Bible Verse */}
        <div className="relative rounded-xl border border-border bg-card/60 px-5 py-4 text-center space-y-1.5">
          <BookOpen className="h-4 w-4 text-primary mx-auto mb-1 opacity-70" />
          <p className="text-sm italic text-muted-foreground leading-relaxed">
            "{verse.text}"
          </p>
          <p className="text-xs font-medium text-primary/80">— {verse.ref}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="input-dark w-full pl-12"
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="input-dark w-full pl-12 pr-12"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3"
          >
            {isLoading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle */}
        {signupEnabled && (
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 text-primary hover:underline font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
