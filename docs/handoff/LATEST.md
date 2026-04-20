# BurnPilot — último snapshot para nuevo chat

> Generado para traspaso de contexto. **Sin secretos.**  
> **Fecha snapshot:** 2026-04-19

## Producto

- **BurnPilot**: SaaS B2C spend optimizer; `user_id` vía RLS.
- **Plan maestro:** `docs/burnpilot_plan.md` v1.3.
- **Backlog MoSCoW (no ejecutable por omisión):** `docs/product_backlog_moscow.md`.

## Stack

- **Front:** React 19, Vite, TS, Tailwind, Zustand, TanStack Query, RHF+Zod, react-router, Supabase JS **2.49.1**, Recharts.
- **API:** Express — `/health`, billing Stripe, webhooks, **`DELETE /v1/account`** (JWT + service role; purge antes de Auth).
- **DB/Auth:** Supabase. Migraciones **18 → 30** en orden (ver [docs/STATUS.md](../STATUS.md)); **29–30** = Sprint 6 (snapshots + recommended stacks).
- **Deploy:** Netlify (web), Railway (API).

## Repo Git

- Rama **`main`**; sincronizar con remoto tras cada hito.
- Remoto habitual: `https://github.com/japerez1978/burnpilot.git`.

## Hecho hasta esta sesión

- **Sprints 0–6 cerrados en código.** Detalle Sprint 6: [docs/sprint6_closeout.md](../sprint6_closeout.md).
- **Sprint 5:** Stripe, `/settings/billing`, `plan_tier` + API con `SUPABASE_URL` base (sin `/rest/v1/`) y `SUPABASE_ANON_KEY` alineada al front.
- **Sprint 6:** `/stacks` (biblioteca + `stack_comparison`), histórico global en `/dashboard`, CSV Pro en cuenta, enlaces “Añadir sugerida” → `/tools?prefillName&assignProject`.
- **Estado vivo:** [docs/STATUS.md](../STATUS.md).

## Siguiente

- **Sprint 7:** landing + go-live (plan maestro §19).

## Rutas web útiles

`/`, `/login`, `/register`, `/auth/*`, `/onboarding`, `/dashboard`, `/projects/:id`, `/tools`, `/stacks`, `/savings`, `/settings/account`, `/settings/billing`

## Local

```bash
npm run dev                       # web + api
npm run dev -w @burnpilot/web    # solo front
```

- `apps/web/.env.local`: `VITE_SUPABASE_*`, **`VITE_API_URL=http://localhost:3000`**
- `apps/api/.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (= web), `SUPABASE_SERVICE_ROLE_KEY`, Stripe según billing. No subir al repo.

## Notas

- Especificación: **[AGENTS.md](../../AGENTS.md)** (P1–P14).
- Operativa: **[docs/runbook.md](../runbook.md)**.
