import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ToolsAiSuggestionItem } from '@burnpilot/types';
import { formatCents, toolRowMonthlyBurnCentsClient, type Periodicity } from '@burnpilot/utils';
import { ChevronDown, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button, ButtonSecondary } from '@/components/ui/Button';
import type { ProjectToolEmbed, ToolRow } from '@/components/tools/ToolFormModal';
import { ToolFormModal } from '@/components/tools/ToolFormModal';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { fetchToolsAiSuggest } from '@/lib/toolsAiApi';
import { useSessionStore } from '@/store/sessionStore';

type CategoryRow = { id: number; name: string; slug: string };
type ProjectRow = { id: string; name: string };

type ToolListRow = ToolRow & {
  categories: { name: string } | null;
  project_tools: Array<
    ProjectToolEmbed & {
      projects?: { id: string; name: string } | null;
    }
  > | null;
};

function assignmentLabel(row: ToolListRow): string {
  const pt = row.project_tools ?? [];
  if (pt.length === 0) return 'Sin proyecto';
  if (pt.length === 1) {
    const n = pt[0].projects?.name ?? 'proyecto';
    return `Asignada · ${n}`;
  }
  return `Compartida · ${pt.length} proyectos`;
}

const TOOL_STATE_KEYS = ['trial', 'active', 'doubtful', 'to_cancel', 'canceled'] as const;
type ToolStateKey = (typeof TOOL_STATE_KEYS)[number];

/** Orden de filas en tabla: prueba → activa → en duda → para cancelar → cancelada */
const TOOL_STATE_SORT: Record<string, number> = {
  trial: 0,
  active: 1,
  doubtful: 2,
  to_cancel: 3,
  canceled: 4,
};

function toolStateLabel(state: string): string {
  switch (state) {
    case 'active':
      return 'Activa';
    case 'trial':
      return 'Prueba';
    case 'doubtful':
      return 'En duda';
    case 'to_cancel':
      return 'Para cancelar';
    case 'canceled':
      return 'Cancelada';
    default:
      return state;
  }
}

function toolStateClass(state: string): string {
  switch (state) {
    case 'trial':
      return 'text-sky-400';
    case 'active':
      return 'text-accent-green';
    case 'doubtful':
      return 'text-yellow-400';
    case 'to_cancel':
      return 'text-orange-400';
    case 'canceled':
      return 'text-accent-red';
    default:
      return 'text-fg-muted';
  }
}

export function ToolsPage() {
  const session = useSessionStore((s) => s.session);
  const user = session?.user;
  const profileQuery = useProfileQuery();
  const configured = isSupabaseConfigured();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ToolListRow | null>(null);
  const [createPreset, setCreatePreset] = useState<{
    name?: string;
    projectId?: string;
    categoryId?: number;
    websiteUrl?: string;
  } | null>(null);
  const [discoverCatId, setDiscoverCatId] = useState<number | null>(null);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverBusy, setDiscoverBusy] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [discoverData, setDiscoverData] = useState<{
    suggestions: ToolsAiSuggestionItem[];
    disclaimer: string;
  } | null>(null);
  const [visibleStates, setVisibleStates] = useState<Record<ToolStateKey, boolean>>(() => ({
    trial: true,
    active: true,
    doubtful: true,
    to_cancel: true,
    canceled: true,
  }));

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    enabled: configured,
    queryFn: async (): Promise<CategoryRow[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('categories').select('id, name, slug').order('id');
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['projects', user?.id],
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

  const toolsQuery = useQuery({
    queryKey: ['tools', user?.id],
    enabled: configured && Boolean(user?.id),
    queryFn: async (): Promise<ToolListRow[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('tools')
        .select(
          `
          *,
          categories ( name ),
          project_tools (
            project_id,
            allocation_pct,
            projects ( id, name )
          )
        `,
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ToolListRow[];
    },
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (toolId: string) => {
      const supabase = getSupabaseClient();
      const { error: d1 } = await supabase.from('project_tools').delete().eq('tool_id', toolId);
      if (d1) throw d1;
      const { error: d2 } = await supabase.from('tools').update({ deleted_at: new Date().toISOString() }).eq('id', toolId);
      if (d2) throw d2;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tools', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['project-summary', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['savings-plan', user?.id] });
    },
  });

  const categories = categoriesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];

  useEffect(() => {
    if (categories.length > 0 && discoverCatId == null) {
      setDiscoverCatId(categories[0].id);
    }
  }, [categories, discoverCatId]);
  const displayCurrency =
    profileQuery.data?.display_currency && ['EUR', 'USD', 'GBP'].includes(profileQuery.data.display_currency)
      ? profileQuery.data.display_currency
      : 'EUR';

  const readyForModal = useMemo(
    () => categories.length > 0 && categoriesQuery.isSuccess,
    [categories.length, categoriesQuery.isSuccess],
  );

  useEffect(() => {
    const rawName = searchParams.get('prefillName');
    const assignProject = searchParams.get('assignProject');
    if (!rawName?.trim() || !readyForModal) return;
    const name = decodeURIComponent(rawName.trim());
    setCreatePreset({
      name,
      projectId: assignProject?.trim() || undefined,
    });
    setEditing(null);
    setModalOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('prefillName');
        next.delete('assignProject');
        return next;
      },
      { replace: true },
    );
  }, [searchParams, readyForModal, setSearchParams]);

  const rawTools = toolsQuery.data ?? [];
  const displayedTools = useMemo(() => {
    const filtered = rawTools.filter((r) => {
      const k = r.state as ToolStateKey;
      return TOOL_STATE_KEYS.includes(k) ? visibleStates[k] : true;
    });
    return [...filtered].sort((a, b) => {
      const oa = TOOL_STATE_SORT[a.state] ?? 99;
      const ob = TOOL_STATE_SORT[b.state] ?? 99;
      if (oa !== ob) return oa - ob;
      return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
    });
  }, [rawTools, visibleStates]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Herramientas</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Suscripciones y costes. Los datos viven en{' '}
            <code className="font-mono text-fg-primary">public.tools</code>.
          </p>
        </div>
        <Button
          type="button"
          disabled={!readyForModal}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="mr-1.5 inline h-4 w-4" />
          Añadir
        </Button>
      </header>

      {categories.length > 0 ? (
        <details className="mt-6 rounded-xl border border-bg-border bg-bg-card">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-fg-primary [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Explorar sugerencias (IA por categoría)
            </span>
          </summary>
          <div className="space-y-4 border-t border-bg-border px-4 py-4">
            <p className="text-xs text-fg-muted">
              Elige categoría y opcionalmente afinar con texto. Los precios son orientativos: confirma en la web del
              proveedor.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[12rem] space-y-1">
                <label htmlFor="discover-cat" className="text-xs font-medium text-fg-muted">
                  Categoría
                </label>
                <select
                  id="discover-cat"
                  className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
                  value={discoverCatId ?? ''}
                  onChange={(e) => setDiscoverCatId(Number(e.target.value) || null)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[12rem] flex-1 space-y-1">
                <label htmlFor="discover-q" className="text-xs font-medium text-fg-muted">
                  Búsqueda (opcional)
                </label>
                <input
                  id="discover-q"
                  className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
                  placeholder="ej. deploy, email, facturación…"
                  value={discoverQuery}
                  onChange={(e) => setDiscoverQuery(e.target.value)}
                />
              </div>
              <ButtonSecondary
                type="button"
                disabled={
                  discoverBusy ||
                  discoverCatId == null ||
                  !import.meta.env.VITE_API_URL?.trim() ||
                  !session?.access_token
                }
                onClick={() => void (async () => {
                  const apiBase = import.meta.env.VITE_API_URL as string | undefined;
                  if (!apiBase?.trim() || !session?.access_token || discoverCatId == null) return;
                  setDiscoverError(null);
                  setDiscoverBusy(true);
                  try {
                    const data = await fetchToolsAiSuggest(apiBase, session.access_token, {
                      categoryId: discoverCatId,
                      query: discoverQuery.trim() || undefined,
                      limit: 6,
                      categories,
                    });
                    setDiscoverData(data);
                  } catch (e) {
                    setDiscoverError(e instanceof Error ? e.message : 'Error al sugerir.');
                    setDiscoverData(null);
                  } finally {
                    setDiscoverBusy(false);
                  }
                })()}
              >
                {discoverBusy ? 'Buscando…' : 'Buscar sugerencias'}
              </ButtonSecondary>
            </div>
            {!import.meta.env.VITE_API_URL?.trim() || !session?.access_token ? (
              <p className="text-xs text-fg-muted">
                Requiere sesión y <code className="font-mono">VITE_API_URL</code> apuntando a la API con{' '}
                <code className="font-mono">ANTHROPIC_API_KEY</code>.
              </p>
            ) : null}
            {discoverError ? <p className="text-sm text-accent-amber">{discoverError}</p> : null}
            {discoverData ? (
              <div className="space-y-3">
                <p className="text-xs italic text-fg-muted">{discoverData.disclaimer}</p>
                <ul className="space-y-3">
                  {discoverData.suggestions.map((s) => (
                    <li
                      key={`${s.name}-${s.vendor ?? ''}`}
                      className="rounded-lg border border-bg-border bg-bg-base/50 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-fg-primary">{s.name}</p>
                          {s.vendor ? <p className="text-xs text-fg-muted">{s.vendor}</p> : null}
                          <p className="mt-1 text-fg-muted">{s.notes}</p>
                          <p className="mt-2 text-xs text-fg-muted">
                            Precio {s.scores.precio} · Eficacia {s.scores.eficacia} · Sencillez{' '}
                            {s.scores.sencillez}
                          </p>
                          <p className="mt-1 text-xs text-fg-primary">{s.pricing.summary}</p>
                          {s.websiteUrl ? (
                            <p className="mt-1">
                              <a
                                href={s.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-accent-green hover:underline"
                              >
                                Web sugerida
                              </a>
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          className="shrink-0"
                          onClick={() => {
                            setCreatePreset({
                              name: s.name,
                              categoryId: s.categoryId,
                              websiteUrl: s.websiteUrl,
                            });
                            setEditing(null);
                            setModalOpen(true);
                          }}
                        >
                          Añadir
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      {!toolsQuery.isLoading && !toolsQuery.isError && rawTools.length > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <details className="group relative z-20">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-bg-border bg-bg-card px-3 py-2 text-sm font-medium text-fg-primary hover:bg-bg-elev [&::-webkit-details-marker]:hidden">
              Filtrar por estado
              <ChevronDown className="h-4 w-4 opacity-70 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div
              className="absolute left-0 mt-2 min-w-[240px] rounded-lg border border-bg-border bg-bg-card p-3 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-2 text-xs text-fg-muted">Marca los estados que quieres ver (varios a la vez).</p>
              <ul className="space-y-2">
                {TOOL_STATE_KEYS.map((key) => (
                  <li key={key}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-bg-border text-accent-green focus:ring-accent-green"
                        checked={visibleStates[key]}
                        onChange={() =>
                          setVisibleStates((s) => ({
                            ...s,
                            [key]: !s[key],
                          }))
                        }
                      />
                      <span className={toolStateClass(key)}>{toolStateLabel(key)}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-bg-border pt-3">
                <button
                  type="button"
                  className="text-xs font-medium text-accent-green hover:underline"
                  onClick={() =>
                    setVisibleStates({
                      trial: true,
                      active: true,
                      doubtful: true,
                      to_cancel: true,
                      canceled: true,
                    })
                  }
                >
                  Todas
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-fg-muted hover:text-fg-primary hover:underline"
                  onClick={() =>
                    setVisibleStates({
                      trial: false,
                      active: false,
                      doubtful: false,
                      to_cancel: false,
                      canceled: false,
                    })
                  }
                >
                  Ninguna
                </button>
              </div>
            </div>
          </details>
          <span className="text-xs text-fg-muted">
            {displayedTools.length === rawTools.length
              ? `${rawTools.length} herramienta${rawTools.length === 1 ? '' : 's'}`
              : `Mostrando ${displayedTools.length} de ${rawTools.length}`}
          </span>
        </div>
      ) : null}

      {toolsQuery.isLoading ? (
        <p className="mt-8 text-sm text-fg-muted">Cargando herramientas…</p>
      ) : toolsQuery.isError ? (
        <p className="mt-8 text-sm text-accent-amber">
          No se pudieron cargar las herramientas. Aplica la migración Sprint 2 en Supabase:{' '}
          <code className="font-mono text-xs">supabase/migrations/20250420000001_tools_projects_categories.sql</code>
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-bg-border">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-bg-border bg-bg-elev text-fg-muted">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Web</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-center font-medium">Coste mensual (aprox.)</th>
                <th className="px-4 py-3 font-medium">Asignación</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rawTools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-fg-muted">
                    No hay herramientas aún. Pulsa <strong className="text-fg-primary">Añadir</strong>.
                  </td>
                </tr>
              ) : displayedTools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-fg-muted">
                    Ninguna herramienta coincide con los estados seleccionados. Abre{' '}
                    <strong className="text-fg-primary">Filtrar por estado</strong> y marca al menos uno.
                  </td>
                </tr>
              ) : (
                displayedTools.map((row) => {
                  const monthlyBase = toolRowMonthlyBurnCentsClient({
                    deleted_at: row.deleted_at ?? null,
                    state: row.state,
                    last_renewal_at: row.last_renewal_at,
                    periodicity: row.periodicity as Periodicity,
                    amount_cents: row.amount_cents,
                    amount_in_base_cents: row.amount_in_base_cents,
                    pending_effective_date: row.pending_effective_date,
                    pending_amount_cents: row.pending_amount_cents,
                    pending_amount_in_base_cents: row.pending_amount_in_base_cents,
                    pending_periodicity: row.pending_periodicity,
                  });
                  const monthlyLabel = formatCents(monthlyBase, displayCurrency);
                  const st = row.state;
                  const stateClass = toolStateClass(st);
                  return (
                    <tr key={row.id} className="border-b border-bg-border/80 hover:bg-bg-card/40">
                      <td className="px-4 py-3 font-medium text-fg-primary">{row.name}</td>
                      <td className="px-4 py-3">
                        {row.website_url ? (
                          <a
                            href={row.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-green hover:underline"
                          >
                            Abrir
                          </a>
                        ) : (
                          <span className="text-fg-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-fg-muted">{row.categories?.name ?? '—'}</td>
                      <td className={`px-4 py-3 text-sm ${stateClass}`}>{toolStateLabel(st)}</td>
                      <td className="px-4 py-3 text-center font-mono tabular-nums text-fg-primary">{monthlyLabel}</td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-fg-muted">{assignmentLabel(row)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="mr-2 inline-flex rounded p-1.5 text-fg-muted hover:bg-bg-elev hover:text-accent-green"
                          title="Editar"
                          onClick={() => {
                            setEditing(row);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex rounded p-1.5 text-fg-muted hover:bg-bg-elev hover:text-accent-red"
                          title="Eliminar"
                          onClick={() => {
                            if (!confirm('¿Eliminar esta herramienta?')) return;
                            softDeleteMutation.mutate(row.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {user && readyForModal ? (
        <ToolFormModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
            setCreatePreset(null);
          }}
          userId={user.id}
          initialCreatePreset={createPreset}
          editing={
            editing
              ? {
                  ...editing,
                  project_tools: (editing.project_tools ?? []).map((r) => ({
                    project_id: r.project_id,
                    allocation_pct: Number(r.allocation_pct),
                  })),
                }
              : null
          }
          editingLive={editing ? rawTools.find((r) => r.id === editing.id) ?? null : null}
          categories={categories}
          projects={projects}
        />
      ) : null}
    </div>
  );
}
