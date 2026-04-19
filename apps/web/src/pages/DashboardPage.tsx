import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { formatCents } from '@burnpilot/utils';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertList } from '@/components/alerts/AlertList';
import { ButtonSecondary } from '@/components/ui/Button';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import type { DashboardSummary } from '@/lib/dashboardRpc';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.session?.user);
  const configured = isSupabaseConfigured();
  const profileQuery = useProfileQuery();

  const dashQuery = useQuery({
    queryKey: ['dashboard-summary', user?.id],
    enabled: configured && Boolean(user?.id),
    queryFn: async (): Promise<DashboardSummary | null> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('dashboard_summary');
      if (error) throw error;
      return data as DashboardSummary;
    },
  });

  const currency =
    profileQuery.data?.display_currency && ['EUR', 'USD', 'GBP'].includes(profileQuery.data.display_currency)
      ? profileQuery.data.display_currency
      : 'EUR';

  async function signOut() {
    if (!configured) return;
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  }

  const dash = dashQuery.data;
  const budget = dash?.monthly_budget_cents;
  const burn = dash?.monthly_burn_base_cents ?? 0;
  const budgetPct =
    budget != null && budget > 0 ? Math.min(100, Math.round((burn / budget) * 100)) : null;

  const pieData =
    dash?.category_breakdown.map((c) => ({
      name: c.name,
      value: c.monthly_base_cents,
      color: c.color,
    })) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Sesión: <span className="text-fg-primary">{user?.email}</span>
          </p>
        </div>
        <ButtonSecondary type="button" onClick={() => void signOut()}>
          Cerrar sesión
        </ButtonSecondary>
      </header>

      {dashQuery.isLoading ? (
        <p className="text-sm text-fg-muted">Cargando métricas…</p>
      ) : dashQuery.isError ? (
        <p className="text-sm text-accent-amber">
          No se pudo cargar el dashboard. Aplica la migración{' '}
          <code className="font-mono text-xs">supabase/migrations/20250421000001_dashboard_rpc.sql</code> en
          Supabase.
        </p>
      ) : dash ? (
        <div className="space-y-8">
          <AlertList alerts={dash.alerts} />

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-bg-border bg-bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Burn mensual</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-accent-green">
                {formatCents(dash.monthly_burn_base_cents, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-bg-border bg-bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Burn anual (aprox.)</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-fg-primary">
                {formatCents(dash.yearly_burn_base_cents, currency)}
              </p>
            </div>
            <div className="rounded-xl border border-bg-border bg-bg-card p-5 sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Presupuesto mensual</p>
              {budget != null && budget > 0 ? (
                <>
                  <p className="mt-2 font-mono text-lg tabular-nums text-fg-primary">
                    {formatCents(budget, currency)}
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-base">
                    <div
                      className="h-full rounded-full bg-accent-green transition-all"
                      style={{ width: `${budgetPct ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-fg-muted">
                    {budgetPct != null ? `${budgetPct}% del presupuesto usado` : '—'}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-fg-muted">
                  Sin tope —{' '}
                  <Link to="/settings/account" className="text-accent-green hover:underline">
                    definir en cuenta
                  </Link>
                </p>
              )}
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="rounded-xl border border-bg-border bg-bg-card p-5">
              <h2 className="text-sm font-medium text-fg-muted">Por categoría</h2>
              {pieData.length === 0 ? (
                <p className="mt-4 text-sm text-fg-muted">
                  Sin herramientas aún.{' '}
                  <Link to="/tools" className="text-accent-green hover:underline">
                    Añadir herramientas
                  </Link>
                </p>
              ) : (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#4ADE80'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCents(value, currency)}
                        contentStyle={{
                          background: '#16181F',
                          border: '1px solid #222631',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#E7EAF0' }}
                        itemStyle={{ color: '#E7EAF0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-bg-border bg-bg-card p-5">
              <h2 className="text-sm font-medium text-fg-muted">Top 5 por coste mensual</h2>
              {dash.top_tools.length === 0 ? (
                <p className="mt-4 text-sm text-fg-muted">—</p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {dash.top_tools.map((t, i) => (
                    <li key={t.tool_id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-fg-muted">{i + 1}.</span>
                      <span className="flex-1 font-medium text-fg-primary">{t.name}</span>
                      <span className="font-mono text-fg-muted">
                        {formatCents(t.monthly_base_cents, currency)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <section className="rounded-xl border border-bg-border bg-bg-card p-5">
            <h2 className="text-sm font-medium text-fg-muted">Proyectos (burn efectivo)</h2>
            {dash.project_kpis.length === 0 ? (
              <p className="mt-3 text-sm text-fg-muted">Crea proyectos en la barra lateral.</p>
            ) : (
              <ul className="mt-4 divide-y divide-bg-border">
                {dash.project_kpis.map((p) => (
                  <li key={p.project_id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                    <Link
                      to={`/projects/${p.project_id}`}
                      className="font-medium text-accent-green hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="font-mono text-sm text-fg-muted">
                      {formatCents(p.monthly_base_cents, currency)} / mes
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-bg-border bg-bg-card p-5">
            <h2 className="text-sm font-medium text-fg-muted">Renovaciones próximos 7 días</h2>
            {dash.renewals_next_7d.length === 0 ? (
              <p className="mt-3 text-sm text-fg-muted">Ninguna en esta ventana.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm">
                {dash.renewals_next_7d.map((r) => (
                  <li key={r.tool_id} className="flex justify-between gap-2">
                    <span className="text-fg-primary">{r.name}</span>
                    <span className="font-mono text-fg-muted">{r.next_renewal_date}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-xs text-fg-muted">
            Histórico 6m en gráfico: fase posterior (stub SQL{' '}
            <code className="font-mono">dashboard_history</code>).
          </p>
        </div>
      ) : null}
    </div>
  );
}
