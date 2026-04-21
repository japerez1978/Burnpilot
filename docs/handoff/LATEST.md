# BurnPilot — último snapshot para nuevo chat

> Generado para traspaso de contexto. **Sin secretos.**  
> **Fecha snapshot:** 2026-04-21

## Producto

- **BurnPilot**: SaaS B2C spend optimizer; `user_id` vía RLS.
- **Plan maestro:** `docs/burnpilot_plan.md` v1.3.
- **Sprints 0–7 (MVP código):** cerrados en repo; Sprint 7 con **go-live verificado** — ver `docs/production_environment.md`.
- **Sprint 8 (siguiente):** `docs/sprint8_scope.md` (legal, Stripe Live, observabilidad, backups).
- **Roadmappilot:** `docs/stackos-spec.md`; UI **`/roadmappilot`** en sidebar; **`/stacks`** solo biblioteca; migración **31** (`stackos_*`); API **`POST /v1/stackos/analyze`** + `ANTHROPIC_API_KEY` en Railway.

## Stack

- **Front:** React 19, Vite, TS, Tailwind, TanStack Query, Supabase JS **2.49.1**, Recharts, **@sentry/react** (opcional con `VITE_SENTRY_DSN`), Umami opcional (`VITE_UMAMI_WEBSITE_ID`).
- **API:** Express — health, billing, webhooks, cuenta, **Roadmappilot analyze** (Anthropic).
- **DB:** Supabase; migraciones **18 → 31** en orden (incl. `20250431000001_stackos_roadmap.sql`).

## Rutas públicas nuevas (Sprint 7)

`/`, `/pricing`, `/faq`, `/legal/privacy`, `/legal/terms` — usan `PublicLayout` (nav + footer).

## Siguiente

- **Sprint 8:** [docs/sprint8_scope.md](sprint8_scope.md).
- **Prod (referencia sin secretos):** [docs/production_environment.md](production_environment.md).

## Local

```bash
npm run dev
```

- `apps/web/.env.local`: `VITE_SUPABASE_*`, `VITE_API_URL`, opcional `VITE_SENTRY_DSN`, `VITE_UMAMI_WEBSITE_ID`.

## Notas

- Estado: **[docs/STATUS.md](../STATUS.md)**.
- Especificación: **[AGENTS.md](../../AGENTS.md)**.
