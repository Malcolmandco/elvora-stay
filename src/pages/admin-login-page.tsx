import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AuthErrorDetail {
  message: string;
  code?: string;
  hasSession: boolean;
  hasUser: boolean;
  appRole?: string;
}

export function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<AuthErrorDetail | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorDetail(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setErrorDetail({
          message: authError.message,
          code: authError.code || 'unknown',
          hasSession: !!data?.session,
          hasUser: !!data?.user,
        });
        console.error('Admin login auth error:', {
          code: authError.code,
          message: authError.message,
          name: authError.name,
        });
        return;
      }

      if (!data.user) {
        setError('Authentication succeeded but no user was returned.');
        setErrorDetail({
          message: 'No user in response',
          hasSession: !!data.session,
          hasUser: false,
        });
        return;
      }

      const isAdmin = data.user.app_metadata?.role === 'admin';

      if (!isAdmin) {
        await supabase.auth.signOut();
        setError('Administrator access required.');
        setErrorDetail({
          message: 'User is not an admin',
          hasSession: !!data.session,
          hasUser: true,
          appRole: String(data.user.app_metadata?.role ?? 'none'),
        });
        return;
      }

      navigate('/admin', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      setError(message);
      setErrorDetail({
        message,
        hasSession: false,
        hasUser: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-20">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-secondary">
            <ShieldCheck className="h-6 w-6 text-foreground" strokeWidth={1.5} />
          </div>
          <p className="mt-5 font-sans text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Elvora Stay
          </p>
          <h1 className="mt-3 font-serif text-3xl font-light tracking-tight text-foreground">
            Administration
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
            Private Administration Portal
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 border border-error/30 bg-error/5 p-4 text-xs text-error">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span className="font-medium">{error}</span>
            </div>
            {errorDetail && (
              <div className="mt-2 space-y-0.5 border-t border-error/20 pt-2 font-mono text-[0.6875rem] text-error/80">
                {errorDetail.code && <div>Code: {errorDetail.code}</div>}
                <div>Session: {errorDetail.hasSession ? 'yes' : 'no'}</div>
                <div>User: {errorDetail.hasUser ? 'yes' : 'no'}</div>
                {errorDetail.appRole && <div>Role: {errorDetail.appRole}</div>}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border bg-background px-4 py-3.5 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none"
              placeholder="admin@elvora.stay"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border bg-background px-4 py-3.5 text-sm text-foreground transition-colors focus:border-foreground focus:outline-none"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 bg-foreground py-4 text-xs font-medium uppercase tracking-[0.15em] text-background transition-all hover:bg-foreground/85 disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                Sign In
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground/60">
          Authorized personnel only. All access is logged.
        </p>
      </div>
    </div>
  );
}
