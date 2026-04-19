import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, initialized } = useSessionStore();
  const location = useLocation();

  if (!isSupabaseConfigured()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-fg-muted">
        Cargando sesión…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
