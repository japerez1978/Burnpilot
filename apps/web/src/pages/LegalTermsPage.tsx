import { PublicLayout } from '@/components/layout/PublicLayout';

export function LegalTermsPage() {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 py-14 text-sm leading-relaxed text-fg-muted">
        <p className="rounded-lg border border-accent-amber/30 bg-bg-card px-3 py-2 text-xs text-accent-amber">
          Borrador para revisión legal. No sustituye asesoramiento jurídico. Adaptar antes de producción.
        </p>
        <h1 className="mt-8 text-2xl font-bold text-fg-primary">Términos de uso</h1>
        <p className="mt-4">
          Al usar BurnPilot aceptas estos términos. El servicio se ofrece en el estado en que se encuentra;
          mejoras y cambios se publicarán razonablemente en la aplicación o documentación.
        </p>
        <h2 className="mt-8 text-lg font-semibold text-fg-primary">Cuenta</h2>
        <p className="mt-2">
          Eres responsable de la confidencialidad de tu acceso. Debes proporcionar datos veraces para
          facturación cuando contrates planes de pago.
        </p>
        <h2 className="mt-8 text-lg font-semibold text-fg-primary">Uso aceptable</h2>
        <p className="mt-2">
          No uses el servicio para actividades ilegales, abusivas o que comprometan la seguridad de la
          plataforma o de terceros.
        </p>
        <h2 className="mt-8 text-lg font-semibold text-fg-primary">Planes y pagos</h2>
        <p className="mt-2">
          Los importes y renovaciones se gestionan vía Stripe. Los reembolsos y disputas siguen las políticas
          aplicables y las condiciones mostradas en el checkout.
        </p>
        <h2 className="mt-8 text-lg font-semibold text-fg-primary">Limitación de responsabilidad</h2>
        <p className="mt-2">
          BurnPilot no garantiza resultados financieros. Las estimaciones de ahorro o burn son orientativas.
          En la medida permitida por ley, la responsabilidad total se limita a lo que hayas pagado en los
          últimos doce meses por el servicio.
        </p>
        <h2 className="mt-8 text-lg font-semibold text-fg-primary">Ley aplicable</h2>
        <p className="mt-2">
          Leyes del Estado en que opere la entidad titular, sin perjuicio de derechos imperativos del
          consumidor en tu país de residencia. Completa jurisdicción y idioma según asesoramiento legal.
        </p>
      </article>
    </PublicLayout>
  );
}
