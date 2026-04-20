# BurnPilot — estado operativo

> **Propósito:** handoff rápido entre herramientas, agentes o personas.  
> **Mantenimiento:** ver § *Política de mantenimiento* al final (equilibrio eficacia / precisión).

**Última actualización:** 2026-04-20

---

## Resumen en una frase

**Sprints 0–7** cubiertos en código para el alcance MVP: landing pública, precios, FAQ, legales (borrador), Sentry/Umami opcionales ([docs/sprint7_closeout.md](sprint7_closeout.md)). **Go-live operativo** (2026-04-20): API `api.burnpilot.app`, Netlify + Supabase Auth + Stripe webhook `/webhooks/stripe`; referencia [production_environment.md](production_environment.md). Guía de despliegue: [GO_LIVE_PASO_A_PASO.md](GO_LIVE_PASO_A_PASO.md) + `npm run go-live:check`; incidentes en [runbook](runbook.md).

**Repo GitHub:** `main` sincronizado con `origin` (p. ej. commit `212e591` — docs go-live). Remoto: `https://github.com/japerez1978/Burnpilot.git`.

**Siguiente:** [Sprint 8](sprint8_scope.md) — legal definitivo, Stripe Live, observabilidad, backups.

---

## Sprint cerrado o estable

| Sprint | Estado | Notas |
|--------|--------|--------|
| **Sprint 0** | Hecho | Monorepo, web + API `/health`, deploy inicial (Netlify/Railway según contexto), branding BurnPilot. |
| **Sprint 1** | Hecho en local | Supabase proyecto dedicado, migración `profiles`, Auth (email + Google opcional), login/register/forgot/reset/callback, dashboard, **`/settings/account`** (nombre, moneda, presupuesto). Resend + SMTP Supabase verificado por el fundador. |
| **Sprint 2** | Hecho (ver QA RLS) | Migración `20250420000001_tools_projects_categories.sql` + web tools/proyectos. |
| **Sprint 3** | Hecho (SQL + app) | `20250421000001_dashboard_rpc.sql`: KPIs, **`/dashboard`**, **`/projects/:id`**, Recharts. |
| **Sprint 4** | Hecho (SQL + app + QA local) | Alertas, **`/savings`**, onboarding, **`DELETE /v1/account`** (purge `public.*` + Auth); API con `loadEnv`, CORS dev. Ver § *Hardening de cierre* abajo. |
| **Sprint 5** | Hecho en repo | Stripe Checkout / Portal / webhook, **`/settings/billing`**, `subscriptions_billing`; gating según `plan_tier`. |
| **Sprint 6** | Hecho (SECONDARY) | Stacks: migraciones **29–30**, **`/stacks`**, `stack_comparison`, “Aplicar” vía enlace a **`/tools`** con `prefillName` + `assignProject`; dashboard: histórico global 6m; CSV Pro en cuenta. Detalle: [docs/sprint6_closeout.md](sprint6_closeout.md). |
| **Sprint 7** | Hecho + **prod verificada** | Igual que arriba + despliegue real documentado en [production_environment.md](production_environment.md). |

---

## Sprint en curso / siguiente

| Prioridad | Sprint | Objetivo |
|-----------|--------|----------|
| **Siguiente** | **Sprint 8** | Post-MVP: legal definitivo, Stripe Live, monitores, backups verificados, hardening ligero. Detalle: [docs/sprint8_scope.md](sprint8_scope.md). |

**Congelado / fuera de plan actual:** agente n8n + scraping + BurnIntel → [docs/future/burnintel-n8n-agent.md](future/burnintel-n8n-agent.md).

---

## Código y rutas útiles (web)

- `/` — landing (valor + comparativa vs Rocket Money + CTA)  
- `/pricing`, `/faq` — marketing  
- `/legal/privacy`, `/legal/terms` — borradores legales (revisar antes de producción)  
- `/login`, `/register`, `/auth/forgot`, `/auth/reset`, `/auth/callback`  
- `/onboarding` — primera vez (tras login si `onboarding_completed_at` es null)  
- `/dashboard` — KPIs globales (`rpc dashboard_summary`) + alertas; tooltip del gráfico «Por categoría» con texto legible (label/item claros)  
- `/projects/:id` — burn del proyecto + alertas (`rpc project_summary`)  
- `/tools` — CRUD herramientas (requiere sesión): columna **Estado**, colores por estado, **filtro desplegable** multi-estado, coste mensual centrado, importe **0** o vacío = plan gratuito  
- `/savings` — plan de ahorro (`rpc savings_plan`)  
- `/stacks` — biblioteca Recommended Stacks + comparar con un proyecto (`rpc stack_comparison`)  
- `/settings/account` — perfil + **export CSV** (Pro/Lifetime) + **eliminar cuenta** (requiere API con service role)

**Migraciones (aplicar en orden en Supabase):**  
`20250418000001_init_profiles.sql` → `public.profiles`  
`20250420000001_tools_projects_categories.sql` → catálogo + `projects`, `tools`, `project_tools`, etc.  
`20250421000001_dashboard_rpc.sql` → RPC dashboard + helpers  
`20250422000001_sprint4_alerts_savings.sql` → `compute_alerts`, `savings_plan`, alertas en RPCs, backfill onboarding  
`20250423000001_expand_tool_categories.sql` → categorías 9–16 + plantillas  
`20250424000001_category_frontend_deploy.sql` → categoría 17 «Frontend / despliegue» + plantillas Vercel/Netlify/CF  
`20250425000001_tools_allow_zero_amount.sql` → `amount_cents >= 0` (planes free)  
`20250426000001_ensure_category_front_deploy.sql` → idempotente por si faltó la 240 (categoría 17 + `UPDATE` plantillas)  
`20250429000001_sprint6_stack_snapshots.sql` → `stack_snapshots`, `project_history`, `dashboard_history` (histórico real)  
`20250430000001_recommended_stacks.sql` → `recommended_stacks`, ítems, `stack_comparison`

**API (Railway / local):** `DELETE /v1/account` — JWT en header; en servidor: purge ordenado de `tools` → `projects` → `profiles`, luego `auth.admin.deleteUser`. Variables: `apps/api/.env` cargado vía **`src/loadEnv.ts`** (varias rutas posibles según `cwd` del monorepo).

---

## Hardening de cierre (P12) — 2026-04-19

Activación: **cierre de bloque de sprints** + zona sensible (**borrado de cuenta**, API + Supabase). Nivel: **ligero** (calidad del bloque tocado).

| Entregable P12 | Contenido breve |
|----------------|-----------------|
| **Diagnóstico** | Sprints 0–4 coherentes con plan; entorno local estable tras ajustes API (dotenv, CORS, purge previo a `deleteUser`). |
| **Hallazgos (prioridad)** | (1) Node no inyecta `.env` solo → `loadEnv.ts` + dependencia `dotenv`. (2) `deleteUser` fallaba con “Database error…” → purge explícito en `public.*`. (3) *Futuro:* nuevas tablas con `user_id` deben CASCADE o sumarse al purge. |
| **Criterio de terminado** | Borrado de cuenta OK en local (204); documentación STATUS/handoff actualizada; sin tarea de código abierta en este bloque. |
| **Recomendación** | **Seguir construyendo** cuando retome: **Sprint 5**; antes de producción, **hardening completo** (§P12) + env Railway + revisión webhooks Stripe. |

---

## Local

```bash
npm run dev -w @burnpilot/web    # solo front
# o
npm run dev                       # web + api (necesario para borrar cuenta)
```

- Front: `http://localhost:5173` · API: `http://localhost:3000` (por defecto en `apps/api`)  
- Web: `apps/web/.env.local` — `VITE_SUPABASE_*`, **`VITE_API_URL=http://localhost:3000`** (para borrado de cuenta y cualquier llamada al backend).  
- API: `apps/api/.env` — `SUPABASE_URL`, **`SUPABASE_SERVICE_ROLE_KEY`** (Dashboard Supabase → Settings → API; **no** usar en el front). **`loadEnv.ts`** resuelve el `.env` aunque `npm run dev` arranque desde la raíz del monorepo.  
- Vite carga `.env.local` desde `apps/web` (`envDir` en `vite.config.ts`).

### Probar borrado de cuenta (local)

1. Arranca **web + API**: `npm run dev` (o dos terminales: `dev:web` y `dev:api`).  
2. En `apps/api/.env`, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del **mismo** proyecto que el front.  
3. En `apps/web/.env.local`, `VITE_API_URL=http://localhost:3000` (mismo origen que escucha Express).  
4. Crea una cuenta de prueba (o usa una desechable), entra a **Cuenta** → Zona peligrosa → **Eliminar cuenta** y confirma.  
5. Debe responder **204**, cerrar sesión y volver al home; en Supabase → **Authentication → Users** el usuario debe desaparecer.  
6. Si ves error de configuración: API no arrancada, `VITE_API_URL` mal, o falta service role → revisa logs de la API.

---

## Despliegue / operativa (contexto)

- **Producción app:** prioridad pausada a petición del fundador; foco **local** hasta nueva orden.  
- **Dominio:** `burnpilot.app`, API `api.burnpilot.app` (según configuración previa).  
- **Netlify:** build workspace `@burnpilot/web` (ver `apps/web/netlify.toml`).

---

## Bloqueos conocidos

- Ninguno conocido en **local** si migraciones **18–26** están aplicadas en Supabase y borrado de cuenta verificado.  
- **Producción:** API en Railway debe definir las mismas vars que en local; front debe usar `VITE_API_URL` apuntando al dominio de la API.

---

## Documentos de referencia

| Doc | Uso |
|-----|-----|
| [AGENTS.md](../AGENTS.md) | Especificación P1–P14 del proyecto |
| [product_backlog_moscow.md](product_backlog_moscow.md) | Backlog MoSCoW (ideas; no es scope hasta promoción explícita) |
| [burnpilot_plan.md](burnpilot_plan.md) | Plan maestro v1.3 |
| [sprint6_closeout.md](sprint6_closeout.md) | Cierre Sprint 6 (entregables + operativa) |
| [sprint7_closeout.md](sprint7_closeout.md) | Cierre Sprint 7 (landing + observabilidad + runbook) |
| [future/burnintel-n8n-agent.md](future/burnintel-n8n-agent.md) | Idea archivada |
| [runbook.md](runbook.md) | Operativa / troubleshooting |

---

## Criterio de éxito inmediato (cuando se retome)

1. **Producción:** completar checklist [runbook § Go-live](runbook.md) (env, Stripe live, legal revisado, backups).  
2. Migraciones **29–30** en Supabase del entorno que despliegues.

---

## Política de mantenimiento (agentes / desatendido)

Objetivo: **mantener este doc útil sin reescribirlo en cada mensaje** ni gastar ciclos en cambios que no alteran el “estado del proyecto”.

### Sí actualizar `STATUS.md` (un commit lógico al cierre del bloque)

- Cambia el **sprint** declarado (cerrado uno, empieza otro, o se **congela** el actual).
- Aparece o se resuelve un **bloqueo** que afecta al siguiente paso (deploy, Supabase, CI, etc.).
- Cambia la **estrategia operativa** acordada (p. ej. “solo local” ↔ “deploy producción”, dominio, proveedor).
- Se añade una **migración** o **ruta** relevante para handoff (tabla nueva, pantalla nueva en CORE).
- El fundador **cierra una fase** (“hasta aquí hoy”) y el resumen de una frase debe reflejarlo.

En esos casos: edita las tablas/secciones afectadas y **bump** de `**Última actualización:**` a la fecha real (YYYY-MM-DD).

### No hace falta tocar `STATUS.md`

- Cambios **solo de código** sin impacto en sprint, rutas, migraciones o bloqueos (refactors, estilo, tests).
- Dudas, lectura de archivos o **una sola línea** corregida sin cambio de plan.
- Iteración intra-sesión: **agrupa**; no hace falta guardar tras cada tool call.

### README.md

- **No** sincronizar con `STATUS` en cada cambio.
- Tocar `README.md` solo si cambia **estructura del repo**, comandos de arranque, o enlaces de documentación de primer nivel.

### Seguridad del contenido

- **Nunca** pegar API keys, tokens, contenido de `.env.local`, ni secretos de Supabase/Stripe.
- URLs públicas del proyecto y nombres de tablas/rutas: sí.

### AGENTS.md

- **P12 (Hardening):** protocolo obligatorio — disparadores, modo revisión y salida en §P12 del [AGENTS.md](../AGENTS.md); activar al cerrar sprint relevante o antes de deploy serio.
- **P13 (Notas técnicas):** decisiones **de producto o arquitectura** duraderas → una línea en **P13**, no repetir todo el detalle que ya está aquí.

### Resumen para el agente

| Frecuencia | Acción |
|------------|--------|
| Alta (varias veces en un turno largo) | **Una** actualización de `STATUS` al final si hubo cambio material; si no, ninguna. |
| Media (cierre de sprint / hito) | Actualizar sí o sí + fecha. |
| Baja (solo chat, sin cambio de hechos) | No tocar. |

### Traspaso entre chats (límite de contexto)

- Regla práctica y plantilla: **[docs/AGENT_CHAT_HANDOFF.md](AGENT_CHAT_HANDOFF.md)**.
- Snapshot pegable para el siguiente hilo: **[docs/handoff/LATEST.md](handoff/LATEST.md)** (actualizar al cerrar sesión / traspaso, sin secretos).
