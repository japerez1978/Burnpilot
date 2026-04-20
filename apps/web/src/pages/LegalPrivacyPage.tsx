import { PublicLayout } from '@/components/layout/PublicLayout';

export function LegalPrivacyPage() {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 py-14 text-sm leading-relaxed text-fg-muted">
        <p className="rounded-lg border border-accent-amber/30 bg-bg-card px-3 py-2 text-xs text-accent-amber">
          Borrador para revisión legal. No sustituye asesoramiento jurídico. Adaptar antes de producción.
        </p>
        <h1 className="mt-8 text-2xl font-bold text-fg-primary">Política de privacidad</h1>
        <p className="mt-4">
          <strong className="text-fg-primary">Responsable:</strong> BurnPilot (proyecto en desarrollo). Contacto:
          hello@burnpilot.app (cuando esté operativo).
        </p>
        <h2 className="mt-8 text-lg font-semibold text-fg-primary">Datos que tratamos</h2>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Cuenta: email y datos de perfil que introduzcas (nombre, moneda, presupuesto).</li>
          <li>Uso del producto: herramientas, proyectos y métricas asociadas en Supabase.</li>
          <li>Pagos: datos gestionados por Stripe según su política; BurnPilot no almacena PAN completos.</li>
        </ul>
        <h2 className="mt-8 text-lg font-semibold text-fg-primary">Finalidad y base</h2>
        <p className="mt-2">
          Prestación del servicio, facturación, soporte y mejora del producto. Base: ejecución del contrato,
          interés legítimo (seguridad y analítica agregada) y consentimiento cuando corresponda.
        </p>
        <h2 className="mt-8 text-lg font-semibold text-fg-primary">Conservación</h2>
        <p className="mt-2">
          Mientras la cuenta esté activa y el tiempo necesario para obligaciones legales. El borrado de cuenta
          elimina datos de aplicación según el flujo implementado en backend.
        </p>
        <h2 className="mt-8 text-lg font-semibold text-fg-primary">Derechos</h2>
        <p className="mt-2">
          Acceso, rectificación, supresión, limitación, portabilidad y oposición según RGPD. Ejercicio: contacto
          en el email indicado.
        </p>
        <h2 className="mt-8 text-lg font-semibold text-fg-primary">Cookies y analítica</h2>
        <p className="mt-2">
          Si activas Umami u otras herramientas, informa de ello en el banner de cookies y ajusta esta sección.
        </p>
      </article>
    </PublicLayout>
  );
}
