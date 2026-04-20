# BurnPilot — entorno de producción (referencia)

> **Sin secretos.** Solo topología, URLs públicas y convenciones.  
> **Última revisión:** 2026-04-20

## Resumen

MVP desplegado y probado end-to-end: **web (Netlify)** ↔ **Supabase (Auth + Postgres)** ↔ **API (Railway)** ↔ **Stripe (webhooks)**.

## Componentes

| Capa | Servicio / rol | Notas |
|------|-----------------|--------|
| Frontend | Netlify | Build: `npm ci && npm run build -w @burnpilot/web`; publish `apps/web/dist`. Ver `apps/web/netlify.toml`. |
| API | Railway | Servicio Node (`@burnpilot/api`); arranque `node apps/api/dist/server.js`. Ver `railway.json` en raíz. |
| Dominio API | `api.burnpilot.app` | HTTPS; health: `GET /health` → JSON `ok`, `service: burnpilot-api`. |
| Auth + DB | Supabase | Proyecto dedicado; migraciones `supabase/migrations/` en orden. |
| Pagos | Stripe | Webhook **POST** ruta fija: **`/webhooks/stripe`** (no `/api/...`). Modo test o live según fase. |

## Variables (dónde viven)

| Dónde | Archivo local de referencia | En el panel |
|-------|-----------------------------|-------------|
| Web | `apps/web/.env.example` | Netlify → Environment variables (`VITE_*`) |
| API | `apps/api/.env.example` | Railway → Variables del servicio API |

Validación local antes de copiar: `npm run go-live:check` y `npm run go-live:check -- --production`.

## Stripe webhook

- **Ruta en código:** `POST /webhooks/stripe` (`apps/api/src/server.ts`).
- **URL completa de ejemplo:** `https://<host-público-de-la-api>/webhooks/stripe`.
- Puede usarse el dominio **`.up.railway.app`** del servicio o un dominio custom (**`api.burnpilot.app`**) si ambos apuntan al **mismo** despliegue.
- El **Signing secret** (`whsec_...`) es **por destino** en Stripe; debe coincidir con **`STRIPE_WEBHOOK_SECRET`** en Railway para ese mismo host.
- Eventos soportados por la API: ver comentarios en `apps/api/src/routes/stripeWebhook.ts` (`checkout.session.completed`, suscripciones, `invoice.paid`, `invoice.payment_failed`, etc.).

## Supabase Auth (URLs)

- **Site URL** y **Redirect URLs** deben incluir la URL **HTTPS** del front en producción (Netlify o dominio custom), no la de la API.

## CORS (API)

- **`ALLOWED_ORIGIN`** en Railway debe ser **exactamente** el origen del front (esquema + host, sin path; sin barra final salvo que el código espere otra cosa).

## Documentación relacionada

- [GO_LIVE_PASO_A_PASO.md](GO_LIVE_PASO_A_PASO.md) — orden de configuración.
- [runbook.md](runbook.md) — incidentes, rollback, backups.
- [sprint7_closeout.md](sprint7_closeout.md) — cierre Sprint 7 + operativa.

## No incluido aquí

Claves, tokens, DSN ni contenido de `.env` / paneles: **nunca** en el repo.
