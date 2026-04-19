# BurnPilot — último snapshot para nuevo chat

> Generado para traspaso de contexto. **Sin secretos.**  
> **Fecha snapshot:** 2026-04-20

## Producto

- **BurnPilot**: SaaS B2C spend optimizer; `user_id` vía RLS.
- **Plan maestro:** `docs/burnpilot_plan.md` v1.3.
- **Backlog MoSCoW (no ejecutable por omisión):** `docs/product_backlog_moscow.md`.

## Stack

- **Front:** React 19, Vite, TS, Tailwind, Zustand, TanStack Query, RHF+Zod, react-router, Supabase JS **2.49.1**, Recharts.
- **API:** Express — `/health`, **`DELETE /v1/account`** (JWT + service role; purge `tools` / `projects` / `profiles` antes de Auth).
- **DB/Auth:** Supabase (Postgres + Auth). Migraciones **18 → 26** en orden en el proyecto activo (ver lista en [docs/STATUS.md](../STATUS.md)).
- **Deploy:** Netlify (web), Railway (API); foco local reciente.

## Repo Git

- **`main`** en GitHub sincronizado con el remoto (último push conocido: `c2b95a4` — *feat(burnpilot): web app, API cuenta, Supabase y documentación*).
- Remoto: `https://github.com/japerez1978/burnpilot.git` (si GitHub sugiere otra URL por rename del repo, es equivalente).

## Hecho hasta esta sesión

- **Sprints 0–4** cerrados en código; **Sprint 5** (Stripe) es el siguiente cuando se retome.
- **Cuenta:** borrado extremo a extremo verificado en local (204). API: `loadEnv`, CORS dev, purge antes de `deleteUser`.
- **Herramientas (`/tools`):** columna Estado con colores; orden fijo prueba→activa→…→cancelada; **filtro** multi-estado; coste mensual centrado; **importe 0 / vacío** = plan gratuito (requiere migración `amount_cents >= 0`).
- **Catálogo:** categorías ampliadas (9–16) + **17 Frontend / despliegue**; plantillas actualizadas (ver migraciones 23–26).
- **Dashboard:** contraste del tooltip del pie «Por categoría».
- **Normas:** P12 en [AGENTS.md](../AGENTS.md); detalle en [docs/STATUS.md](../STATUS.md).
- **`.gitignore`:** `**/.obsidian/` (no versionar vault Obsidian bajo `docs/`).

## Siguiente

- **Sprint 5:** Stripe (Checkout, webhooks, `plan_tier` / portal) — solo con aprobación explícita; no implementar desde backlog MoSCoW sin OK.

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
- Operativa / troubleshooting: **[docs/runbook.md](../runbook.md)**.
