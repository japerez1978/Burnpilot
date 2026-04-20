import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { CreditCard, ExternalLink } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, ButtonSecondary } from '@/components/ui/Button';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { useBillingQuery, type BillingRow } from '@/hooks/useBillingQuery';
import { getSupabaseClient } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

function planLabel(tier: string): string {
  switch (tier) {
    case 'pro':
      return 'Pro';
    case 'lifetime':
      return 'Lifetime';
    default:
      return 'Free';
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

/** Devuelve una frase descriptiva del estado de la suscripción a partir de la fila de subscriptions_billing. */
function subscriptionStatusLine(row: BillingRow | null, tier: string): string | null {
  if (tier === 'lifetime') return 'Lifetime — sin renovación.';
  if (!row) return null;
  const when = formatDate(row.current_period_end);
  if (row.cancel_at_period_end && row.status === 'active') {
    return `Cancelada — mantienes Pro hasta el ${when}.`;
  }
  switch (row.status) {
    case 'active':
      return `Se renueva el ${when}.`;
    case 'trialing':
      return `En prueba — termina el ${when}.`;
    case 'past_due':
      return 'Pago fallido — actualiza tu método en el portal.';
    case 'canceled':
      return 'Suscripción cancelada.';
    case 'incomplete':
    case 'incomplete_expired':
      return 'Pago incompleto — inicia el checkout de nuevo.';
    case 'unpaid':
      return 'Pago pendiente — revisa el portal.';
    default:
      return null;
  }
}

async function apiPost(path: string, body?: Record<string, unknown>): Promise<{ url: string }> {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!apiUrl) {
    throw new Error('Configura VITE_API_URL en apps/web/.env.local (API en local o Railway).');
  }
  const supabase = getSupabaseClient();
  const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
  const session = refreshed.session;
  if (refreshErr || !session?.access_token) {
    throw new Error('Sesión no disponible o caducada. Vuelve a entrar.');
  }
  const target = `${apiUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(target, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { ok?: boolean; data?: { url: string }; error?: string; code?: string };
  if (!res.ok || !json.ok || !json.data?.url) {
    throw new Error(json.error ?? `Error ${res.status}`);
  }
  return json.data;
}

export function SettingsBillingPage() {
  const user = useSessionStore((s) => s.session?.user);
  const profileQuery = useProfileQuery();
  const billingQuery = useBillingQuery();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutFlash = searchParams.get('checkout');

  useEffect(() => {
    if (checkoutFlash === 'success' && user?.id) {
      void queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      void queryClient.invalidateQueries({ queryKey: ['billing', user.id] });
    }
  }, [checkoutFlash, user?.id, queryClient]);

  const checkoutMutation = useMutation({
    mutationFn: (interval: 'month' | 'year') => apiPost('/v1/billing/checkout-session', { interval }),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const lifetimeMutation = useMutation({
    mutationFn: () => apiPost('/v1/billing/lifetime-checkout'),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => apiPost('/v1/billing/portal-session'),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const tier = profileQuery.data?.plan_tier ?? 'free';
  const loading = profileQuery.isLoading;
  const billing = billingQuery.data ?? null;
  const statusLine = subscriptionStatusLine(billing, tier);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        to="/settings/account"
        className="mb-6 inline-block text-sm font-medium text-accent-green hover:underline"
      >
        ← Volver a cuenta
      </Link>
      <div className="flex items-center gap-3">
        <CreditCard className="h-8 w-8 text-accent-green" strokeWidth={2} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Plan BurnPilot vía Stripe (modo test en desarrollo). Requiere API con{' '}
            <code className="font-mono text-xs text-fg-primary">STRIPE_SECRET_KEY</code>.
          </p>
        </div>
      </div>

      {checkoutFlash === 'success' ? (
        <p className="mt-6 rounded-lg border border-accent-green/40 bg-bg-elev px-4 py-3 text-sm text-fg-primary">
          Pago recibido o sesión completada. Si el plan no se actualiza en unos segundos, recarga la página.
        </p>
      ) : null}
      {checkoutFlash === 'cancel' ? (
        <p className="mt-6 rounded-lg border border-bg-border bg-bg-elev px-4 py-3 text-sm text-fg-muted">
          Checkout cancelado. Puedes intentarlo de nuevo cuando quieras.
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border border-bg-border bg-bg-card p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">Plan actual</h2>
        {loading ? (
          <p className="mt-2 text-sm text-fg-muted">Cargando…</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-fg-primary">{planLabel(tier)}</p>
            {/* Lifetime: badge fijo verde, ignora fila billing */}
            {tier === 'lifetime' ? (
              <span className="rounded-full border border-accent-green/40 bg-accent-green/10 px-2 py-0.5 text-xs font-medium text-accent-green">
                Lifetime
              </span>
            ) : null}

            {/* Pro: badges según estado de la suscripción en Stripe */}
            {tier === 'pro' && billing?.status === 'trialing' ? (
              <span className="rounded-full border border-accent-green/40 bg-accent-green/10 px-2 py-0.5 text-xs font-medium text-accent-green">
                En prueba
              </span>
            ) : null}
            {tier === 'pro' && billing?.status === 'past_due' ? (
              <span className="rounded-full border border-accent-red/40 bg-accent-red/10 px-2 py-0.5 text-xs font-medium text-accent-red">
                Pago fallido
              </span>
            ) : null}
            {tier === 'pro' && billing?.cancel_at_period_end && billing.status === 'active' ? (
              <span className="rounded-full border border-accent-red/40 bg-accent-red/10 px-2 py-0.5 text-xs font-medium text-accent-red">
                Cancelada
              </span>
            ) : null}
            {/* "Activa" — tier es la fuente de verdad; si billing aún no cargó o status es active sin cancel, mostramos Activa */}
            {tier === 'pro' && !billing?.cancel_at_period_end && billing?.status !== 'past_due' && billing?.status !== 'trialing' ? (
              <span className="rounded-full border border-accent-green/40 bg-accent-green/10 px-2 py-0.5 text-xs font-medium text-accent-green">
                Activa
              </span>
            ) : null}
          </div>
        )}
        {statusLine ? <p className="mt-2 text-sm text-fg-muted">{statusLine}</p> : null}
        <p className="mt-2 text-sm text-fg-muted">
          {user?.email ? (
            <>
              Cuenta: <span className="text-fg-primary">{user.email}</span>
            </>
          ) : null}
        </p>
      </section>

      <section className="mt-6 space-y-4 rounded-xl border border-bg-border bg-bg-card p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">Mejorar plan</h2>
        <p className="text-sm text-fg-muted">
          Pro mensual / anual y Lifetime (pago único) según precios configurados en Stripe Dashboard y variables{' '}
          <code className="font-mono text-xs">STRIPE_PRICE_ID_*</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={checkoutMutation.isPending || lifetimeMutation.isPending}
            onClick={() => checkoutMutation.mutate('month')}
          >
            Pro — mensual
          </Button>
          <Button
            type="button"
            disabled={checkoutMutation.isPending || lifetimeMutation.isPending}
            onClick={() => checkoutMutation.mutate('year')}
          >
            Pro — anual
          </Button>
          <ButtonSecondary
            type="button"
            disabled={checkoutMutation.isPending || lifetimeMutation.isPending}
            onClick={() => lifetimeMutation.mutate()}
          >
            Lifetime
          </ButtonSecondary>
        </div>
        {(checkoutMutation.isError || lifetimeMutation.isError) && (
          <p className="text-sm text-accent-red" role="alert">
            {(checkoutMutation.error ?? lifetimeMutation.error) instanceof Error
              ? (checkoutMutation.error ?? lifetimeMutation.error)?.message
              : 'Error al crear la sesión de pago.'}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-bg-border bg-bg-card p-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">Gestionar suscripción</h2>
        <p className="mt-2 text-sm text-fg-muted">
          Portal de Stripe: método de pago, facturas y cancelación de la suscripción Pro.
        </p>
        <ButtonSecondary
          type="button"
          className="mt-4"
          disabled={portalMutation.isPending || tier === 'free'}
          onClick={() => portalMutation.mutate()}
        >
          <ExternalLink className="mr-2 inline h-4 w-4" aria-hidden />
          Abrir portal de facturación
        </ButtonSecondary>
        {portalMutation.isError ? (
          <p className="mt-2 text-sm text-accent-red" role="alert">
            {portalMutation.error instanceof Error ? portalMutation.error.message : 'Error'}
          </p>
        ) : null}
        {tier === 'free' ? (
          <p className="mt-2 text-xs text-fg-muted">Contrata Pro al menos una vez para habilitar el portal.</p>
        ) : null}
      </section>

      {checkoutFlash ? (
        <div className="mt-6">
          <button
            type="button"
            className="text-sm text-accent-green hover:underline"
            onClick={() => {
              searchParams.delete('checkout');
              setSearchParams(searchParams, { replace: true });
            }}
          >
            Quitar aviso de la URL
          </button>
        </div>
      ) : null}
    </div>
  );
}
