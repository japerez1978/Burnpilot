import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { ToolFormValues } from '@burnpilot/types';
import { toolFormSchema } from '@burnpilot/types';
import {
  nextBillingOnOrAfter,
  splitEvenAllocations,
  toMonthlyCents,
  todayLocalIsoDate,
  type Periodicity,
} from '@burnpilot/utils';
import { Sparkles } from 'lucide-react';
import { Button, ButtonSecondary } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { fetchToolsAiEnrich } from '@/lib/toolsAiApi';
import { mergePendingTool } from '@/lib/mergePendingTool';
import { parseMajorToCents } from '@/lib/money';
import {
  formatToolsAiPricingNotes,
  majorToFormAmount,
  parseMajorEuroFromHint,
  periodicityFromBilling,
  pickPlanForForm,
} from '@/lib/toolsAiEnrichApply';
import { getSupabaseClient } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';
import type { ToolsAiEnrichData } from '@burnpilot/types';

type CategoryRow = { id: number; name: string; slug: string };
type ProjectRow = { id: string; name: string };

function websiteUrlForSupabase(raw: string | undefined | null): string | null {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (!t) return null;
  try {
    const href = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(href);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href.length > 2048 ? u.href.slice(0, 2048) : u.href;
  } catch {
    return null;
  }
}

export type ToolRow = {
  id: string;
  name: string;
  vendor: string | null;
  website_url?: string | null;
  category_id: number;
  plan_label: string | null;
  amount_cents: number;
  currency: string;
  periodicity: string;
  last_renewal_at: string;
  state: string;
  perceived_usefulness: number | null;
  notes: string | null;
  fx_rate_to_base?: number | null;
  amount_in_base_cents?: number | null;
  pending_amount_cents?: number | null;
  pending_amount_in_base_cents?: number | null;
  pending_periodicity?: string | null;
  pending_plan_label?: string | null;
  pending_effective_date?: string | null;
  deleted_at?: string | null;
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
  /** Fila actual de `tools` (p. ej. tras refetch); evita datos obsoletos al fusionar `pending_*`. */
  editingLive?: (ToolRow & { project_tools?: ProjectToolEmbed[] | null }) | null;
  /** Alta nueva desde Stacks u otra pantalla: nombre, proyecto, categoría y web opcionales. */
  initialCreatePreset?: {
    name?: string;
    projectId?: string | null;
    categoryId?: number;
    websiteUrl?: string;
  } | null;
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

export function ToolFormModal({
  open,
  onClose,
  userId,
  editing,
  editingLive,
  initialCreatePreset,
  categories,
  projects,
}: Props) {
  const queryClient = useQueryClient();
  const session = useSessionStore((s) => s.session);
  const [scheduleNextRenewal, setScheduleNextRenewal] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<ToolsAiEnrichData | null>(null);
  const [overwriteAiNotes, setOverwriteAiNotes] = useState(true);
  /** Añade resumen de precios IA al campo Notas (se guarda al enviar el formulario). */
  const [includeAiPricingNotes, setIncludeAiPricingNotes] = useState(true);
  /** Misma fuente que el resto de la app — no usar otra query con la misma key (pisaba onboarding_completed_at). */
  const profileQuery = useProfileQuery();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
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
      websiteUrl: '',
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
    if (open) {
      setScheduleNextRenewal(false);
      setAiError(null);
      setAiPreview(null);
      setOverwriteAiNotes(true);
      setIncludeAiPricingNotes(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const p = profileQuery.data;
    const baseCurrency =
      p?.display_currency && ['EUR', 'USD', 'GBP'].includes(p.display_currency)
        ? p.display_currency
        : 'EUR';

    if (editing) {
      const source = editingLive ?? editing;
      const effective = mergePendingTool(source);
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
        name: effective.name,
        vendor: effective.vendor ?? '',
        categoryId: effective.category_id,
        planLabel: effective.plan_label ?? '',
        amount: String(effective.amount_cents / 100),
        currency: effective.currency as ToolFormValues['currency'],
        periodicity: effective.periodicity as ToolFormValues['periodicity'],
        lastRenewalAt: effective.last_renewal_at,
        state: effective.state as ToolFormValues['state'],
        perceivedUsefulness: (effective.perceived_usefulness != null
          ? String(effective.perceived_usefulness)
          : '') as ToolFormValues['perceivedUsefulness'],
        notes: effective.notes ?? '',
        websiteUrl: effective.website_url ?? '',
        assignmentMode: mode,
        singleProjectId: singleId,
        sharedAllocations: shared,
      });
      return;
    }

    const presetPid = initialCreatePreset?.projectId;
    const hasPresetProject =
      typeof presetPid === 'string' && projects.some((pr) => pr.id === presetPid);
    const presetCat = initialCreatePreset?.categoryId;
    const validPresetCat =
      typeof presetCat === 'number' && categories.some((c) => c.id === presetCat);
    const presetWeb = initialCreatePreset?.websiteUrl?.trim();
    const normalizedPresetWeb = presetWeb ? websiteUrlForSupabase(presetWeb) : null;
    const websiteUrl = normalizedPresetWeb ?? '';

    reset({
      name: initialCreatePreset?.name ?? '',
      vendor: '',
      categoryId: validPresetCat ? presetCat : categories[0]?.id ?? 1,
      planLabel: '',
      amount: '',
      currency: baseCurrency as ToolFormValues['currency'],
      periodicity: 'monthly',
      lastRenewalAt: new Date().toISOString().slice(0, 10),
      state: 'active',
      perceivedUsefulness: '',
      notes: '',
      websiteUrl,
      assignmentMode: hasPresetProject ? 'single' : 'none',
      singleProjectId: hasPresetProject ? presetPid! : null,
      sharedAllocations: [],
    });
  }, [open, editing, editingLive, categories, reset, profileQuery.data, initialCreatePreset, projects]);

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
    mutationFn: async (input: { values: ToolFormValues; schedule: boolean }) => {
      const values = input.values;
      const scheduleNextRenewal = input.schedule;
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

      const newPricing = {
        plan_label: values.planLabel?.trim() || null,
        amount_cents: amountCents,
        currency: values.currency,
        periodicity: values.periodicity,
        fx_rate_to_base: fxRate,
        amount_in_base_cents: amountInBase,
      };

      const common = {
        user_id: userId,
        name: values.name.trim(),
        vendor: values.vendor?.trim() || null,
        category_id: values.categoryId,
        last_renewal_at: values.lastRenewalAt,
        state: values.state,
        perceived_usefulness: perceived,
        notes: values.notes?.trim() || null,
        website_url: websiteUrlForSupabase(values.websiteUrl),
      };

      const pendingClears = {
        pending_amount_cents: null as number | null,
        pending_amount_in_base_cents: null as number | null,
        pending_periodicity: null as string | null,
        pending_plan_label: null as string | null,
        pending_effective_date: null as string | null,
      };

      if (!editing) {
        const payload = { ...common, ...newPricing };
        const { data: inserted, error: iErr } = await supabase
          .from('tools')
          .insert(payload)
          .select('id')
          .single();
        if (iErr) throw iErr;
        await insertAssignments(supabase, inserted.id, values);
        return;
      }

      const raw = editingLive ?? editing;
      const baseline = mergePendingTool(raw);
      const toolId = raw.id;

      const { error: dErr } = await supabase.from('project_tools').delete().eq('tool_id', toolId);
      if (dErr) throw dErr;

      const currencyChanged = values.currency !== raw.currency;
      const formPlan = values.planLabel?.trim() || null;
      const baselinePlan = baseline.plan_label?.trim() || null;
      const pricingChanged =
        newPricing.amount_cents !== baseline.amount_cents ||
        values.periodicity !== baseline.periodicity ||
        (formPlan || null) !== (baselinePlan || null);

      if (currencyChanged) {
        const { error: uErr } = await supabase
          .from('tools')
          .update({
            ...common,
            ...newPricing,
            ...pendingClears,
          })
          .eq('id', toolId);
        if (uErr) throw uErr;
        await insertAssignments(supabase, toolId, values);
        return;
      }

      if (pricingChanged && scheduleNextRenewal) {
        const effectiveDate = nextBillingOnOrAfter(raw.last_renewal_at, raw.periodicity as Periodicity);
        const { error: uErr } = await supabase
          .from('tools')
          .update({
            ...common,
            amount_cents: raw.amount_cents,
            currency: raw.currency,
            periodicity: raw.periodicity,
            fx_rate_to_base: raw.fx_rate_to_base ?? null,
            amount_in_base_cents: raw.amount_in_base_cents ?? null,
            plan_label: raw.plan_label?.trim() || null,
            pending_amount_cents: newPricing.amount_cents,
            pending_amount_in_base_cents: newPricing.amount_in_base_cents,
            pending_periodicity: newPricing.periodicity,
            pending_plan_label: newPricing.plan_label,
            pending_effective_date: effectiveDate,
          })
          .eq('id', toolId);
        if (uErr) throw uErr;
        await insertAssignments(supabase, toolId, values);
        return;
      }

      if (pricingChanged && !scheduleNextRenewal) {
        const { error: uErr } = await supabase
          .from('tools')
          .update({
            ...common,
            ...newPricing,
            ...pendingClears,
          })
          .eq('id', toolId);
        if (uErr) throw uErr;
        await insertAssignments(supabase, toolId, values);
        return;
      }

      const { error: uErr } = await supabase.from('tools').update({ ...common }).eq('id', toolId);
      if (uErr) throw uErr;
      await insertAssignments(supabase, toolId, values);
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

  const apiBase = import.meta.env.VITE_API_URL as string | undefined;
  const canUseAi = Boolean(apiBase?.trim() && session?.access_token);

  async function handleAiEnrich() {
    setAiError(null);
    const name = getValues('name')?.trim();
    if (!name) {
      setAiError('Escribe al menos el nombre de la herramienta.');
      return;
    }
    if (!canUseAi || !apiBase || !session?.access_token) {
      setAiError('Configura VITE_API_URL e inicia sesión.');
      return;
    }
    setAiBusy(true);
    try {
      const data = await fetchToolsAiEnrich(apiBase, session.access_token, {
        name,
        vendor: getValues('vendor')?.trim() || undefined,
        notes: getValues('notes')?.trim() || undefined,
        categories,
      });
      setValue('categoryId', data.categoryId, { shouldValidate: true });
      if (data.websiteUrl) {
        setValue('websiteUrl', data.websiteUrl, { shouldValidate: true });
      }

      const plan = pickPlanForForm(data.pricing.plans);
      if (plan) {
        setValue('planLabel', plan.name.slice(0, 120), { shouldValidate: true });
        setValue('periodicity', periodicityFromBilling(plan.billing), { shouldValidate: true });
        const major = parseMajorEuroFromHint(plan.priceHint);
        if (major != null) {
          setValue('amount', majorToFormAmount(major), { shouldValidate: true });
        }
      }

      const pricingBlock = formatToolsAiPricingNotes(data);
      if (includeAiPricingNotes) {
        const cur = (getValues('notes') ?? '').trim();
        if (overwriteAiNotes) {
          setValue('notes', `${data.notes.trim()}\n\n${pricingBlock}`.trim(), { shouldValidate: true });
        } else if (cur) {
          setValue('notes', `${cur}\n\n${pricingBlock}`, { shouldValidate: true });
        } else {
          setValue('notes', `${data.notes.trim()}\n\n${pricingBlock}`.trim(), { shouldValidate: true });
        }
      } else if (overwriteAiNotes) {
        setValue('notes', data.notes, { shouldValidate: true });
      }

      setAiPreview(data);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'IA no disponible.');
      setAiPreview(null);
    } finally {
      setAiBusy(false);
    }
  }

  const rawForModal = editing ? (editingLive ?? editing) : null;
  const futurePending =
    rawForModal?.pending_effective_date != null &&
    rawForModal.pending_effective_date > todayLocalIsoDate();

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
        {futurePending && rawForModal ? (
          <p className="mt-3 rounded-lg border border-accent-amber/40 bg-bg-base/80 px-3 py-2 text-sm text-fg-muted">
            Cambio de importe o plan programado para el{' '}
            <span className="font-medium text-fg-primary">{rawForModal.pending_effective_date}</span>
            {rawForModal.pending_plan_label ? (
              <>
                {' '}
                (plan: {rawForModal.pending_plan_label})
              </>
            ) : null}
            . Hasta entonces sigue el precio actual.
          </p>
        ) : null}
        <form
          className="mt-5 max-h-[70vh] space-y-4 overflow-y-auto pr-1"
          onSubmit={handleSubmit((v) => saveMutation.mutate({ values: v, schedule: scheduleNextRenewal }))}
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
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium text-fg-primary" htmlFor="tf-web">
                Sitio web (opcional)
              </label>
              <Input
                id="tf-web"
                inputMode="url"
                placeholder="https://ejemplo.com o dominio.com"
                autoComplete="url"
                {...register('websiteUrl')}
              />
              {errors.websiteUrl ? (
                <p className="text-sm text-accent-red">{errors.websiteUrl.message}</p>
              ) : null}
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
            {editing && rawForModal ? (
              <div className="space-y-1.5 sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-2 text-sm text-fg-muted">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-bg-border text-accent-green focus:ring-accent-green"
                    checked={scheduleNextRenewal}
                    onChange={(e) => setScheduleNextRenewal(e.target.checked)}
                  />
                  <span>
                    Aplicar cambios de importe, periodicidad o plan desde la próxima renovación (la moneda se
                    aplica siempre al guardar).
                  </span>
                </label>
              </div>
            ) : null}
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

          <div className="space-y-2 rounded-lg border border-bg-border border-dashed bg-bg-base/30 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Sugerencias IA</p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
              <input
                type="checkbox"
                className="rounded border-bg-border text-accent-green focus:ring-accent-green"
                checked={overwriteAiNotes}
                onChange={(e) => setOverwriteAiNotes(e.target.checked)}
              />
              Sobrescribir notas con el texto sugerido
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
              <input
                type="checkbox"
                className="rounded border-bg-border text-accent-green focus:ring-accent-green"
                checked={includeAiPricingNotes}
                onChange={(e) => setIncludeAiPricingNotes(e.target.checked)}
              />
              Guardar precios y puntuación IA en Notas (persisten al guardar)
            </label>
            <ButtonSecondary
              type="button"
              disabled={!canUseAi || aiBusy}
              className="w-full sm:w-auto"
              onClick={() => void handleAiEnrich()}
            >
              <Sparkles className="mr-1.5 inline h-4 w-4 text-purple-400" />
              {aiBusy ? 'Consultando IA…' : 'Sugerir con IA (notas, categoría, web, planes)'}
            </ButtonSecondary>
            {!canUseAi ? (
              <p className="text-xs text-fg-muted">
                Necesitas <code className="font-mono">VITE_API_URL</code> y la API con{' '}
                <code className="font-mono">ANTHROPIC_API_KEY</code>.
              </p>
            ) : null}
            {aiError ? <p className="text-sm text-accent-amber">{aiError}</p> : null}
            {aiPreview ? (
              <div className="space-y-2 border-t border-bg-border pt-2 text-xs text-fg-muted">
                <p>
                  Scores (1–100): precio {aiPreview.scores.precio} · eficacia {aiPreview.scores.eficacia} ·
                  sencillez {aiPreview.scores.sencillez}
                </p>
                {aiPreview.websiteUrl ? (
                  <p>
                    <a
                      href={aiPreview.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-accent-green hover:underline"
                    >
                      Web sugerida (abrir)
                    </a>
                  </p>
                ) : null}
                <p className="text-fg-primary">{aiPreview.pricing.summary}</p>
                {aiPreview.pricing.plans.length > 0 ? (
                  <ul className="list-inside list-disc space-y-0.5">
                    {aiPreview.pricing.plans.map((p) => (
                      <li key={p.name}>
                        <span className="font-medium text-fg-primary">{p.name}</span>: {p.priceHint}
                        {p.billing ? ` (${p.billing})` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="italic text-fg-muted">{aiPreview.disclaimer}</p>
              </div>
            ) : null}
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
