import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

export function OnboardingPage() {
  const user = useSessionStore((s) => s.session?.user);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const configured = isSupabaseConfigured();
  const profileQuery = useProfileQuery();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

  const completeMutation = useMutation({
    mutationFn: async () => {
      const supabase = getSupabaseClient();
      const uid = user?.id;
      if (!uid) throw new Error('Sin sesión');
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', uid);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary', user?.id] });
      navigate(from, { replace: true });
    },
  });

  if (configured && user?.id && profileQuery.isSuccess && profileQuery.data?.onboarding_completed_at) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!configured) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="text-sm text-accent-amber">Configura Supabase en .env.local</p>
      </main>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-fg-muted">
        Cargando…
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-4 py-12">
      <div className="flex items-center gap-3">
        <Flame className="h-10 w-10 text-accent-green" strokeWidth={2} />
        <h1 className="text-2xl font-bold tracking-tight">Bienvenido a BurnPilot</h1>
      </div>
      <p className="text-fg-muted">
        En unos minutos podrás registrar tus suscripciones, asignarlas a proyectos y ver tu burn mensual con
        alertas útiles.
      </p>
      <ul className="list-inside list-disc space-y-2 text-sm text-fg-muted">
        <li>Añade herramientas en la sección Herramientas.</li>
        <li>Crea proyectos y reparte el coste con porcentajes.</li>
        <li>Usa el plan de ahorro para priorizar recortes.</li>
      </ul>
      {completeMutation.isError ? (
        <p className="text-sm text-accent-red" role="alert">
          No se pudo guardar. Inténtalo de nuevo.
        </p>
      ) : null}
      <Button type="button" disabled={completeMutation.isPending} onClick={() => completeMutation.mutate()}>
        {completeMutation.isPending ? 'Guardando…' : 'Empezar'}
      </Button>
    </main>
  );
}
