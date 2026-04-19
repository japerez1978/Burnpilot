import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button, ButtonSecondary } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { getSupabaseClient } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

const currencies = ['EUR', 'USD', 'GBP'] as const;

const schema = z.object({
  fullName: z.string().max(120, 'Máximo 120 caracteres.'),
  displayCurrency: z.enum(currencies),
  monthlyBudget: z
    .string()
    .trim()
    .refine(
      (s) => s === '' || /^[0-9]+([.,][0-9]{1,2})?$/.test(s),
      'Usa un importe válido (ej. 500 o 500,50).',
    ),
});

type FormValues = z.infer<typeof schema>;

function parseBudgetToCents(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const normalized = s.replace(',', '.');
  const major = Number.parseFloat(normalized);
  if (Number.isNaN(major) || major < 0) return null;
  return Math.round(major * 100);
}

export function SettingsAccountPage() {
  const user = useSessionStore((s) => s.session?.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const profileQuery = useProfileQuery();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      displayCurrency: 'EUR',
      monthlyBudget: '',
    },
  });

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    const currency = currencies.includes(p.display_currency as (typeof currencies)[number])
      ? p.display_currency
      : 'EUR';
    reset({
      fullName: p.full_name ?? '',
      displayCurrency: currency as FormValues['displayCurrency'],
      monthlyBudget: p.monthly_budget_cents != null ? String(p.monthly_budget_cents / 100) : '',
    });
  }, [profileQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const supabase = getSupabaseClient();
      const monthly_budget_cents = parseBudgetToCents(values.monthlyBudget);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.fullName.trim() || null,
          display_currency: values.displayCurrency,
          monthly_budget_cents,
        })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      setDeleteError(null);
      const supabase = getSupabaseClient();
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !sessionData.session) {
        throw new Error('Sesión no disponible.');
      }
      const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
      if (!apiUrl) {
        throw new Error('VITE_API_URL no está definido.');
      }
      const target = `${apiUrl.replace(/\/$/, '')}/v1/account`;
      let res: Response;
      try {
        res = await fetch(target, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        });
      } catch (e) {
        const msg =
          e instanceof TypeError && (e.message === 'Failed to fetch' || e.name === 'TypeError')
            ? `No hay conexión con la API (${target}). Arranca el backend: «npm run dev» en la raíz del monorepo (web + api) o «npm run dev -w @burnpilot/api». Comprueba VITE_API_URL en apps/web/.env.local y que uses el mismo host que ALLOWED_ORIGIN en la API (localhost vs 127.0.0.1).`
            : e instanceof Error
              ? e.message
              : 'Error de red';
        throw new Error(msg);
      }
      if (res.status === 204) {
        await supabase.auth.signOut();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      throw new Error(body.error ?? `Error ${res.status}`);
    },
    onSuccess: async () => {
      await queryClient.clear();
      navigate('/', { replace: true });
    },
    onError: (e: Error) => {
      setDeleteError(e.message);
    },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/dashboard"
          className="text-sm font-medium text-accent-green hover:underline"
        >
          ← Volver al dashboard
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cuenta y preferencias</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Datos guardados en <code className="font-mono text-fg-primary">public.profiles</code>.
        </p>
      </header>

      {profileQuery.isLoading ? (
        <p className="text-sm text-fg-muted">Cargando…</p>
      ) : profileQuery.isError ? (
        <p className="text-sm text-accent-amber">
          No se pudo cargar el perfil. Comprueba la migración y tu sesión.
        </p>
      ) : (
        <form
          className="space-y-5 rounded-xl border border-bg-border bg-bg-card p-6"
          onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
          noValidate
        >
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm font-medium text-fg-primary">
              Nombre
            </label>
            <Input id="fullName" type="text" autoComplete="name" {...register('fullName')} />
            {errors.fullName ? (
              <p className="text-sm text-accent-red">{errors.fullName.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="displayCurrency" className="text-sm font-medium text-fg-primary">
              Moneda principal
            </label>
            <select
              id="displayCurrency"
              className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green"
              {...register('displayCurrency')}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.displayCurrency ? (
              <p className="text-sm text-accent-red">{errors.displayCurrency.message}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="monthlyBudget" className="text-sm font-medium text-fg-primary">
              Presupuesto mensual (opcional)
            </label>
            <Input
              id="monthlyBudget"
              type="text"
              inputMode="decimal"
              placeholder="ej. 500 o 500,50 — vacío = sin límite"
              {...register('monthlyBudget')}
            />
            {errors.monthlyBudget ? (
              <p className="text-sm text-accent-red">{errors.monthlyBudget.message}</p>
            ) : (
              <p className="text-xs text-fg-muted">
                Se guarda en céntimos en base de datos. Déjalo vacío si no quieres presupuesto.
              </p>
            )}
          </div>

          {saveMutation.isError ? (
            <p className="text-sm text-accent-red" role="alert">
              No se pudo guardar. Inténtalo de nuevo.
            </p>
          ) : null}

          {saveMutation.isSuccess && !isDirty ? (
            <p className="text-sm text-accent-green" role="status">
              Guardado.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saveMutation.isPending || !isDirty}>
              {saveMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <ButtonSecondary type="button" onClick={() => reset()}>
              Deshacer
            </ButtonSecondary>
          </div>
        </form>
      )}

      {profileQuery.data ? (
        <section className="rounded-xl border border-accent-red/30 bg-bg-card p-6">
          <h2 className="text-lg font-semibold text-fg-primary">Zona peligrosa</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Elimina tu cuenta y todos los datos asociados (herramientas, proyectos). Requiere la API en Railway con{' '}
            <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code>.
          </p>
          {deleteError ? (
            <p className="mt-3 text-sm text-accent-red" role="alert">
              {deleteError}
            </p>
          ) : null}
          <div className="mt-4">
            <ButtonSecondary
              type="button"
              className="border-accent-red/50 text-accent-red hover:border-accent-red hover:bg-accent-red/10"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!window.confirm('¿Eliminar cuenta de forma permanente? Esta acción no se puede deshacer.')) {
                  return;
                }
                deleteMutation.mutate();
              }}
            >
              {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar cuenta'}
            </ButtonSecondary>
          </div>
        </section>
      ) : null}
    </main>
  );
}
