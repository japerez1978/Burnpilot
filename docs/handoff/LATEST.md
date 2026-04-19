# BurnPilot — último snapshot para nuevo chat

> Generado para traspaso de contexto. **Sin secretos.**  
> **Fecha snapshot:** 2026-04-19 (cierre de bloque Sprints 0–4; desarrollo por sprints en **pausa** hasta nueva sesión)

## Producto

- **BurnPilot**: SaaS B2C spend optimizer; `user_id` vía RLS.
- **Plan maestro:** `docs/burnpilot_plan.md` v1.3.
- **Backlog MoSCoW (no ejecutable por omisión):** `docs/product_backlog_moscow.md`.

## Stack

- **Front:** React 19, Vite, TS, Tailwind, Zustand, TanStack Query, RHF+Zod, react-router, Supabase JS **2.49.1**, Recharts.
- **API:** Express — `/health`, **`DELETE /v1/account`** (JWT + service role; purge `tools` / `projects` / `profiles` antes de Auth).
- **DB/Auth:** Supabase (Postgres + Auth). Migraciones **18 → 22** en orden en el proyecto activo.
- **Deploy:** Netlify (web), Railway (API); foco local reciente.

## Hecho hasta esta sesión

- **Sprints 0–4** cerrados en código; **Sprint 5** (Stripe) es el siguiente cuando se retome.
- **Cuenta:** borrado extremo a extremo **verificado en local** (204). API: **`apps/api/src/loadEnv.ts`** (`dotenv`, rutas `.env` según cwd monorepo), CORS dev `localhost` + `127.0.0.1`, purge en `account` antes de `auth.admin.deleteUser`.
- **Normas:** **P12** hardening en [AGENTS.md](../AGENTS.md); cierre documentado en [docs/STATUS.md](../STATUS.md) § *Hardening de cierre*.

## Siguiente

- **Sprint 5:** Stripe (Checkout, webhooks, `plan_tier` / portal) — solo cuando el fundador retome; no asumir scope desde el backlog MoSCoW sin aprobación explícita.

## Rutas web útiles

`/`, `/login`, `/register`, `/auth/*`, `/onboarding`, `/dashboard`, `/projects/:id`, `/tools`, `/savings`, `/settings/account`

## Local

```bash
npm run dev                       # web + api (recomendado; borrado cuenta)
npm run dev -w @burnpilot/web    # solo front
```

- `apps/web/.env.local`: `VITE_SUPABASE_*`, **`VITE_API_URL=http://localhost:3000`**
- `apps/api/.env`: `SUPABASE_URL`, **`SUPABASE_SERVICE_ROLE_KEY`** (mismo proyecto Supabase que el front). No subir al repo.

## Notas

- Estado vivo: **[docs/STATUS.md](../STATUS.md)**.
- Especificación: **[AGENTS.md](../AGENTS.md)** (P1–P14).
