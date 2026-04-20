/**
 * Origen base para redirects de Supabase Auth (recovery, OAuth, confirmación).
 * Debe existir en Supabase → Authentication → URL Configuration (Redirect URLs),
 * mismo host/puerto/protocolo que uses en el navegador.
 *
 * Si entras con `127.0.0.1` y en Supabase solo tienes `localhost` (o al revés), Auth falla.
 * Opcional en `.env.local`: `VITE_AUTH_SITE_ORIGIN=http://localhost:5173` para forzar un solo origen.
 */
export function getAuthSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_AUTH_SITE_ORIGIN?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}
