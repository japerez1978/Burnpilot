import { Check, Flame, LineChart, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors bg-accent-green text-bg-base hover:bg-accent-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-green';

const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-bg-border bg-bg-card px-5 py-3 text-sm font-semibold text-fg-primary transition-colors hover:border-fg-muted/40 hover:bg-bg-elev';

const compareRows: { label: string; burnpilot: string; other: string }[] = [
  {
    label: 'Enfoque',
    burnpilot: 'Builders y equipos que viven en SaaS, APIs y suscripciones técnicas.',
    other: 'Finanzas personales y consumo general (mercado principal EE. UU.).',
  },
  {
    label: 'Proyectos y asignación',
    burnpilot: 'Varios proyectos, burn por proyecto y asignación de tools (regla §8).',
    other: 'No está pensado para “stack por producto” ni asignación M:N simple.',
  },
  {
    label: 'Moneda y región',
    burnpilot: 'EUR/USD/GBP y mentalidad EU indie / contractor.',
    other: 'Dólar y crédito US-first.',
  },
  {
    label: 'Diferencial',
    burnpilot: 'Burn rate, alertas, plan de recorte y stacks recomendados para makers.',
    other: 'Agregación bancaria y crédito; menos foco en coste de herramientas B2B.',
  },
];

export function HomePage() {
  const session = useSessionStore((s) => s.session);
  const configured = isSupabaseConfigured();

  return (
    <PublicLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-green">BurnPilot</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-fg-primary sm:text-5xl">
          Tu burn rate de herramientas,
          <span className="text-accent-green"> sin hojas de cálculo</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-fg-muted">
          Agrupa suscripciones por proyecto, detecta solapamientos y prioriza recortes. Pensado para quien
          construye producto, no para reconciliar el banco.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {session ? (
            <Link to="/dashboard" className={cn(btnPrimary)}>
              Ir al dashboard
            </Link>
          ) : (
            <>
              <Link to="/register" className={cn(btnPrimary)}>
                Empezar gratis
              </Link>
              <Link to="/pricing" className={cn(btnSecondary)}>
                Ver precios
              </Link>
            </>
          )}
        </div>
        {!configured ? (
          <p className="mx-auto mt-8 max-w-lg rounded-lg border border-accent-amber/40 bg-bg-card px-4 py-3 text-sm text-accent-amber">
            Falta configurar Supabase en <code className="font-mono text-fg-primary">apps/web/.env.local</code>.
          </p>
        ) : null}
      </section>

      <section className="border-y border-bg-border bg-bg-elev/40 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-semibold text-fg-primary">Por qué BurnPilot</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-bg-border bg-bg-card p-6">
              <LineChart className="h-8 w-8 text-accent-green" strokeWidth={2} />
              <h3 className="mt-4 font-semibold text-fg-primary">Burn por proyecto</h3>
              <p className="mt-2 text-sm text-fg-muted">
                Ve cuánto cuesta mantener vivo cada producto, no solo el total mensual.
              </p>
            </div>
            <div className="rounded-xl border border-bg-border bg-bg-card p-6">
              <Shield className="h-8 w-8 text-accent-green" strokeWidth={2} />
              <h3 className="mt-4 font-semibold text-fg-primary">Alertas y plan de ahorro</h3>
              <p className="mt-2 text-sm text-fg-muted">
                Reglas sobre presupuesto, duplicados y renovaciones; lista priorizada de recortes.
              </p>
            </div>
            <div className="rounded-xl border border-bg-border bg-bg-card p-6">
              <Flame className="h-8 w-8 text-accent-green" strokeWidth={2} />
              <h3 className="mt-4 font-semibold text-fg-primary">Stacks recomendados</h3>
              <p className="mt-2 text-sm text-fg-muted">
                Biblioteca curada para comparar tu stack real frente a combinaciones típicas de indie makers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-semibold text-fg-primary">BurnPilot vs Rocket Money</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-fg-muted">
          Comparación orientativa; Rocket Money es una marca de referencia en agregación personal. No afiliación
          ni valoración de terceros.
        </p>
        <div className="mt-10 overflow-x-auto rounded-xl border border-bg-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-bg-border bg-bg-card">
                <th className="px-4 py-3 font-medium text-fg-muted"> </th>
                <th className="px-4 py-3 font-semibold text-accent-green">BurnPilot</th>
                <th className="px-4 py-3 font-medium text-fg-muted">Rocket Money (referencia)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border/80">
              {compareRows.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 font-medium text-fg-primary">{row.label}</td>
                  <td className="px-4 py-3 text-fg-muted">{row.burnpilot}</td>
                  <td className="px-4 py-3 text-fg-muted">{row.other}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-fg-muted">
          <Check className="h-4 w-4 text-accent-green" />
          ¿Listo para probarlo?{' '}
          <Link to="/register" className="font-medium text-accent-green hover:underline">
            Crear cuenta gratuita
          </Link>
        </p>
      </section>

      <section className="border-t border-bg-border bg-bg-elev/30 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-xl font-semibold text-fg-primary">Preguntas frecuentes</h2>
          <p className="mt-2 text-sm text-fg-muted">
            Respuestas rápidas; la lista completa está en{' '}
            <Link to="/faq" className="text-accent-green hover:underline">
              /faq
            </Link>
            .
          </p>
          <Link to="/faq" className={cn(btnSecondary, 'mt-6 inline-flex')}>
            Abrir FAQ
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
