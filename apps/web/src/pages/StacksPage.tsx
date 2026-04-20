import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCents } from '@burnpilot/utils';
import { Check, Layers, Link2, X } from 'lucide-react';
import { ButtonSecondary } from '@/components/ui/Button';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { useRecommendedStacksQuery } from '@/hooks/useRecommendedStacksQuery';
import type { StackComparisonResult } from '@/lib/dashboardRpc';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

type ProjectRow = { id: string; name: string };

export function StacksPage() {
  const user = useSessionStore((s) => s.session?.user);
  const configured = isSupabaseConfigured();
  const profileQuery = useProfileQuery();
  const stacksQuery = useRecommendedStacksQuery();
  const [projectId, setProjectId] = useState<string>('');
  const [comparisonByStack, setComparisonByStack] = useState<Record<string, StackComparisonResult | null>>({});

  const projectsQuery = useQuery({
    queryKey: ['projects', user?.id, 'stacks'],
    enabled: configured && Boolean(user?.id),
    queryFn: async (): Promise<ProjectRow[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectRow[];
    },
  });

  const compareMutation = useMutation({
    mutationFn: async ({ stackId, projId }: { stackId: string; projId: string }) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('stack_comparison', {
        p_stack_id: stackId,
        p_project_id: projId,
      });
      if (error) throw error;
      return data as StackComparisonResult;
    },
    onSuccess: (data, variables) => {
      setComparisonByStack((prev) => ({ ...prev, [variables.stackId]: data as StackComparisonResult }));
    },
  });

  const currency =
    profileQuery.data?.display_currency && ['EUR', 'USD', 'GBP'].includes(profileQuery.data.display_currency)
      ? profileQuery.data.display_currency
      : 'EUR';

  function badgeDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-2">
          <Layers className="h-8 w-8 text-accent-green" strokeWidth={2} />
          <h1 className="text-2xl font-semibold tracking-tight">Stacks recomendados</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
          Biblioteca curada de combinaciones típicas de herramientas. Elige un proyecto, compara y, si falta una
          pieza, usa <strong className="font-medium text-fg-primary">Añadir sugerida</strong> para abrir el alta
          en Herramientas con el nombre y el proyecto ya indicados.
        </p>
      </header>

      <div className="mb-8 rounded-xl border border-bg-border bg-bg-card p-4">
        <label htmlFor="stack-project" className="text-sm font-medium text-fg-primary">
          Proyecto para comparar
        </label>
        <select
          id="stack-project"
          className="mt-2 w-full max-w-md rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setComparisonByStack({});
          }}
        >
          <option value="">— Selecciona un proyecto —</option>
          {(projectsQuery.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {projectsQuery.data?.length === 0 ? (
          <p className="mt-2 text-sm text-fg-muted">
            Crea un proyecto desde la barra lateral para poder comparar.
          </p>
        ) : null}
      </div>

      {stacksQuery.isLoading ? (
        <p className="text-sm text-fg-muted">Cargando biblioteca…</p>
      ) : stacksQuery.isError ? (
        <p className="text-sm text-accent-amber">
          No se pudo cargar los stacks. Aplica la migración{' '}
          <code className="font-mono text-xs">20250430000001_recommended_stacks.sql</code> en Supabase.
        </p>
      ) : (
        <ul className="space-y-6">
          {(stacksQuery.data ?? []).map((stack) => {
            const cmp = comparisonByStack[stack.id];
            return (
              <li
                key={stack.id}
                className="rounded-xl border border-bg-border bg-bg-card p-5 shadow-sm shadow-black/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-fg-primary">{stack.name}</h2>
                    {stack.description ? (
                      <p className="mt-1 text-sm text-fg-muted">{stack.description}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-fg-muted">
                      Coste orientativo ~{formatCents(stack.monthly_estimate_cents, currency)}/mes
                      {stack.last_reviewed_at ? (
                        <span className="ml-2 rounded-md bg-bg-base px-2 py-0.5">
                          Actualizado {badgeDate(stack.last_reviewed_at)}
                        </span>
                      ) : null}
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {(stack.recommended_stack_items ?? []).map((it) => (
                        <li
                          key={`${stack.id}-${it.label}-${it.sort_order}`}
                          className="rounded-full border border-bg-border bg-bg-base px-2.5 py-0.5 text-xs text-fg-muted"
                        >
                          {it.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <ButtonSecondary
                    type="button"
                    disabled={!projectId || compareMutation.isPending}
                    onClick={() => {
                      if (!projectId) return;
                      compareMutation.mutate({ stackId: stack.id, projId: projectId });
                    }}
                  >
                    {compareMutation.isPending ? 'Comparando…' : 'Comparar con proyecto'}
                  </ButtonSecondary>
                </div>

                {cmp ? (
                  <div className="mt-5 border-t border-bg-border pt-4">
                    <p className="text-sm text-fg-muted">
                      Burn mensual del proyecto (asignado):{' '}
                      <span className="font-mono text-fg-primary">
                        {formatCents(
                          typeof cmp.project_monthly_cents === 'number' ? cmp.project_monthly_cents : 0,
                          currency,
                        )}
                      </span>
                    </p>
                    <table className="mt-3 w-full min-w-[320px] text-sm">
                      <thead>
                        <tr className="border-b border-bg-border text-left text-xs font-medium uppercase tracking-wide text-fg-muted">
                          <th className="pb-2">Stack</th>
                          <th className="pb-2">Tu herramienta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bg-border/60">
                        {(Array.isArray(cmp.rows) ? cmp.rows : []).map((row, idx) => (
                          <tr key={`${stack.id}-row-${idx}`}>
                            <td className="py-2 pr-2 text-fg-primary">{row.item_label}</td>
                            <td className="py-2">
                              {row.matched && row.matched_tool_name ? (
                                <span className="inline-flex items-center gap-1 text-accent-green">
                                  <Check className="h-4 w-4 shrink-0" />
                                  {row.matched_tool_name}
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                                  <span className="inline-flex items-center gap-1 text-fg-muted">
                                    <X className="h-4 w-4 shrink-0" />
                                    No detectada
                                  </span>
                                  {projectId ? (
                                    <Link
                                      to={`/tools?prefillName=${encodeURIComponent(row.item_label)}&assignProject=${encodeURIComponent(projectId)}`}
                                      className="text-xs font-medium text-accent-green hover:underline"
                                    >
                                      Añadir sugerida →
                                    </Link>
                                  ) : null}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-3 text-xs text-fg-muted">
                      La coincidencia es por nombre/vendor aproximado. Ajusta nombres en Herramientas si no
                      encaja.
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-10 flex items-center gap-2 text-xs text-fg-muted">
        <Link2 className="h-3.5 w-3.5" />
        Después de comparar, puedes añadir o editar herramientas en{' '}
        <Link to="/tools" className="text-accent-green hover:underline">
          Herramientas
        </Link>
        .
      </p>
    </div>
  );
}
