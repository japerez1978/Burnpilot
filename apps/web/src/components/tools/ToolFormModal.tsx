import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { ToolFormValues } from '@burnpilot/types';
import { toolFormSchema } from '@burnpilot/types';
import { splitEvenAllocations, toMonthlyCents, type Periodicity } from '@burnpilot/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { parseMajorToCents } from '@/lib/money';
import { getSupabaseClient } from '@/lib/supabase';

type CategoryRow = { id: number; name: string; slug: string };
type ProjectRow = { id: string; name: string };
export type ToolRow = {
  id: string;
  name: string;
  vendor: string | null;
  category_id: number;
  plan_label: string | null;
  amount_cents: number;
  currency: string;
  periodicity: string;
  last_renewal_at: string;
  state: string;
  perceived_usefulness: number | null;
  notes: string | null;
};

export type ProjectToolEmbed = {
  project_id: string;
  allocation_pct: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  editing: (ToolRow & { project_tools?: ProjectToolEmbed[] | null }) | null;
  categories: CategoryRow[];
  projects: ProjectRow[];
};

async function fetchFxToBase(from: string, to: string): Promise<{ rate: number } | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('fx_rates')
    .select('rate')
    .eq('from_currency', from)
    .eq('to_currency', to)
    .maybeSingle();
  if (error || !data) return null;
  return { rate: Number(data.rate) };
}

export function ToolFormModal({ open, onClose, userId, editing, categories, projects }: Props) {
  const queryClient = useQueryClient();
  /** Misma fuente que el resto de la app — no usar otra query con la misma key (pisaba onboarding_completed_at). */
  const profileQuery = useProfileQuery();

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    formState: { errors },
  } = useForm<ToolFormValues>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: {
      name: '',
      vendor: '',
      categoryId: 1,
      planLabel: '',
      amount: '',
      currency: 'EUR',
      periodicity: 'monthly',
      lastRenewalAt: new Date().toISOString().slice(0, 10),
      state: 'active',
      perceivedUsefulness: '',
      notes: '',
      assignmentMode: 'none',
      singleProjectId: null,
      sharedAllocations: [],
    },
  });

  const { fields, remove, replace } = useFieldArray({
    control,
    name: 'sharedAllocations',
  });

  const assignmentMode = useWatch({ control, name: 'assignmentMode' });

  useEffect(() => {
    if (!open) return;
    const p = profileQuery.data;
    const baseCurrency =
      p?.display_currency && ['EUR', 'USD', 'GBP'].includes(p.display_currency)
        ? p.display_currency
        : 'EUR';

    if (editing) {
      const pts = editing.project_tools ?? [];
      let mode: ToolFormValues['assignmentMode'] = 'none';
      let singleId: string | null = null;
      let shared: ToolFormValues['sharedAllocations'] = [];
      if (pts.length === 1) {
        mode = 'single';
        singleId = pts[0].project_id;
      } else if (pts.length > 1) {
        mode = 'shared';
        shared = pts.map((r) => ({
          projectId: r.project_id,
          allocationPct: Number(r.allocation_pct),
        }));
      }
      reset({
        name: editing.name,
        vendor: editing.vendor ?? '',
        categoryId: editing.category_id,
        planLabel: editing.plan_label ?? '',
        amount: String(editing.amount_cents / 100),
        currency: editing.currency as ToolFormValues['currency'],
        periodicity: editing.periodicity as ToolFormValues['periodicity'],
        lastRenewalAt: editing.last_renewal_at,
        state: editing.state as ToolFormValues['state'],
        perceivedUsefulness: (editing.perceived_usefulness != null
          ? String(editing.perceived_usefulness)
          : '') as ToolFormValues['perceivedUsefulness'],
        notes: editing.notes ?? '',
        assignmentMode: mode,
        singleProjectId: singleId,
        sharedAllocations: shared,
      });
      return;
    }

    reset({
      name: '',
      vendor: '',
      categoryId: categories[0]?.id ?? 1,
      planLabel: '',
      amount: '',
      currency: baseCurrency as ToolFormValues['currency'],
      periodicity: 'monthly',
      lastRenewalAt: new Date().toISOString().slice(0, 10),
      state: 'active',
      perceivedUsefulness: '',
      notes: '',
      assignmentMode: 'none',
      singleProjectId: null,
      sharedAllocations: [],
    });
  }, [open, editing, categories, reset, profileQuery.data]);

  useEffect(() => {
    if (editing) return;
    if (assignmentMode !== 'shared' || projects.length < 2) return;
    if (fields.length >= 2) return;
    const [pa, pb] = splitEvenAllocations(2);
    replace([
      { projectId: projects[0].id, allocationPct: pa },
      { projectId: projects[1].id, allocationPct: pb },
    ]);
  }, [editing, assignmentMode, projects, fields.length, replace]);

  const saveMutation = useMutation({
    mutationFn: async (values: ToolFormValues) => {
      const supabase = getSupabaseClient();
      const amountCents = parseMajorToCents(values.amount);
      if (amountCents == null) throw new Error('amount');

      const baseCurrencyRaw = profileQuery.data?.display_currency ?? 'EUR';
      const baseCurrency = ['EUR', 'USD', 'GBP'].includes(baseCurrencyRaw) ? baseCurrencyRaw : 'EUR';
      const monthly = toMonthlyCents(amountCents, values.periodicity as Periodicity);
      let fxRate: number | null = null;
      let amountInBase = monthly;
      if (values.currency === baseCurrency) {
        fxRate = 1;
      } else {
        const fx = await fetchFxToBase(values.currency, baseCurrency);
        if (fx) {
          fxRate = fx.rate;
          amountInBase = Math.round(monthly * fx.rate);
        }
      }

      const perceived =
        values.perceivedUsefulness === '' ? null : Number.parseInt(values.perceivedUsefulness, 10);

      const payload = {
        user_id: userId,
        name: values.name.trim(),
        vendor: values.vendor?.trim() || null,
        category_id: values.categoryId,
        plan_label: values.planLabel?.trim() || null,
        amount_cents: amountCents,
        currency: values.currency,
        periodicity: values.periodicity,
        last_renewal_at: values.lastRenewalAt,
        state: values.state,
        perceived_usefulness: perceived,
        notes: values.notes?.trim() || null,
        fx_rate_to_base: fxRate,
        amount_in_base_cents: amountInBase,
      };

      if (editing) {
        const { error: dErr } = await supabase.from('project_tools').delete().eq('tool_id', editing.id);
        if (dErr) throw dErr;
        const { error: uErr } = await supabase.from('tools').update(payload).eq('id', editing.id);
        if (uErr) throw uErr;
        await insertAssignments(supabase, editing.id, values);
      } else {
        const { data: inserted, error: iErr } = await supabase
          .from('tools')
          .insert(payload)
          .select('id')
          .single();
        if (iErr) throw iErr;
        await insertAssignments(supabase, inserted.id, values);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tools', userId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary', userId] });
      await queryClient.invalidateQueries({ queryKey: ['project-summary', userId] });
      await queryClient.invalidateQueries({ queryKey: ['savings-plan', userId] });
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tool-form-title"
    >
      <div className="my-8 w-full max-w-lg rounded-xl border border-bg-border bg-bg-card p-6 shadow-xl">
        <h2 id="tool-form-title" className="text-lg font-semibold text-fg-primary">
          {editing ? 'Editar herramienta' : 'Nueva herramienta'}
        </h2>
        <form
          className="mt-5 max-h-[70vh] space-y-4 overflow-y-auto pr-1"
          onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium text-fg-primary" htmlFor="tf-name">
                Nombre
              </label>
              <Input id="tf-name" {...register('name')} />
              {errors.name ? <p className="text-sm text-accent-red">{errors.name.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg-primary" htmlFor="tf-vendor">
                Proveedor
              </label>
              <Input id="tf-vendor" {...register('vendor')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg-primary" htmlFor="tf-cat">
                Categoría
              </label>
              <select
                id="tf-cat"
                className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green"
                {...register('categoryId', { valueAsNumber: true })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg-primary" htmlFor="tf-plan">
                Plan (texto)
              </label>
              <Input id="tf-plan" {...register('planLabel')} placeholder="ej. Pro" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg-primary" htmlFor="tf-amount">
                Importe
              </label>
              <Input
                id="tf-amount"
                inputMode="decimal"
                placeholder="0 = plan gratuito"
                {...register('amount')}
              />
              <p className="text-xs text-fg-muted">Deja en blanco o pon 0 si no hay coste (plan free).</p>
              {errors.amount ? <p className="text-sm text-accent-red">{errors.amount.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg-primary" htmlFor="tf-currency">
                Moneda
              </label>
              <select
                id="tf-currency"
                className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
                {...register('currency')}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg-primary" htmlFor="tf-period">
                Periodicidad
              </label>
              <select
                id="tf-period"
                className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
                {...register('periodicity')}
              >
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg-primary" htmlFor="tf-renewal">
                Último cobro
              </label>
              <Input id="tf-renewal" type="date" {...register('lastRenewalAt')} />
              {errors.lastRenewalAt ? (
                <p className="text-sm text-accent-red">{errors.lastRenewalAt.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg-primary" htmlFor="tf-state">
                Estado
              </label>
              <select
                id="tf-state"
                className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
                {...register('state')}
              >
                <option value="active">Activa</option>
                <option value="trial">Prueba</option>
                <option value="doubtful">En duda</option>
                <option value="to_cancel">Para cancelar</option>
                <option value="canceled">Cancelada</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-fg-primary" htmlFor="tf-useful">
                Utilidad (1–5)
              </label>
              <select
                id="tf-useful"
                className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
                {...register('perceivedUsefulness')}
              >
                <option value="">—</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg-primary" htmlFor="tf-notes">
              Notas
            </label>
            <textarea
              id="tf-notes"
              rows={2}
              className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
              {...register('notes')}
            />
          </div>

          <fieldset className="space-y-3 rounded-lg border border-bg-border bg-bg-base/40 p-3">
            <legend className="px-1 text-sm font-medium text-fg-primary">Asignación a proyectos</legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-fg-muted">
                <input type="radio" value="none" {...register('assignmentMode')} />
                Sin proyecto
              </label>
              <label className="flex items-center gap-2 text-sm text-fg-muted">
                <input type="radio" value="single" {...register('assignmentMode')} />
                Asignada a un proyecto
              </label>
              <label className="flex items-center gap-2 text-sm text-fg-muted">
                <input type="radio" value="shared" {...register('assignmentMode')} />
                Compartida entre proyectos
              </label>
            </div>
            {assignmentMode === 'single' ? (
              <div className="space-y-1.5">
                <select
                  className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
                  {...register('singleProjectId')}
                >
                  <option value="">— Elige —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.singleProjectId ? (
                  <p className="text-sm text-accent-red">{errors.singleProjectId.message}</p>
                ) : null}
              </div>
            ) : null}
            {assignmentMode === 'shared' && projects.length >= 2 ? (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-wrap items-end gap-2">
                    <div className="min-w-[10rem] flex-1 space-y-1">
                      <label className="text-xs text-fg-muted">Proyecto</label>
                      <select
                        className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary"
                        {...register(`sharedAllocations.${index}.projectId` as const)}
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-xs text-fg-muted">%</label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`sharedAllocations.${index}.allocationPct` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                    {fields.length > 2 ? (
                      <button
                        type="button"
                        className="mb-0.5 text-xs text-accent-red hover:underline"
                        onClick={() => remove(index)}
                      >
                        Quitar
                      </button>
                    ) : null}
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  {projects.length > fields.length ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-accent-green hover:underline"
                      onClick={() => {
                        const current = getValues('sharedAllocations') ?? [];
                        const used = new Set(current.map((r) => r.projectId));
                        const nextProj = projects.find((p) => !used.has(p.id));
                        if (!nextProj) return;
                        const merged = [...current, { projectId: nextProj.id, allocationPct: 0 }];
                        const pcts = splitEvenAllocations(merged.length);
                        replace(
                          merged.map((row, i) => ({
                            ...row,
                            allocationPct: pcts[i] ?? 0,
                          })),
                        );
                      }}
                    >
                      + Añadir proyecto
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="text-xs font-medium text-fg-muted hover:text-fg-primary"
                    onClick={() => {
                      const current = getValues('sharedAllocations') ?? [];
                      if (current.length === 0) return;
                      const pcts = splitEvenAllocations(current.length);
                      replace(
                        current.map((row, i) => ({
                          ...row,
                          allocationPct: pcts[i] ?? 0,
                        })),
                      );
                    }}
                  >
                    Reparto equitativo
                  </button>
                </div>
              </div>
            ) : assignmentMode === 'shared' ? (
              <p className="text-sm text-accent-amber">Crea al menos dos proyectos en la barra lateral.</p>
            ) : null}
            {typeof errors.sharedAllocations?.message === 'string' ? (
              <p className="text-sm text-accent-red">{errors.sharedAllocations.message}</p>
            ) : null}
          </fieldset>

          {saveMutation.isError ? (
            <p className="text-sm text-accent-red" role="alert">
              No se pudo guardar. Revisa datos y migración Sprint 2.
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-fg-muted hover:bg-bg-elev hover:text-fg-primary"
            >
              Cancelar
            </button>
            <Button type="submit" disabled={saveMutation.isPending || profileQuery.isLoading}>
              {saveMutation.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

async function insertAssignments(
  supabase: ReturnType<typeof getSupabaseClient>,
  toolId: string,
  values: ToolFormValues,
) {
  if (values.assignmentMode === 'none') return;
  if (
    values.assignmentMode === 'single' &&
    values.singleProjectId &&
    values.singleProjectId !== ''
  ) {
    const { error } = await supabase.from('project_tools').insert({
      tool_id: toolId,
      project_id: values.singleProjectId,
      allocation_pct: 100,
    });
    if (error) throw error;
    return;
  }
  if (values.assignmentMode === 'shared' && values.sharedAllocations?.length) {
    const rows = values.sharedAllocations.map((r) => ({
      tool_id: toolId,
      project_id: r.projectId,
      allocation_pct: r.allocationPct,
    }));
    const { error } = await supabase.from('project_tools').insert(rows);
    if (error) throw error;
  }
}
