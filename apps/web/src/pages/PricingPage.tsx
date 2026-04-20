import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';

const tiers = [
  {
    name: 'Free',
    price: '0 €',
    period: 'siempre',
    desc: 'Herramientas, proyectos, dashboard y alertas básicas.',
    features: ['Hasta el uso razonable del producto en fase beta', 'Export CSV no incluido'],
    cta: 'Crear cuenta',
    href: '/register' as const,
    highlight: false,
  },
  {
    name: 'Pro',
    price: '7,99 €',
    period: '/ mes · IVA según Stripe Tax',
    desc: 'Todo lo necesario para operar con varios proyectos y datos exportables.',
    features: [
      'Billing vía Stripe (Checkout + Customer Portal)',
      'Export CSV de herramientas',
      'Soporte según política del producto',
    ],
    cta: 'Empezar',
    href: '/register' as const,
    highlight: true,
  },
  {
    name: 'Lifetime Founder',
    price: '149 €',
    period: 'pago único · plazas limitadas',
    desc: 'Acceso prolongado al producto en la modalidad Lifetime según condiciones publicadas en checkout.',
    features: ['Una vez completado el pago en Stripe', 'Mismas ventajas Pro mientras el plan exista'],
    cta: 'Registrarte y contratar',
    href: '/register' as const,
    highlight: false,
  },
];

export function PricingPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 py-14">
        <h1 className="text-center text-3xl font-bold tracking-tight text-fg-primary">Precios</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-fg-muted">
          Importes orientativos; el cobro real se confirma en Stripe (modo test o live) con impuestos
          aplicables.
        </p>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`flex flex-col rounded-2xl border p-6 ${
                t.highlight
                  ? 'border-accent-green bg-bg-card shadow-lg shadow-accent-green/10'
                  : 'border-bg-border bg-bg-elev/50'
              }`}
            >
              <h2 className="text-lg font-semibold text-fg-primary">{t.name}</h2>
              <p className="mt-2 text-3xl font-bold tabular-nums text-fg-primary">
                {t.price}
                <span className="text-base font-normal text-fg-muted"> {t.period}</span>
              </p>
              <p className="mt-3 flex-1 text-sm text-fg-muted">{t.desc}</p>
              <ul className="mt-6 space-y-2 text-sm text-fg-muted">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-green" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={t.href}
                className={`mt-8 block rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                  t.highlight
                    ? 'bg-accent-green text-bg-base hover:bg-accent-green/90'
                    : 'border border-bg-border bg-bg-card text-fg-primary hover:bg-bg-elev'
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-fg-muted">
          Plan anual Pro (~69 €/año) disponible en Stripe al contratar desde la aplicación.
        </p>
      </div>
    </PublicLayout>
  );
}
