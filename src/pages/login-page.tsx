import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { images } from '@/data/images';
import { supabase } from '@/lib/supabase';
import { useBooking } from '@/context/booking-context';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { pendingRedirect } = useBooking();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (pendingRedirect) {
        navigate(pendingRedirect);
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Image side */}
      <div className="relative hidden overflow-hidden bg-foreground lg:block">
        <img
          src={images.propertyImages.overwater1}
          alt="Overwater villa with infinity pool"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-0 left-0 p-10">
          <p className="font-sans text-xs font-medium uppercase tracking-[0.25em] text-white/70">Elvora Stay</p>
          <h2 className="mt-3 font-serif text-4xl font-light leading-tight text-white">
            Welcome back to
            <br />
            extraordinary.
          </h2>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-sm">
          <Link to="/" className="font-serif text-2xl font-medium tracking-[0.15em] text-foreground">
            ELVORA <span className="text-sm tracking-[0.4em] text-muted-foreground">STAY</span>
          </Link>
          <h1 className="mt-8 font-serif text-3xl font-light text-foreground">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Access your bookings, favorites and account.
          </p>

          {error && (
            <div className="mt-4 flex items-start gap-2 border border-error/30 bg-error/5 p-3 text-xs text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-foreground"
                placeholder="Your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 bg-foreground py-3.5 text-xs font-medium uppercase tracking-wider text-background transition-all hover:bg-foreground/85 disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-foreground hover:text-accent">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
