import * as Sentry from '@sentry/react';

/**
 * Inicialización opcional: Sentry (errores) y Umami (analytics).
 * Solo carga si las variables están definidas en `.env.local`.
 */
export function initObservability(): void {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
  if (dsn) {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      sendDefaultPii: false,
      integrations: [Sentry.browserTracingIntegration({ traceFetch: true }), Sentry.replayIntegration()],
      tracesSampleRate: import.meta.env.PROD ? 0.12 : 1,
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1,
    });
  }

  const umamiId = (import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined)?.trim();
  if (umamiId && typeof document !== 'undefined') {
    if (document.querySelector(`script[data-website-id="${umamiId}"]`)) return;
    const s = document.createElement('script');
    s.defer = true;
    s.src = 'https://cloud.umami.is/script.js';
    s.setAttribute('data-website-id', umamiId);
    document.body.appendChild(s);
  }
}
