import { useEffect, type ReactNode } from 'react';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

export function AuthProvider({ children }: { children: ReactNode }) {
  const setAuth = useSessionStore((s) => s.setAuth);
  const markInitialized = useSessionStore((s) => s.markInitialized);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      markInitialized();
      return;
    }

    const supabase = getSupabaseClient();

    void supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session);
    });

    return () => subscription.unsubscribe();
  }, [setAuth, markInitialized]);

  return children;
}
