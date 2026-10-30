import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AdminAuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    session: null,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        const user = session?.user ?? null;
        const isAdmin = user?.app_metadata?.role === 'admin';

        setState({ user, session, isAdmin, loading: false });
      } catch {
        if (mounted) {
          setState({ user: null, session: null, isAdmin: false, loading: false });
        }
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const user = session?.user ?? null;
      const isAdmin = user?.app_metadata?.role === 'admin';
      setState({ user, session, isAdmin, loading: false });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function useAdminSignOut() {
  return useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  }, []);
}
