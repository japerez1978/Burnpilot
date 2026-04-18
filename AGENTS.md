# AGENTS.md — BurnPilot

> Especificación concreta del proyecto BurnPilot siguiendo el estándar Leadstodeals.
> Las secciones globales 1–14 (stack, estructura, código, seguridad, git, performance, env, estado, logging, testing, checklists) viven en [docs/agents/AGENTS.md](docs/agents/AGENTS.md) y se aplican a este proyecto sin modificar.
> El plan maestro con posicionamiento, alcance y roadmap vive en [docs/burnpilot_plan.md](docs/burnpilot_plan.md) (v1.3).

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
Integraciones: Stripe (Checkout + Customer Portal + Webhook + Stripe Tax), Resend (email), Sentry, Better Stack (logs + uptime), Umami (analytics)
Hosting frontend: Netlify (divergencia consciente del estándar Leadstodeals que marca Vercel; ver P12)
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
              public.recommended_stack_items
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
```

RLS activa en todas. `subscriptions_billing` y `stripe_events` solo las escribe `service_role` desde Railway. `categories`, `fx_rates`, `recommended_stacks*` lectura pública.

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
  /stacks             → Biblioteca Recommended Stacks (SECONDARY Sprint 6)
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

## P12. NOTAS Y DECISIONES TÉCNICAS

```
2026-04-18: Nombre del producto cambiado de BurnRate a BurnPilot.
            Dominio objetivo: burnpilot.app (por registrar).
            Paquetes npm internos mantienen prefijo @saas-burnrate/* por
            coherencia con el monorepo, sin impacto en el producto visible.

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
```

---

## P13. ESTADO ACTUAL Y PRÓXIMOS PASOS

```
Estado:          En desarrollo — Sprint 0 en curso
URL producción:  pendiente (burnpilot.app por registrar en Cloudflare Registrar)
URL local:       http://localhost:5173 (frontend) / http://localhost:3000 (backend)

Completado:
  ✅ Plan maestro v1.3 aprobado
  🔄 Sprint 0 — scaffold del monorepo en curso

En curso:
  🔄 Scaffold NPM Workspaces (apps/web, apps/api, packages/types, packages/utils, supabase/)
  🔄 CI GitHub Actions
  🔄 Deploy hola mundo a Netlify y Railway

Pendiente (operativas del usuario):
  ⏳ Registrar dominio burnpilot.app en Cloudflare Registrar
  ⏳ Crear proyectos: Supabase (dev+prod eu-west), Railway, Netlify,
     Stripe (test), Cloudflare zone, Resend, Sentry, Better Stack, Umami
  ⏳ Crear repo github.com/japerez1978/burnpilot y primer push
  ⏳ Stripe KYC para modo live (sandbox basta mientras desarrollamos)
  ⏳ Sprint 1: Auth + perfil (Supabase Auth + migración 0001_init)
```
