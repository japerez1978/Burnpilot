import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Redirige a /onboarding si el perfil no tiene onboarding_completed_at.
 * Debe envolver rutas detrás de RequireAuth; la ruta /onboarding va fuera de este wrapper.
 */
export function RequireOnboardingComplete({ children }: { children?: ReactNode }) {
  const user = useSessionStore((s) => s.session?.user);
  const location = useLocation();
  const configured = isSupabaseConfigured();
  const q = useProfileQuery();

  if (!configured || !user?.id) {
    return children ? <>{children}</> : <Outlet />;
  }

  if (q.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base text-fg-muted">
        Cargando perfil…
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center text-sm text-accent-amber">
        No se pudo cargar el perfil. Revisa la sesión o la migración de perfiles.
      </div>
    );
  }

  if (!q.data?.onboarding_completed_at) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
