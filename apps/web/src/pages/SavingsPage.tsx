import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatCents } from '@burnpilot/utils';
import type { SavingsPlan } from '@/lib/dashboardRpc';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';
import { useProfileQuery } from '@/hooks/useProfileQuery';

export function SavingsPage() {
  const user = useSessionStore((s) => s.session?.user);
  const configured = isSupabaseConfigured();
  const profileQuery = useProfileQuery();

  const planQuery = useQuery({
    queryKey: ['savings-plan', user?.id],
    enabled: configured && Boolean(user?.id),
    queryFn: async (): Promise<SavingsPlan | null> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('savings_plan');
      if (error) throw error;
      return data as SavingsPlan;
    },
  });

  const currency =
    profileQuery.data?.display_currency && ['EUR', 'USD', 'GBP'].includes(profileQuery.data.display_currency)
      ? profileQuery.data.display_currency
      : 'EUR';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Plan de ahorro</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Candidatos basados en estado (dudoso / para cancelar) o utilidad percibida baja (≤2). Importes en tu
          moneda de visualización.
        </p>
      </header>

      {planQuery.isLoading ? (
        <p className="text-sm text-fg-muted">Cargando…</p>
      ) : planQuery.isError ? (
        <p className="text-sm text-accent-amber">
          No se pudo cargar el plan. Aplica la migración{' '}
          <code className="font-mono text-xs">20250422000001_sprint4_alerts_savings.sql</code> en Supabase.
        </p>
      ) : planQuery.data ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-bg-border bg-bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Ahorro potencial mensual</p>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-accent-green">
              {formatCents(planQuery.data.potential_monthly_savings_cents, currency)}
            </p>
            <p className="mt-2 text-xs text-fg-muted">Suma del coste mensual estimado de los candidatos listados.</p>
          </section>

          <section className="rounded-xl border border-bg-border bg-bg-card p-5">
            <h2 className="text-sm font-medium text-fg-muted">Candidatos</h2>
            {planQuery.data.candidates.length === 0 ? (
              <p className="mt-4 text-sm text-fg-muted">
                Ninguno por ahora. Marca herramientas con baja utilidad o estado dudoso en{' '}
                <Link to="/tools" className="text-accent-green hover:underline">
                  Herramientas
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-bg-border">
                {planQuery.data.candidates.map((c) => (
                  <li key={c.tool_id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0">
                    <div>
                      <p className="font-medium text-fg-primary">{c.name}</p>
                      <p className="mt-1 text-xs text-fg-muted">{c.reason}</p>
                    </div>
                    <span className="font-mono text-sm text-fg-muted">
                      {formatCents(c.monthly_base_cents, currency)} / mes
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
