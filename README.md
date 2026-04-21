# BurnPilot

SaaS spend optimizer para builders no técnicos. Monorepo gestionado con NPM Workspaces.

## Estructura

  - `apps/web` — Frontend React + Vite (Netlify, `app.burnpilot.app`)
- `apps/api` — Backend thin Express (Railway, `api.burnpilot.app`)
- `packages/types` — Zod schemas y tipos compartidos front ↔ back
- `packages/utils` — utilidades puras (money, fx, dates, **Roadmappilot / stackos scoring**)
- `supabase/` — migraciones SQL + seeds + functions
- `docs/` — plan maestro, STATUS operativo, runbook ([docs/burnpilot_plan.md](docs/burnpilot_plan.md), [docs/STATUS.md](docs/STATUS.md))

## Requisitos

- Node.js ≥ 20 (ver `.nvmrc`)
- NPM ≥ 10

## Arranque local

```bash
nvm use
npm install
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000/health

## Scripts disponibles

- `npm run dev` — arranca web + api en paralelo
- `npm run build` — build de todos los workspaces
- `npm run typecheck` — TypeScript check en todos los workspaces
- `npm run lint` — ESLint sobre apps y packages
- `npm run format` — Prettier write

## Despliegue

- **Frontend**: Netlify, autodeploy desde `main` → `app.burnpilot.app`
- **Backend**: Railway → `api.burnpilot.app`
- **DB + Auth**: Supabase (eu-west-1)

**Checklist guiada (orden Supabase → Railway → Netlify → Stripe):** [docs/GO_LIVE_PASO_A_PASO.md](docs/GO_LIVE_PASO_A_PASO.md). Antes de copiar variables a los paneles:

```bash
npm run go-live:check
npm run go-live:check -- --production
```

## Documentación interna

- **[docs/STATUS.md](docs/STATUS.md)** — estado del sprint y handoff; al final, **política de mantenimiento**
- **[docs/production_environment.md](docs/production_environment.md)** — topología de producción (sin secretos); **[docs/sprint8_scope.md](docs/sprint8_scope.md)** — siguiente iteración
- **[docs/AGENT_CHAT_HANDOFF.md](docs/AGENT_CHAT_HANDOFF.md)** — traspaso entre chats / límite de contexto; **[docs/handoff/LATEST.md](docs/handoff/LATEST.md)** — snapshot para pegar en un chat nuevo
- [docs/burnpilot_plan.md](docs/burnpilot_plan.md) — plan maestro v1.3
- [AGENTS.md](AGENTS.md) — especificación del proyecto (P1–P14)
- [docs/agents/AGENTS.md](docs/agents/AGENTS.md) — estándar Leadstodeals
- [docs/cursorrules.txt](docs/cursorrules.txt) — reglas operativas
