# AGENTS.md — BurnPilot

> Especificación concreta del proyecto BurnPilot siguiendo el estándar Leadstodeals.
> Las secciones globales 1–14 (stack, estructura, código, seguridad, git, performance, env, estado, logging, testing, checklists) viven en [docs/agents/AGENTS.md](docs/agents/AGENTS.md) y se aplican a este proyecto sin modificar.
> El plan maestro con posicionamiento, alcance y roadmap vive en [docs/burnpilot_plan.md](docs/burnpilot_plan.md) (v1.3).
>
> **Estado vivo (sprint, próximo paso, local/deploy):** [docs/STATUS.md](docs/STATUS.md).  
> Criterio de cuándo y con qué frecuencia actualizarlo: ver **§ Política de mantenimiento** al final de ese archivo (equilibrio eficacia / precisión).
>
> **Hardening y control de calidad (obligatorio):** § **P12** — no es optativo; se activa por disparadores explícitos, no por buena voluntad.
>
> **Backlog de producto (MoSCoW — lectura sí, implementación no automática):** [docs/product_backlog_moscow.md](docs/product_backlog_moscow.md). Inventario de ideas y prioridades **candidatas**; **no** es scope aprobado ni orden de implementación. La IA puede usarlo como **contexto estratégico** y para **proponer** roadmap o reclasificar; **no** debe implementar entradas **solo** porque figuren en el archivo. La implementación exige **aprobación explícita** del fundador y su reflejo en plan/sprint activo, `docs/STATUS.md` o instrucción explícita en la conversación.
>
> **Traspaso entre chats / límite de contexto:** [docs/AGENT_CHAT_HANDOFF.md](docs/AGENT_CHAT_HANDOFF.md) y snapshot [docs/handoff/LATEST.md](docs/handoff/LATEST.md).

---

## P1. IDENTIFICACIÓN

```
Proyecto:     BurnPilot
Cliente:      Interno Leadstodeals (producto propio)
Tenant ID:    N/A — SaaS B2C, aislación por user_id (no multi-tenant)
Descripción:  SaaS spend optimizer para builders no técnicos. Agrupa herramientas por proyecto, calcula burn rate, detecta redundancias y propone plan de recorte.
Tipo de app:  SaaS B2C
```

---

## P2. STACK CONCRETO DE ESTE PROYECTO

```
Frontend:      React 19 + Vite + TypeScript
Estilos:       Tailwind + shadcn/ui + Tremor + paleta trading dark
Backend:       Node 20 + Express + TypeScript en Railway (thin: billing, webhooks, crons, mail)
Base de datos: Supabase (Postgres + Auth + RLS por user_id). Región eu-west-1. Cliente JS pineado a 2.49.1
Auth:          Supabase Auth (email+password + Google OAuth + verificación obligatoria)
Estado global: Zustand (sesión, plan); TanStack Query para datos de servidor
Integraciones: Stripe (Checkout + Customer Portal + Webhook + Stripe Tax), Resend (email), Anthropic (Roadmappilot analyze, solo API Railway), agente HTTP externo opcional (Roadmappilot fase 2, `STACKOS_AGENT_URL`), Sentry, Better Stack (logs + uptime), Umami (analytics)
Hosting frontend: Netlify (divergencia consciente del estándar Leadstodeals que marca Vercel; ver P13)
Hosting backend:  Railway
DNS / CDN:        Cloudflare
```

---

## P3. INTEGRACIONES EXTERNAS

### Supabase

```
URL base:     https://<project-ref>.supabase.co
Auth:         anon key (frontend), service_role (backend Railway)
Recursos:     auth.users, public.profiles, public.tools, public.projects,
              public.project_tools, public.categories, public.fx_rates,
              public.subscriptions_billing, public.stripe_events,
              public.alerts_dismissed, public.recommended_stacks,
              public.recommended_stack_items, public.stackos_roadmaps,
              public.stackos_items
Endpoints vía SDK:
  - supabase.auth.*
  - supabase.from('<table>').select/insert/update/delete (filtrado por RLS)
  - supabase.rpc('<function>') para dashboard_summary, project_summary,
    compute_alerts, savings_plan, stack_comparison, tool_assignment
```

### Stripe

```
URL base:     https://api.stripe.com
Auth:         secret key (solo backend Railway)
Recursos:     Customers, Checkout Sessions, Billing Portal Sessions, Subscriptions
Productos MVP:
  - BurnPilot Pro mensual   — 7,99 €/mes
  - BurnPilot Pro anual     — 69 €/año
  - BurnPilot Lifetime Founder — 149 € one-time (100 plazas)
Webhook endpoint: https://api.burnpilot.app/webhooks/stripe
Eventos a procesar:
  - checkout.session.completed
  - customer.subscription.created / updated / deleted
  - invoice.paid
  - invoice.payment_failed
Idempotencia: tabla stripe_events con event_id PK
Stripe Tax: activado (IVA UE automático)
```

### Resend

```
URL base:     https://api.resend.com
Auth:         API key (solo backend Railway)
From:         hello@burnpilot.app (SPF + DKIM vía Cloudflare)
Uso MVP:      emails custom de bienvenida y recuperación (los de Auth van por Supabase SMTP)
```

### Cloudflare

```
DNS:          zone burnpilot.app con A/CNAME para app. y api., proxied (naranja)
CDN:          activo para frontend
WAF:          NO activar "Bot fight mode" para no romper webhooks Stripe
```

### Anthropic (Roadmappilot)

```
URL base:     https://api.anthropic.com/v1/messages
Auth:         API key solo en Railway (ANTHROPIC_API_KEY)
Uso:          POST /v1/stackos/analyze — ajuste de indicadores y texto why/how/tech para ítems del roadmap (producto Roadmappilot)
Cliente web:  nunca llama a Anthropic directamente; usa la API BurnPilot con JWT
```

### Agente Roadmappilot externo (fase 2)

```
URL:          configurable (STACKOS_AGENT_URL) — POST server-to-server desde Railway
Auth:         opcional STACKOS_AGENT_API_KEY como Bearer hacia el agente (no es el JWT del usuario)
Uso:          POST /v1/stackos/agent — BFF: valida JWT Supabase, reenvía sobre JSON al agente (definición de funcionalidad, backlog, etc.)
Contrato:     docs/stackos-spec.md § Fase 2; tipos @burnpilot/types (stackosAgent)
```

---

## P4. ESTRUCTURA DE DATOS

Aislación por `auth.uid() = user_id`. **Sin multi-tenant.** Dinero siempre en céntimos `integer`.

Tablas principales (ver [docs/burnrate_plan.md §16](docs/burnrate_plan.md) para detalle completo):

```sql
-- profiles: 1:1 con auth.users
-- tools: suscripciones del usuario (Cursor, Vercel, etc.)
-- projects: apps que el usuario mantiene vivas
-- project_tools: M:N tools ↔ projects con allocation_pct (oculto en UX, ver P8)
-- categories: catálogo builder-native read-only
-- fx_rates: tasas de cambio snapshot
-- subscriptions_billing: suscripción del usuario a BurnPilot Pro/Lifetime
-- stripe_events: idempotencia de webhook
-- alerts_dismissed: dismiss por usuario (alert_key puede contener project_id)
-- recommended_stacks + recommended_stack_items: biblioteca curada MVP
-- stackos_roadmaps + stackos_items: roadmap de producto Roadmappilot por proyecto (priorización MoSCoW)
```

RLS activa en todas. `subscriptions_billing` y `stripe_events` solo las escribe `service_role` desde Railway. `categories`, `fx_rates`, `recommended_stacks*` lectura pública. `stackos_*`: solo el dueño (`user_id` / roadmap del proyecto).

---

## P5. PANTALLAS / VISTAS PRINCIPALES

```
Públicas:
  /                   → Landing (hero + 3 bloques valor + pricing + FAQ)
  /pricing            → Tabla Free/Pro/Lifetime con contador Lifetime sobrio
  /login              → Login
  /register           → Registro
  /auth/forgot        → Solicitud reset password
  /auth/reset         → Formulario reset

Privadas (RequireAuth):
  /onboarding         → Flujo 90s (moneda + presupuesto + projects + plantillas)
  /dashboard          → Dashboard global con KPI por proyecto
  /tools              → Listado y CRUD de tools
  /projects           → Listado de proyectos
  /projects/:id       → Dashboard por proyecto
  /stacks             → Biblioteca Recommended Stacks (Sprint 6); `/stacks/library` redirige aquí
  /roadmappilot       → Roadmappilot: roadmap por proyecto (score, MoSCoW, IA opcional); `/stacks/roadmap` y `/stackos` redirigen aquí
  /savings            → Plan de recorte priorizado
  /settings/account   → Email, password, moneda, presupuesto
  /settings/billing   → Gestión Stripe (Customer Portal)
  /settings/danger    → Export CSV + delete account
```

---

## P6. CAMPOS DEL FORMULARIO PRINCIPAL (Tools)

| Campo visible | Campo BD | Tipo | Validación / Nota |
|---|---|---|---|
| Nombre | `name` | text | requerido |
| Proveedor | `vendor` | text | opcional |
| Categoría | `category_id` | select | requerido, de `categories` |
| Plan (texto libre) | `plan_label` | text | opcional |
| Importe | `amount_cents` | integer (céntimos) | > 0 |
| Moneda | `currency` | select EUR/USD/GBP | requerido |
| Periodicidad | `periodicity` | select monthly/yearly/quarterly | requerido |
| Última fecha de cobro | `last_renewal_at` | date | requerido (para cálculo próxima renovación) |
| Estado | `state` | select active/trial/doubtful/to_cancel/canceled | default 'active' |
| Utilidad percibida | `perceived_usefulness` | 1–5 | opcional |
| Notas | `notes` | textarea | opcional |
| Asignación | — (ver P8) | selector | sin proyecto / asignada / compartida |

---

## P7. ENDPOINTS DEL BACKEND RAILWAY

Todos devuelven `{ ok: true, data }` o `{ ok: false, error, code }`.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | /health | No | Health check para Better Stack |
| POST | /billing/checkout-session | JWT | Crea sesión Stripe Checkout Pro |
| POST | /billing/portal-session | JWT | Crea sesión Customer Portal |
| POST | /billing/lifetime-checkout | JWT | Checkout one-time 149 € |
| POST | /webhooks/stripe | Firma | Procesa eventos Stripe (raw body, idempotente) |
| POST | /cron/fx-refresh | x-cron-token | Refresco diario tasas FX |
| POST | /mail/send | allowlist | Envío vía Resend |
| POST | /stackos/analyze | JWT | Roadmappilot: ajuste IA de indicadores (rate limit 15/min) |
| POST | /stackos/agent | JWT | Roadmappilot fase 2: proxy a agente HTTP externo (20/min; requiere STACKOS_AGENT_URL) |
| POST | /tools/ai-enrich | JWT | Herramientas: IA sugiere notas, categoría (catálogo enviado), planes/precios orientativos y scores (15/min; Anthropic) |
| POST | /tools/ai-suggest | JWT | Herramientas: IA lista sugerencias por categoría + búsqueda opcional; precios orientativos (15/min; Anthropic) |
| DELETE | /me | JWT | Limpia Stripe + programa hard delete Supabase |

---

## P8. LÓGICA DE NEGOCIO ESPECÍFICA

### UX de allocations (REGLA DE PRODUCTO, no opcional)

Backend mantiene `allocation_pct`. Frontend lo oculta por defecto. Selector único con 3 opciones:

1. **Sin proyecto** → `project_tools` vacío.
2. **Asignada a un proyecto** → dropdown con proyectos, `allocation_pct = 100` implícito.
3. **Compartida entre proyectos** → único caso en que se exponen porcentajes, con reparto equitativo por defecto y validación suma = 100%.

Ver [docs/burnrate_plan.md §8](docs/burnrate_plan.md).

### Umbrales numéricos del MVP

- **Coste relevante**: ≥ 1000 céntimos (10 €/mes normalizado).
- **Ahorro relevante**: ≥ 500 céntimos (5 €/mes).
- **Stale**: `updated_at > 60 días`.
- **Doubtful caro**: state='doubtful' AND coste ≥ relevante.

### Priorización Savings plan

`priority_score = weight × monthly_saving_cents`, descendente. Tie-breaker: mayor ahorro.

| Condición | Weight |
|---|---|
| `state='to_cancel'` | 5 |
| `state='doubtful'` + coste ≥ relevante | 4 |
| `perceived_usefulness ≤ 2` + coste ≥ relevante | 3.5 |
| Tool huérfana (sin proyecto activo) + coste ≥ relevante | 3 |
| Categoría con overlap + utilidad ≤ 3 | 2.5 |

### 5 alertas deterministas

Overlap · Sobrepresupuesto · Doubtful caro · Stale · Tool huérfana.

### Gating por plan

- Free: 1 proyecto, 10 tools, 3 alertas simultáneas, histórico 30 días, sin export CSV, sin biblioteca de stacks.
- Pro: ilimitado.
- Lifetime: ilimitado + badge Founder.

---

## P9. VARIABLES DE ENTORNO DE ESTE PROYECTO

### Frontend (apps/web/.env.local)

```bash
VITE_API_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SENTRY_DSN=
VITE_UMAMI_WEBSITE_ID=
```

### Backend (apps/api/.env)

```bash
NODE_ENV=development
LOG_LEVEL=info
PORT=3000

ALLOWED_ORIGIN=http://localhost:5173

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO_MONTHLY=
STRIPE_PRICE_ID_PRO_YEARLY=
STRIPE_PRICE_ID_LIFETIME=

RESEND_API_KEY=
RESEND_FROM_EMAIL=BurnPilot <hello@burnpilot.app>

APP_URL=http://localhost:5173
MARKETING_URL=http://localhost:5173

CRON_SECRET=
SENTRY_DSN=
BETTER_STACK_SOURCE_TOKEN=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

# Roadmappilot — agente externo (fase 2). Ver docs/stackos-spec.md
STACKOS_AGENT_URL=
STACKOS_AGENT_API_KEY=
STACKOS_AGENT_TIMEOUT_MS=55000
```

---

## P10. USUARIOS Y ROLES

| Rol | Permisos | Quién lo tiene |
|---|---|---|
| user (anon→authenticated) | CRUD sobre sus propias filas vía RLS | todos los usuarios registrados |
| service_role | bypass RLS para escribir billing y procesar webhooks | solo backend Railway |

No hay roles adicionales en v1.0. `admin` interno: acceso vía Supabase Studio directo.

---

## P11. DISEÑO Y ESTILO

```
Paleta (dark trading):
  Background base:   #0A0B0F
  Background elev:   #111318
  Card:              #16181F
  Border:            #222631
  Texto primario:    #E7EAF0
  Texto muted:       #8A90A3
  Accent verde:      #4ADE80
  Accent rojo:       #F43F5E
  Accent amber:      #F59E0B

Fuentes:
  UI:     Inter (400, 500, 600, 700)
  Cifras: JetBrains Mono (400, 600), tabular-nums

Modo: dark por defecto (clase .dark en <html>)
Iconografía: lucide-react
Gráficos: Tremor (MVP) + Recharts si hace falta custom
Logo MVP: wordmark temporal Inter bold + icono lucide (Flame).
          Logo definitivo va a SECONDARY o post-lanzamiento.
```

---

## P12. PROTOCOLO OBLIGATORIO DE HARDENING Y REVISIÓN DE CALIDAD

*(Hardening & Quality Review Protocol.)*

Norma operativa del proyecto: la IA y cualquier contribuidor **deben** ejecutar esta rutina cuando corresponda. No sustituye tests ni revisión humana; evita acumular fragilidad y deuda técnica bajo el disfraz de “ya funciona en local”.

### 1. Propósito

Este protocolo existe para:

- Aumentar solidez del código y de los puntos de integración (DB, API, auth, pagos).
- Reducir deuda técnica de forma deliberada, no solo reaccionando a incidentes.
- Mejorar mantenibilidad y coherencia de contratos (tipos, RLS, validaciones).
- Detectar fragilidad **antes** de producción o de un entorno que importe.
- Evitar seguir construyendo sobre bases débiles o mal entendidas.
- Instaurar cultura de **revisión continua**, no solo de entrega de features.

### 2. Disparadores obligatorios (activación)

El protocolo **se activa** — es decir: se deja el modo “solo construir” y se entra en **modo hardening** — cuando ocurre **cualquiera** de lo siguiente:

**A. Cierre de cada sprint relevante**  
En particular si el sprint ha tocado: auth, billing, datos, permisos, dashboards, formularios, integración entre módulos o lógica de negocio sensible.

**B. Antes de cualquier deploy importante**  
Incluye: paso a staging serio, primera vez en un entorno compartido, o **producción**. No cuenta un deploy de prueba desechable si el responsable declara explícitamente que es throwaway; en la duda, aplicar protocolo.

**C. Acumulación de complejidad o contexto**  
Por ejemplo: muchas features encadenadas sin pausa de revisión; muchas modificaciones sin auditoría estructural; conversación o contexto ya muy cargado; sensación de “funciona” sin haber mirado bordes, errores ni permisos.

**D. Cambios en zonas sensibles**  
Incluye de forma no exhaustiva: RLS y políticas Supabase; Stripe y webhooks; borrado de cuenta o datos; límites de plan; lógica monetaria; asignaciones / lógica compartida entre módulos; cron, jobs o agentes automatizados.

**E. Antes de declarar “terminado” un bloque o funcionalidad**  
“Terminado” no es solo demo en local. Exige una pasada de hardening **proporcional a la criticidad** del bloque (ver §5).

### 3. Modo hardening: qué debe hacer la IA

Al activarse el protocolo, la IA **cambia temporalmente** de modo construcción a modo **hardening**. Ese modo **incluye como mínimo**:

- Auditoría del alcance afectado (qué archivos, tablas, rutas y flujos entran).
- Detección explícita de deuda técnica introducida o arrastrada.
- Revisión de arquitectura **local** al cambio (no rediseñar el producto entero).
- Revisión de tipos y contratos (TypeScript, payloads, respuestas RPC, env).
- Revisión de validaciones (cliente, servidor si aplica, BD).
- Revisión de edge cases (null, errores de red, permisos denegados).
- Revisión de estados de UX (carga, error, vacío, éxito).
- Revisión de seguridad y permisos (RLS, fugas de datos entre usuarios).
- Si hay build o deploy en juego: revisión de pipeline, env y puntos de fallo conocidos.
- **Priorización** de hallazgos (crítico / alto / medio / bajo).
- **Propuesta de correcciones en bloques pequeños** y aplicables, no un “big bang” innecesario.

### 4. Regla de contención (durante el hardening)

Mientras dure una sesión de hardening activa:

- **No** se añaden nuevas features salvo corrección de bug crítico o bloqueante.
- **No** se reabre el diseño de producto salvo incoherencia grave detectada en la auditoría.
- **No** se hacen refactors masivos sin justificación escrita (alcance, riesgo, beneficio).
- Se prioriza **robustez** frente a sofisticación; **claridad** frente a cleverness.
- Se corrige lo **frágil**; no se reescribe lo que ya es suficientemente correcto y estable.
- Si un hallazgo es cosmético o de bajo valor frente al riesgo, queda documentado y pospuesto con criterio explícito.

### 5. Nivel de revisión según riesgo

**Hardening ligero** — Sprints menores, cambios acotados, bajo riesgo de seguridad o dinero.  
Enfoque: calidad del bloque tocado, consistencia de tipos y validaciones, smoke de flujos afectados.

**Hardening completo** — Sprints grandes, zonas sensibles (§2.D), pre-release o primer deploy serio.  
Enfoque: arquitectura del flujo end-to-end relevante, seguridad y RLS, estados de error y vacío, validaciones en profundidad, coherencia con `docs/STATUS.md` y migraciones, preparación de build/deploy.

La IA **debe** declarar al inicio del hardening qué nivel aplica y por qué (una frase basta).

### 6. Salida obligatoria de cada hardening

Cada ejecución del protocolo debe producir **siempre**, por escrito:

1. **Diagnóstico** del estado del alcance revisado.
2. **Lista priorizada de problemas** (con severidad).
3. **Propuesta de bloques de corrección** (orden sugerido, dependencias).
4. **Criterio de terminado** para ese hardening (qué debe cumplirse para dar el bloque por cerrado).
5. **Recomendación explícita**: continuar construyendo / esperar correcciones / no desplegar aún.

Sin estos cinco elementos, el hardening **no se considera cerrado**.

### 7. Integración en el flujo del proyecto

El desarrollo no es solo “feature tras feature”. El flujo esperado es:

```
Build → Review → Harden → Verify → Continue / Deploy
```

- **Build:** implementación acordada.  
- **Review:** lectura cruzada mínima (código, impacto, coherencia con AGENTS y plan).  
- **Harden:** este protocolo cuando dispara §2.  
- **Verify:** comprobar criterio de terminado (§6) y regresiones básicas.  
- **Continue / Deploy:** solo si verify es satisfactorio o los riesgos restantes están aceptados y documentados.

`docs/STATUS.md` sigue siendo el sitio donde reflejar sprint, rutas y bloqueos; un hardening de cierre de sprint puede resumirse ahí o en el handoff sin duplicar párrafos enteros de AGENTS.

---

## P13. NOTAS Y DECISIONES TÉCNICAS

```
2026-04-18: Nombre del producto cambiado de BurnRate a BurnPilot.
            Dominio: burnpilot.app. Workspaces publicados como @burnpilot/*
            (web, api, types, utils); el name del package.json raíz puede
            seguir siendo legacy sin afectar al producto.

2026-04-18: Divergencia consciente del estándar Leadstodeals — frontend
            desplegado en Netlify (no Vercel). Motivo: decisión de producto
            del fundador. Autodeploy desde main; previews automáticos en PRs.
            Documentado aquí porque altera docs/agents/AGENTS.md §2 y
            docs/cursorrules.txt (que asumen Vercel manual).

2026-04-18: BurnPilot es B2C, no multi-tenant. La sección 4 de
            docs/agents/AGENTS.md (reglas multi-tenant) NO aplica.
            Aislación por auth.uid() = user_id en RLS.

2026-04-18: Supabase JS pineado a 2.49.1 para alinear con el resto del
            ecosistema Leadstodeals y evitar inconsistencias de API.

2026-04-18: Dinero siempre en integer céntimos. Cero floats en ningún
            cálculo financiero.

2026-04-18: allocation_pct existe en backend desde día 1 pero NO se
            muestra en UX salvo que el usuario marque "compartida"
            explícitamente (ver P8). Decisión de contención de UX.

2026-04-20: Propuesta "BurnIntel" (n8n + scraping + Claude + snapshots /
            embeddings en Supabase) archivada FUERA del CORE MVP actual.
            Decisión: no entra en el plan por ahora; reapertura solo tras
            consolidar MVP y criterio explícito. Detalle en
            docs/future/burnintel-n8n-agent.md.

2026-04-20: docs/STATUS.md creado como fuente operativa de handoff (sprint
            hecho / siguiente / rutas / local / bloqueos). Debe mantenerse
            al día; AGENTS.md P14 remite a STATUS para no duplicar.

2026-04-20: docs/AGENT_CHAT_HANDOFF.md + docs/handoff/LATEST.md — traspaso
            entre chats cuando hay límite de contexto (regla práctica, no
            medición exacta del 90 %). REGLA 10 en docs/cursorrules.txt.

2026-04-18: Sprint 2 — modelo `categories`, `fx_rates`, `tool_templates`, `projects`,
            `tools`, `project_tools` en migración
            `supabase/migrations/20250420000001_tools_projects_categories.sql`;
            UI `/tools` + `AppShell` con proyectos en sidebar; cierre del sprint
            sujeto a aplicar SQL en Supabase y QA RLS (2 cuentas). Detalle en
            docs/STATUS.md.

2026-04-18: Sprint 3 — RPC `dashboard_summary`, `project_summary`, `tool_assignment`,
            `dashboard_history` en `supabase/migrations/20250421000001_dashboard_rpc.sql`.
            UI `/dashboard` con métricas y gráfico por categoría; `/projects/:id` detalle.
            Gráficos con **Recharts** (Tremor `@tremor/react` declara peer React 18;
            Recharts es el camino hasta alinear Tremor con React 19 o bajar React).

2026-04-19: Sprint 4 — `compute_alerts`, `compute_project_alerts`, `savings_plan` en
            `20250422000001_sprint4_alerts_savings.sql`; alertas en JSON de
            `dashboard_summary` / `project_summary`. UI `/savings`, onboarding,
            borrado de cuenta `DELETE /v1/account` (Express + service role). Detalle en
            docs/STATUS.md.

2026-04-19: P12 — Protocolo obligatorio de hardening y revisión de calidad (disparadores,
            modo hardening, regla de contención, niveles ligero/completo, salida obligatoria,
            flujo Build → Review → Harden → Verify → Continue/Deploy). Norma operativa para
            IA y flujo de desarrollo; no recomendación opcional.

2026-04-19: Backlog de producto MoSCoW en docs/product_backlog_moscow.md — ideas y
            prioridades no vinculantes; la IA no implementa por el mero hecho de estar
            listado; promoción solo con aprobación explícita y reflejo en STATUS/sprint/plan.

2026-04-19: Cierre de bloque Sprints 0–4 (sesión): borrado de cuenta verificado en local;
            API `apps/api/src/loadEnv.ts` + `dotenv`, CORS dev para localhost/127.0.0.1:5173,
            purge `tools`/`projects`/`profiles` antes de `auth.admin.deleteUser`. Hardening
            ligero §P12 documentado en docs/STATUS.md; handoff en docs/handoff/LATEST.md;
            desarrollo por sprints en pausa hasta nueva sesión — siguiente planificado Sprint 5.
```

---

## P14. ESTADO ACTUAL Y PRÓXIMOS PASOS

```
No duplicar aquí el detalle operativo día a día.

Ver siempre: docs/STATUS.md (sprint cerrado, siguiente, rutas, local, bloqueos).

Resumen fijo de intención: CORE MVP según docs/burnpilot_plan.md v1.3;
            SECONDARY sacrificable si aprieta el tiempo; BurnIntel fuera
            de alcance (docs/future/burnintel-n8n-agent.md).
```
