# BurnPilot — último snapshot para nuevo chat

> Generado para traspaso de contexto. **Sin secretos.**  
> **Fecha snapshot:** 2026-04-19

## Producto

- **BurnPilot**: SaaS B2C spend optimizer; `user_id` vía RLS.
- **Plan maestro:** `docs/burnpilot_plan.md` v1.3.
- **Sprints 0–7 (MVP código):** cerrados en repo; detalle Sprint 6–7 en `docs/sprint6_closeout.md` y `docs/sprint7_closeout.md`.

## Stack

- **Front:** React 19, Vite, TS, Tailwind, TanStack Query, Supabase JS **2.49.1**, Recharts, **@sentry/react** (opcional con `VITE_SENTRY_DSN`), Umami opcional (`VITE_UMAMI_WEBSITE_ID`).
- **API:** Express — health, billing, webhooks, cuenta.
- **DB:** Supabase; migraciones **18 → 30** en orden.

## Rutas públicas nuevas (Sprint 7)

`/`, `/pricing`, `/faq`, `/legal/privacy`, `/legal/terms` — usan `PublicLayout` (nav + footer).

## Siguiente

- **Operativa:** seguir [docs/GO_LIVE_PASO_A_PASO.md](GO_LIVE_PASO_A_PASO.md); validar env local con `npm run go-live:check`. Resumen en `docs/runbook.md` § Go-live.

## Local

```bash
npm run dev
```

- `apps/web/.env.local`: `VITE_SUPABASE_*`, `VITE_API_URL`, opcional `VITE_SENTRY_DSN`, `VITE_UMAMI_WEBSITE_ID`.

## Notas

- Estado: **[docs/STATUS.md](../STATUS.md)**.
- Especificación: **[AGENTS.md](../../AGENTS.md)**.
