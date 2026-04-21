import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  buildStackosExportPrompt,
  calcStackosMoscow,
  calcStackosScore,
  stackosMoscowLabel,
  type StackosMoscow,
  type StackosScoringMode,
  type StackosWorkflowState,
} from '@burnpilot/utils';
import { GitBranch, Loader2, Sparkles } from 'lucide-react';
import { Button, ButtonSecondary } from '@/components/ui/Button';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { fetchStackosAnalyze } from '@/lib/stackosApi';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/store/sessionStore';
import type { Session } from '@supabase/supabase-js';

const FREE_MAX_ITEMS = 3;

type ProjectRow = { id: string; name: string };

type RoadmapRow = {
  id: string;
  project_id: string;
  scoring_mode: StackosScoringMode;
};

export type StackosItemRow = {
  id: string;
  roadmap_id: string;
  sort_order: number;
  name: string;
  description: string;
  phase: string;
  facilidad: number;
  velocidad: number;
  eficiencia: number;
  einicial: number;
  elifetime: number;
  score: number;
  moscow: StackosMoscow;
  workflow_state: StackosWorkflowState;
  why: string | null;
  how: string | null;
  ai_note: string | null;
  tech: unknown;
};

function techArrayFromDb(tech: unknown): string[] {
  if (!Array.isArray(tech)) return [];
  return tech.filter((t): t is string => typeof t === 'string');
}

type SortKey = 'score' | 'einicial' | 'elifetime' | 'facilidad' | 'moscow';

export function StackosRoadmapPage() {
  const user = useSessionStore((s) => s.session?.user);
  const session = useSessionStore((s) => s.session);
  const configured = isSupabaseConfigured();
  const profileQuery = useProfileQuery();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [moscowFilter, setMoscowFilter] = useState<StackosMoscow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StackosItemRow | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [promptItem, setPromptItem] = useState<StackosItemRow | null>(null);

  const planTier = profileQuery.data?.plan_tier ?? 'free';
  const isFree = planTier === 'free';

  const projectsQuery = useQuery({
    queryKey: ['projects', user?.id, 'stackos'],
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

  const roadmapQuery = useQuery({
    queryKey: ['stackos-roadmap', projectId],
    enabled: configured && Boolean(projectId),
    queryFn: async (): Promise<RoadmapRow | null> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('stackos_roadmaps')
        .select('id, project_id, scoring_mode')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error) throw error;
      return data as RoadmapRow | null;
    },
  });

  const itemsQuery = useQuery({
    queryKey: ['stackos-items', roadmapQuery.data?.id],
    enabled: Boolean(roadmapQuery.data?.id),
    queryFn: async (): Promise<StackosItemRow[]> => {
      const supabase = getSupabaseClient();
      const rid = roadmapQuery.data!.id;
      const { data, error } = await supabase
        .from('stackos_items')
        .select('*')
        .eq('roadmap_id', rid)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StackosItemRow[];
    },
  });

  const createRoadmapMutation = useMutation({
    mutationFn: async () => {
      const supabase = getSupabaseClient();
      if (!user?.id) throw new Error('No session');
      const { data, error } = await supabase
        .from('stackos_roadmaps')
        .insert({
          project_id: projectId,
          user_id: user.id,
          scoring_mode: 'launch',
        })
        .select('id, project_id, scoring_mode')
        .single();
      if (error) throw error;
      return data as RoadmapRow;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stackos-roadmap', projectId] });
    },
  });

  const setModeMutation = useMutation({
    mutationFn: async (mode: StackosScoringMode) => {
      const supabase = getSupabaseClient();
      const rid = roadmapQuery.data!.id;
      const { error } = await supabase.from('stackos_roadmaps').update({ scoring_mode: mode }).eq('id', rid);
      if (error) throw error;
      const items = itemsQuery.data ?? [];
      for (const it of items) {
        const score = calcStackosScore(
          {
            facilidad: it.facilidad,
            velocidad: it.velocidad,
            eficiencia: it.eficiencia,
            einicial: it.einicial,
            elifetime: it.elifetime,
          },
          mode,
        );
        const moscow = calcStackosMoscow(score);
        const { error: uErr } = await supabase
          .from('stackos_items')
          .update({ score, moscow })
          .eq('id', it.id);
        if (uErr) throw uErr;
      }
      return mode;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stackos-roadmap', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['stackos-items', roadmapQuery.data?.id] });
    },
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ id, workflow_state }: { id: string; workflow_state: StackosWorkflowState }) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('stackos_items').update({ workflow_state }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stackos-items', roadmapQuery.data?.id] });
    },
  });

  const activeItems = useMemo(() => {
    const list = itemsQuery.data ?? [];
    return list.filter((i) => i.workflow_state !== 'postponed' && i.workflow_state !== 'archived');
  }, [itemsQuery.data]);

  const activeCountForLimit = activeItems.filter((i) => moscowFilter === null || i.moscow === moscowFilter).length;

  const sortedActive = useMemo(() => {
    let d = [...activeItems];
    if (moscowFilter) d = d.filter((i) => i.moscow === moscowFilter);
    const mOrder: StackosMoscow[] = ['M', 'S', 'C', 'W'];
    if (sortKey === 'score') d.sort((a, b) => b.score - a.score);
    else if (sortKey === 'einicial') d.sort((a, b) => b.einicial - a.einicial);
    else if (sortKey === 'elifetime') d.sort((a, b) => b.elifetime - a.elifetime);
    else if (sortKey === 'facilidad') d.sort((a, b) => b.facilidad - a.facilidad);
    else d.sort((a, b) => mOrder.indexOf(a.moscow) - mOrder.indexOf(b.moscow) || b.score - a.score);
    return d;
  }, [activeItems, sortKey, moscowFilter]);

  const postponedItems = useMemo(
    () => (itemsQuery.data ?? []).filter((i) => i.workflow_state === 'postponed'),
    [itemsQuery.data],
  );
  const archivedItems = useMemo(
    () => (itemsQuery.data ?? []).filter((i) => i.workflow_state === 'archived'),
    [itemsQuery.data],
  );

  const scoringMode = roadmapQuery.data?.scoring_mode ?? 'launch';
  const canAddMore = !isFree || activeItems.length < FREE_MAX_ITEMS;

  function openExportPrompt(it: StackosItemRow) {
    const mode = roadmapQuery.data?.scoring_mode ?? 'launch';
    const text = buildStackosExportPrompt(
      {
        ...it,
        workflow_state: it.workflow_state,
        tech: techArrayFromDb(it.tech),
        why: it.why,
        how: it.how,
        ai_note: it.ai_note,
      },
      mode,
    );
    setPromptItem(it);
    setPromptText(text);
    setPromptOpen(true);
  }

  function renderSection(_title: string, list: StackosItemRow[]) {
    if (list.length === 0 && _title === 'Activas') {
      return <p className="py-8 text-center text-sm text-fg-muted">Sin funcionalidades. Añade la primera.</p>;
    }
    return list.map((it) => (
      <div
        key={it.id}
        className={cn(
          'rounded-lg border border-bg-border bg-bg-card',
          expandedId === it.id && 'ring-1 ring-accent-green/40',
        )}
      >
        <button
          type="button"
          className="flex w-full items-start gap-3 p-4 text-left"
          onClick={() => setExpandedId((id) => (id === it.id ? null : it.id))}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-fg-primary">{it.name}</span>
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-bold',
                  it.moscow === 'M' && 'bg-accent-green/15 text-accent-green',
                  it.moscow === 'S' && 'bg-blue-500/15 text-blue-300',
                  it.moscow === 'C' && 'bg-emerald-500/15 text-emerald-300',
                  it.moscow === 'W' && 'bg-red-500/15 text-red-300',
                )}
              >
                {stackosMoscowLabel(it.moscow).short}
              </span>
              <span className="text-xs text-fg-muted">{it.phase}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-fg-muted">{it.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-lg font-bold text-fg-primary">{it.score}</div>
            <div className="text-[10px] text-fg-muted">/100</div>
          </div>
        </button>
        {expandedId === it.id ? (
          <div className="border-t border-bg-border px-4 pb-4 pt-2 text-sm">
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div>
                <div className="text-fg-muted">Fac.</div>
                <div className="font-mono text-fg-primary">{it.facilidad}</div>
              </div>
              <div>
                <div className="text-fg-muted">Vel.</div>
                <div className="font-mono text-fg-primary">{it.velocidad}</div>
              </div>
              <div>
                <div className="text-fg-muted">Efic.</div>
                <div className="font-mono text-fg-primary">{it.eficiencia}</div>
              </div>
              <div>
                <div className="text-fg-muted">Eng.i</div>
                <div className="font-mono text-fg-primary">{it.einicial}</div>
              </div>
              <div>
                <div className="text-fg-muted">Eng.∞</div>
                <div className="font-mono text-fg-primary">{it.elifetime}</div>
              </div>
            </div>
            {it.why ? (
              <p className="mt-3 text-xs text-fg-muted">
                <strong className="text-fg-primary">Por qué:</strong> {it.why}
              </p>
            ) : null}
            {it.how ? (
              <p className="mt-2 text-xs text-fg-muted">
                <strong className="text-fg-primary">Cómo:</strong> {it.how}
              </p>
            ) : null}
            {techArrayFromDb(it.tech).length > 0 ? (
              <p className="mt-2 text-xs text-fg-muted">Tech: {techArrayFromDb(it.tech).join(', ')}</p>
            ) : null}
            {it.ai_note ? (
              <p className="mt-2 border-l-2 border-purple-500/50 pl-2 text-xs text-purple-300">{it.ai_note}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {it.workflow_state === 'active' ? (
                <>
                  <ButtonSecondary
                    type="button"
                    onClick={() => updateWorkflowMutation.mutate({ id: it.id, workflow_state: 'validated' })}
                  >
                    Validar
                  </ButtonSecondary>
                  <ButtonSecondary
                    type="button"
                    onClick={() => updateWorkflowMutation.mutate({ id: it.id, workflow_state: 'postponed' })}
                  >
                    Posponer
                  </ButtonSecondary>
                  <ButtonSecondary
                    type="button"
                    onClick={() => updateWorkflowMutation.mutate({ id: it.id, workflow_state: 'archived' })}
                  >
                    Archivar
                  </ButtonSecondary>
                </>
              ) : null}
              {it.workflow_state === 'validated' ? (
                <>
                  <ButtonSecondary
                    type="button"
                    onClick={() => updateWorkflowMutation.mutate({ id: it.id, workflow_state: 'postponed' })}
                  >
                    Posponer
                  </ButtonSecondary>
                  <ButtonSecondary
                    type="button"
                    onClick={() => updateWorkflowMutation.mutate({ id: it.id, workflow_state: 'archived' })}
                  >
                    Archivar
                  </ButtonSecondary>
                </>
              ) : null}
              {(it.workflow_state === 'postponed' || it.workflow_state === 'archived') && (
                <ButtonSecondary
                  type="button"
                  onClick={() => updateWorkflowMutation.mutate({ id: it.id, workflow_state: 'active' })}
                >
                  Reactivar
                </ButtonSecondary>
              )}
              <ButtonSecondary type="button" onClick={() => openExportPrompt(it)}>
                Exportar prompt
              </ButtonSecondary>
              <ButtonSecondary
                type="button"
                onClick={() => {
                  setEditingItem(it);
                  setFormOpen(true);
                }}
              >
                Editar
              </ButtonSecondary>
            </div>
          </div>
        ) : null}
      </div>
    ));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-8 w-8 text-accent-green" strokeWidth={2} />
          <h1 className="text-2xl font-semibold tracking-tight">Roadmappilot</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
          Roadmap de producto por proyecto: cinco indicadores, score y MoSCoW. La IA opcional ajusta valores vía
          la API (clave Anthropic solo en el servidor).
        </p>
      </header>

      <div className="mb-6 rounded-xl border border-bg-border bg-bg-card p-4">
        <label htmlFor="stackos-project" className="text-sm font-medium text-fg-primary">
          Proyecto
        </label>
        <select
          id="stackos-project"
          className="mt-2 w-full max-w-md rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setExpandedId(null);
          }}
        >
          <option value="">— Elige proyecto —</option>
          {(projectsQuery.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {projectId && !roadmapQuery.data && !roadmapQuery.isLoading ? (
          <div className="mt-4">
            <Button
              type="button"
              onClick={() => createRoadmapMutation.mutate()}
              disabled={createRoadmapMutation.isPending}
            >
              {createRoadmapMutation.isPending ? 'Creando…' : 'Crear roadmap para este proyecto'}
            </Button>
          </div>
        ) : null}

        {roadmapQuery.data ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">Modo puntuación</span>
            <div className="flex gap-2">
              <ButtonSecondary
                type="button"
                className={cn(scoringMode === 'launch' && 'border-accent-green text-accent-green')}
                disabled={setModeMutation.isPending}
                onClick={() => scoringMode !== 'launch' && setModeMutation.mutate('launch')}
              >
                Lanzamiento
              </ButtonSecondary>
              <ButtonSecondary
                type="button"
                className={cn(scoringMode === 'retention' && 'border-accent-green text-accent-green')}
                disabled={setModeMutation.isPending}
                onClick={() => scoringMode !== 'retention' && setModeMutation.mutate('retention')}
              >
                Retención
              </ButtonSecondary>
            </div>
          </div>
        ) : null}
      </div>

      {isFree ? (
        <p className="mb-4 text-sm text-fg-muted">
          Plan Free: hasta {FREE_MAX_ITEMS} ítems activos en el roadmap.{' '}
          <Link to="/settings/billing" className="text-accent-green hover:underline">
            Actualizar a Pro
          </Link>
        </p>
      ) : null}

      {roadmapQuery.data ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-fg-muted">Ordenar:</span>
            {(
              [
                ['score', 'Score'],
                ['einicial', 'Eng. inicial'],
                ['elifetime', 'Eng. life'],
                ['facilidad', 'Facilidad'],
                ['moscow', 'MoSCoW'],
              ] as const
            ).map(([k, label]) => (
              <ButtonSecondary
                key={k}
                type="button"
                className={cn('py-1.5 text-xs', sortKey === k && 'border-accent-green text-accent-green')}
                onClick={() => setSortKey(k)}
              >
                {label}
              </ButtonSecondary>
            ))}
            <span className="mx-2 text-bg-border">|</span>
            <span className="text-xs text-fg-muted">Filtrar MoSCoW:</span>
            {(['M', 'S', 'C', 'W'] as const).map((m) => (
              <ButtonSecondary
                key={m}
                type="button"
                className={cn('py-1.5 text-xs', moscowFilter === m && 'border-accent-green text-accent-green')}
                onClick={() => setMoscowFilter((prev) => (prev === m ? null : m))}
              >
                {m}
              </ButtonSecondary>
            ))}
            <Button
              type="button"
              className="ml-auto"
              disabled={!canAddMore}
              onClick={() => {
                setEditingItem(null);
                setFormOpen(true);
              }}
            >
              Añadir funcionalidad
            </Button>
          </div>

          <p className="mb-2 text-xs text-fg-muted">
            Activos (filtro): {activeCountForLimit} · MUST: {activeItems.filter((i) => i.moscow === 'M').length}
          </p>

          {itemsQuery.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando ítems…
            </p>
          ) : itemsQuery.isError ? (
            <p className="text-sm text-accent-amber">
              Error al cargar. Aplica la migración{' '}
              <code className="font-mono text-xs">20250431000001_stackos_roadmap.sql</code> en Supabase.
            </p>
          ) : (
            <div className="space-y-2">
              {renderSection('Activas', sortedActive)}
              {postponedItems.length > 0 ? (
                <>
                  <p className="pt-4 text-xs font-semibold uppercase tracking-wide text-accent-amber">
                    En espera ({postponedItems.length})
                  </p>
                  {renderSection('', postponedItems)}
                </>
              ) : null}
              {archivedItems.length > 0 ? (
                <>
                  <p className="pt-4 text-xs font-semibold uppercase tracking-wide text-red-400/80">
                    Archivadas ({archivedItems.length})
                  </p>
                  {renderSection('', archivedItems)}
                </>
              ) : null}
            </div>
          )}
        </>
      ) : null}

      {formOpen && roadmapQuery.data && session ? (
        <StackosItemFormModal
          key={editingItem?.id ?? 'new-item'}
          roadmapId={roadmapQuery.data.id}
          scoringMode={scoringMode}
          session={session}
          editingItem={editingItem}
          canAddNew={canAddMore || Boolean(editingItem)}
          onClose={() => {
            setFormOpen(false);
            setEditingItem(null);
          }}
          onSaved={() => {
            setFormOpen(false);
            setEditingItem(null);
            void queryClient.invalidateQueries({ queryKey: ['stackos-items', roadmapQuery.data?.id] });
          }}
        />
      ) : null}

      {promptOpen && promptItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal
          aria-label="Exportar prompt"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-bg-border bg-bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-bg-border px-4 py-3">
              <span className="font-semibold text-fg-primary">Prompt — {promptItem.name}</span>
              <ButtonSecondary type="button" onClick={() => setPromptOpen(false)}>
                Cerrar
              </ButtonSecondary>
            </div>
            <textarea
              readOnly
              className="h-[min(70vh,520px)] w-full resize-none border-0 bg-bg-base p-4 font-mono text-xs text-fg-primary"
              value={promptText}
            />
            <div className="border-t border-bg-border p-3">
              <Button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(promptText);
                }}
              >
                Copiar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StackosItemFormModal({
  roadmapId,
  scoringMode,
  session,
  editingItem,
  canAddNew,
  onClose,
  onSaved,
}: {
  roadmapId: string;
  scoringMode: StackosScoringMode;
  session: Session;
  editingItem: StackosItemRow | null;
  canAddNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(editingItem?.name ?? '');
  const [description, setDescription] = useState(editingItem?.description ?? '');
  const [phase, setPhase] = useState(editingItem?.phase ?? 'Ahora');
  const [facilidad, setFacilidad] = useState(editingItem?.facilidad ?? 50);
  const [velocidad, setVelocidad] = useState(editingItem?.velocidad ?? 50);
  const [eficiencia, setEficiencia] = useState(editingItem?.eficiencia ?? 70);
  const [einicial, setEinicial] = useState(editingItem?.einicial ?? 60);
  const [elifetime, setElifetime] = useState(editingItem?.elifetime ?? 50);
  const [useAi, setUseAi] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_URL as string | undefined;
  const previewScore = calcStackosScore(
    { facilidad, velocidad, eficiencia, einicial, elifetime },
    scoringMode,
  );
  const previewMoscow = calcStackosMoscow(previewScore);

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !description.trim()) {
      setError('Nombre y descripción obligatorios.');
      return;
    }
    if (!editingItem && !canAddNew) {
      setError('Límite del plan Free alcanzado.');
      return;
    }
    if (useAi && !apiBase?.trim()) {
      setError(
        'Falta VITE_API_URL en apps/web/.env.local (ej. http://localhost:3000). Reinicia Vite tras guardar.',
      );
      return;
    }
    if (useAi && !session.access_token) {
      setError('Sesión no válida; vuelve a iniciar sesión.');
      return;
    }

    let vals = { facilidad, velocidad, eficiencia, einicial, elifetime };
    let why: string | null = description;
    let how: string | null = '—';
    let tech: string[] = [];
    let aiNote: string | null = null;

    if (useAi && apiBase && session.access_token) {
      setAiBusy(true);
      try {
        const data = await fetchStackosAnalyze(apiBase, session.access_token, {
          name: name.trim(),
          description: description.trim(),
          ...vals,
        });
        vals = {
          facilidad: data.facilidad,
          velocidad: data.velocidad,
          eficiencia: data.eficiencia,
          einicial: data.einicial,
          elifetime: data.elifetime,
        };
        why = data.why;
        how = data.how;
        tech = data.tech;
        aiNote = data.aiNote || null;
        setFacilidad(vals.facilidad);
        setVelocidad(vals.velocidad);
        setEficiencia(vals.eficiencia);
        setEinicial(vals.einicial);
        setElifetime(vals.elifetime);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'IA no disponible; guardando con valores actuales.');
      } finally {
        setAiBusy(false);
      }
    }

    const score = calcStackosScore(vals, scoringMode);
    const moscow = calcStackosMoscow(score);
    const supabase = getSupabaseClient();

    if (editingItem) {
      const { error: uErr } = await supabase
        .from('stackos_items')
        .update({
          name: name.trim(),
          description: description.trim(),
          phase,
          ...vals,
          score,
          moscow,
          why,
          how,
          ai_note: aiNote,
          tech,
        })
        .eq('id', editingItem.id);
      if (uErr) {
        setError(uErr.message);
        return;
      }
    } else {
      const { data: maxRow } = await supabase
        .from('stackos_items')
        .select('sort_order')
        .eq('roadmap_id', roadmapId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = (maxRow?.sort_order ?? -1) + 1;
      const { error: iErr } = await supabase.from('stackos_items').insert({
        roadmap_id: roadmapId,
        sort_order: nextOrder,
        name: name.trim(),
        description: description.trim(),
        phase,
        ...vals,
        score,
        moscow,
        workflow_state: 'active',
        why,
        how,
        ai_note: aiNote,
        tech,
      });
      if (iErr) {
        setError(iErr.message);
        return;
      }
    }
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal
      aria-label={editingItem ? 'Editar funcionalidad' : 'Nueva funcionalidad'}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-bg-border bg-bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-fg-primary">
          {editingItem ? 'Editar funcionalidad' : 'Nueva funcionalidad'}
        </h2>
        {error ? <p className="mt-2 text-sm text-accent-amber">{error}</p> : null}
        <label className="mt-4 block text-xs font-medium uppercase text-fg-muted">Nombre</label>
        <input
          className="mt-1 w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="mt-3 block text-xs font-medium uppercase text-fg-muted">Descripción</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="mt-4 space-y-3">
          {(
            [
              ['facilidad', 'Facilidad técnica', facilidad, setFacilidad],
              ['velocidad', 'Velocidad', velocidad, setVelocidad],
              ['eficiencia', 'Eficiencia coste', eficiencia, setEficiencia],
              ['einicial', 'Eng. inicial', einicial, setEinicial],
              ['elifetime', 'Eng. lifetime', elifetime, setElifetime],
            ] as const
          ).map(([key, label, val, setVal]) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-fg-muted">
                <span>{label}</span>
                <span className="font-mono text-fg-primary">{val}</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={val}
                onChange={(e) => setVal(Number(e.target.value))}
                className="w-full"
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-fg-muted">
          Preview: score <strong className="text-fg-primary">{previewScore}</strong> ·{' '}
          {stackosMoscowLabel(previewMoscow).full}
        </p>
        <label className="mt-3 block text-xs font-medium uppercase text-fg-muted">Fase</label>
        <select
          className="mt-1 w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
        >
          <option>Ahora</option>
          <option>Próximo mes</option>
          <option>Q3 2025</option>
          <option>Q4 2025</option>
          <option>Q1 2026</option>
        </select>
        <label className="mt-4 flex items-center gap-2 text-sm text-fg-muted">
          <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
          <Sparkles className="h-4 w-4 text-purple-400" />
          Ajustar con IA (API con ANTHROPIC_API_KEY + web con VITE_API_URL)
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <ButtonSecondary type="button" onClick={onClose}>
            Cancelar
          </ButtonSecondary>
          <Button type="button" disabled={aiBusy} onClick={() => void handleSubmit()}>
            {aiBusy ? 'IA…' : editingItem ? 'Guardar' : 'Añadir'}
          </Button>
        </div>
      </div>
    </div>
  );
}
