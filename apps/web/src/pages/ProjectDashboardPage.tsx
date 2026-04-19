import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatCents } from '@burnpilot/utils';
import { ArrowLeft } from 'lucide-react';
import { AlertList } from '@/components/alerts/AlertList';
import { ButtonSecondary } from '@/components/ui/Button';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import type { ProjectSummary } from '@/lib/dashboardRpc';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

export function ProjectDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.session?.user);
  const configured = isSupabaseConfigured();
  const profileQuery = useProfileQuery();

  const summaryQuery = useQuery({
    queryKey: ['project-summary', user?.id, id],
    enabled: configured && Boolean(user?.id) && Boolean(id),
    queryFn: async (): Promise<ProjectSummary | null> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('project_summary', { p_project_id: id! });
      if (error) throw error;
      return data as ProjectSummary;
    },
  });

  async function signOut() {
    if (!configured) return;
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  }

  const currency =
    profileQuery.data?.display_currency && ['EUR', 'USD', 'GBP'].includes(profileQuery.data.display_currency)
      ? profileQuery.data.display_currency
      : 'EUR';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent-green hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <ButtonSecondary type="button" onClick={() => void signOut()}>
          Cerrar sesión
        </ButtonSecondary>
      </div>

      {summaryQuery.isLoading ? (
        <p className="text-sm text-fg-muted">Cargando proyecto…</p>
      ) : summaryQuery.isError ? (
        <p className="text-sm text-accent-amber">
          No se pudo cargar el proyecto. ¿Existe y tienes acceso? ¿Aplicaste la migración Sprint 3 (
          <code className="font-mono">20250421000001_dashboard_rpc.sql</code>)?
        </p>
      ) : summaryQuery.data ? (
        <>
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">{summaryQuery.data.name}</h1>
            {summaryQuery.data.description ? (
              <p className="mt-2 text-sm text-fg-muted">{summaryQuery.data.description}</p>
            ) : null}
          </header>

          <AlertList alerts={summaryQuery.data.alerts} className="mb-8" />

          <section className="mb-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-bg-border bg-bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Burn mensual</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-accent-green">
                {formatCents(summaryQuery.data.monthly_burn_base_cents, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-bg-border bg-bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Burn anual (aprox.)</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-fg-primary">
                {formatCents(summaryQuery.data.yearly_burn_base_cents, currency)}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-bg-border bg-bg-card p-5">
            <h2 className="text-sm font-medium text-fg-muted">Herramientas asignadas</h2>
            {summaryQuery.data.tools.length === 0 ? (
              <p className="mt-3 text-sm text-fg-muted">
                Ninguna asignación.{' '}
                <Link to="/tools" className="text-accent-green hover:underline">
                  Gestionar herramientas
                </Link>
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {summaryQuery.data.tools.map((row) => (
                  <li
                    key={row.tool_id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-bg-border/60 py-2 text-sm last:border-0"
                  >
                    <span className="font-medium text-fg-primary">{row.name}</span>
                    <span className="font-mono text-fg-muted">
                      {formatCents(row.monthly_base_cents, currency)}
                      <span className="ml-2 text-xs text-fg-muted/80">({Number(row.allocation_pct)}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
