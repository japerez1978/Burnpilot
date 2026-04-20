# BurnPilot Runbook

> Qué hacer cuando algo falla. Se rellena con casos reales durante el desarrollo.

## Git / GitHub

- Remoto habitual: `https://github.com/japerez1978/burnpilot.git`. Si `git push` muestra aviso de *repository moved* hacia `Burnpilot.git`, puedes alinear: `git remote set-url origin https://github.com/japerez1978/Burnpilot.git`.
- No commitear `.env` / `.env.local` (están en `.gitignore`). Obsidian bajo `docs/`: carpeta `.obsidian/` ignorada (`**/.obsidian/` en `.gitignore`).

## Dashboards / accesos

- Netlify: https://app.netlify.com
- Railway: https://railway.app
- Supabase: https://supabase.com/dashboard
- Stripe: https://dashboard.stripe.com
- Cloudflare: https://dash.cloudflare.com
- Sentry: https://sentry.io
- Better Stack: https://betterstack.com
- Umami: https://cloud.umami.is

## Webhook Stripe

- Endpoint producción: `https://api.burnpilot.app/webhooks/stripe`
- Si Better Stack avisa de `stripe_events.processed_at IS NULL > 5 min`:
  1. Revisar Railway logs del último webhook.
  2. Stripe Dashboard → Developers → Webhooks → ver intentos y payloads.
  3. Si idempotencia colisionó mal, borrar fila de `stripe_events` afectada y Stripe reintentará al próximo retry.

## FX desactualizado

- Cron diario llama a `POST /cron/fx-refresh`.
- Si `max(captured_at) < now() - 48h`, alerta activa.
- Manual: ejecutar `UPDATE fx_rates SET rate=..., captured_at=now() WHERE ...` desde Supabase Studio.

## Rollback de deploy

- **Netlify**: Deploys → seleccionar deploy estable anterior → "Publish deploy".
- **Railway**: Deployments → ••• → "Rollback to this deployment".

## Backups Supabase

- `pg_dump` mensual manual hasta que añadamos cron. Comando:
  ```bash
  pg_dump "$SUPABASE_DB_URL" -f burnrate_$(date +%Y%m%d).sql
  ```
- **Antes del go-live**: hacer un test de restore completo en staging.

## Soporte a un usuario

- Password reset: Supabase Studio → Authentication → Users → ••• → "Send password recovery".
- Ver herramientas / proyectos: `supabase.from('tools').select('*').eq('user_id', 'UUID')` vía Studio.
- Cambiar plan manual: update directo en `profiles.plan`. Usar solo para casos especiales.

## Checklist post-incidente

1. Identificar causa raíz (log + Sentry + Stripe logs).
2. Aplicar fix en `develop` → PR → merge a `main`.
3. Verificar CI Exit 0 y deploy limpio.
4. Anotar en este runbook en la sección del componente afectado.
5. Si afectó a usuarios, email transparente desde `hello@burnpilot.app`.

## Go-live (Sprint 7)

**Paso a paso detallado:** [GO_LIVE_PASO_A_PASO.md](GO_LIVE_PASO_A_PASO.md) (Supabase → Railway → Netlify → Stripe → smoke test).

Antes de abrir tráfico público serio:

1. **Dominio:** DNS (Cloudflare) apuntando a Netlify (web) y Railway/API; SSL activo.
2. **Variables:** `apps/web` en Netlify con `VITE_SUPABASE_*`, `VITE_API_URL`, opcional `VITE_SENTRY_DSN`, `VITE_UMAMI_WEBSITE_ID`. `apps/api` en Railway con mismas claves Supabase que producción + Stripe live cuando toque.
3. **Stripe:** modo live, webhook URL de producción y secretos alineados; probar checkout y portal.
4. **Legal:** revisar y sustituir borradores en `/legal/privacy` y `/legal/terms` con texto validado por asesoría.
5. **Observabilidad:** Sentry proyecto producción; Umami sitio producción; en Better Stack (o similar) monitor HTTP a `/health` de la API y URL pública de la web.
6. **Backup Supabase:** plan Pro; probar restore documentado en § *Backups Supabase* arriba antes de cargar datos reales críticos.
7. **Smoke test:** registro, onboarding, alta de tool, dashboard, facturación test con tarjeta Stripe test→live según fase.

## Front: analítica y errores

- **Sentry:** `VITE_SENTRY_DSN` en build del front (no commitear valor). Errores de runtime y sesiones replay según muestreo en `src/lib/observability.ts`.
- **Umami:** `VITE_UMAMI_WEBSITE_ID`; script cargado desde `cloud.umami.is`. Ajustar política de cookies en la landing/legal si aplica.
