import { PublicLayout } from '@/components/layout/PublicLayout';

const items: { q: string; a: string }[] = [
  {
    q: '¿BurnPilot conecta con mi banco?',
    a: 'No es el foco del MVP. BurnPilot parte de las herramientas y suscripciones que registras (y asignas a proyectos), no de la lectura automática de cuentas bancarias.',
  },
  {
    q: '¿Qué es un “proyecto”?',
    a: 'Un contenedor para agrupar herramientas que alimentan el mismo producto o iniciativa. El burn rate por proyecto suma solo lo asignado a ese proyecto.',
  },
  {
    q: '¿Cómo se calcula el burn mensual?',
    a: 'A partir del importe, periodicidad y moneda de cada herramienta, con conversión a tu moneda base cuando aplica. Ver RPCs `dashboard_summary` y `project_summary` en Supabase.',
  },
  {
    q: '¿Dónde gestiono la suscripción Pro?',
    a: 'Desde la app: Cuenta → Facturación, con Stripe Checkout y Customer Portal. Requiere API configurada con claves Stripe.',
  },
  {
    q: '¿Exporto mis datos?',
    a: 'Los usuarios Pro o Lifetime pueden descargar un CSV de herramientas desde Ajustes → Cuenta. La eliminación completa de cuenta sigue el flujo documentado en el runbook.',
  },
  {
    q: '¿Dónde reporto un fallo?',
    a: 'Revisa la consola del navegador y los logs de la API (Railway). Si tienes Sentry configurado (`VITE_SENTRY_DSN`), los errores del front se agrupan allí.',
  },
];

export function FaqPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-3xl font-bold tracking-tight text-fg-primary">Preguntas frecuentes</h1>
        <p className="mt-2 text-fg-muted">Respuestas breves; el producto evoluciona con cada sprint.</p>
        <dl className="mt-10 space-y-8">
          {items.map((item) => (
            <div key={item.q} className="border-b border-bg-border pb-8 last:border-0">
              <dt className="font-semibold text-fg-primary">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-fg-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </PublicLayout>
  );
}
