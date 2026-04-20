# BurnPilot — Plan Maestro MVP v1.3

> Versión aprobada para arrancar Sprint 0.
> Integra las 8 directrices de ajuste sobre v1.2:
> contención de UX de allocations, Recommended Stacks con ambición contenida, Lifetime sin sobredimensionar, separación explícita CORE MVP / SECONDARY MVP, plazo realista 5-7 semanas, operativas confirmadas.
> Nombre del producto: BurnPilot (cambiado de BurnRate antes del primer commit).
> Este documento es el espejo del plan oficial guardado en `.cursor/plans/`.

---

## 1. Estado del plan

- **Versión**: v1.3 (reemplaza a v1.2).
- **Estado**: aprobado para arrancar Sprint 0 con ajustes de dirección.
- **Tesis intacta**: sigue siendo "spend optimizer stack-aware para builders".
- **Ajustes aplicados**: UX allocations simplificada, stacks sobrios, lifetime sin secuestrar producto, separación CORE/SECONDARY, plazo realista.
- **Próximo paso al cerrar**: Sprint 0 (cimientos).

---

## 2. Posicionamiento (definitivo)

> **BurnPilot — SaaS spend optimizer para builders no técnicos.**
>
> No solo te dice cuánto pagas. Te dice qué herramientas se pisan, qué puedes apagar, qué planes bajar y cuál es el stack mínimo para mantener tus apps vivas.

Si una feature no refuerza esta frase, fuera.

---

## 3. Principios de producto (anclas de decisión)

Cinco principios que ganan en cualquier conflicto de prioridad. Vienen de tus ajustes de v1.3:

- **P1. Contención de UX antes que sofisticación**. Un campo, un clic, una decisión simple por pantalla. Nada avanzado por defecto; lo avanzado se muestra cuando el usuario lo pide.
- **P2. Utilidad antes que marketing**. El producto gana por lo que ayuda, no por lo que vocea. Lifetime y contadores existen, pero no secuestran copy ni UX.
- **P3. Valor antes que estética final**. En MVP, lo suficientemente bueno y consistente es mejor que lo perfecto y tardío. Branding y logos definitivos NO bloquean.
- **P4. Core antes que Secondary**. Si aprieta el plazo, primero sale lo que constituye el valor mínimo vendible. Lo periférico puede esperar una semana.
- **P5. Simple ahora, potente después**. Guardamos estructura en datos (allocation_pct, stacks, etc.) para no tener que migrar en fase 2, aunque la UX inicial sea básica.

Estos principios aplican a todas las decisiones siguientes.

---

## 4. Los 5 dolores que resolvemos

Cada uno mapea a una feature concreta. Si una feature no responde a uno de estos 5, no entra.

- **D1. "Qué estoy pagando sin sentido"** → estado `doubtful`, utilidad percibida 1-5, alerta `stale` (>60 días).
- **D2. "Qué plataformas se pisan"** → alerta `overlap` por categoría (global y por proyecto).
- **D3. "Qué puedo apagar o bajar de plan"** → pantalla `/savings` con plan de recorte priorizado.
- **D4. "Qué stack mínimo necesito para este proyecto"** → biblioteca sobria de **Recommended Stacks** + comparador simple.
- **D5. "Cuánto cuesta mantener esta app viva"** → vista por **Project** con burn rate mensual y anual.

---

## 5. Cómo ganamos a Rocket Money y a subscription managers genéricos

- **Stack-aware**: agrupas tus tools por proyecto. Sabes qué stack te cuesta cuánto.
- **Decisional**: no ves solo "gastas 240 €/mes", ves "puedes ahorrar 80 € recortando 4 servicios".
- **Builder-native**: stacks y plantillas pensados para vibe coding.
- **Cero bank-link**: manual + plantillas + CSV. Privacy-first.
- **Multi-currency** EUR/USD/GBP con snapshot FX.
- **Trading UI**: dark, monospace, terminal financiero.
- **Más barato que Rocket Money**: 7,99 €/mes · 69 €/año · Lifetime 149 € (primeros 100). Rocket no ofrece lifetime.

---

## 6. Conceptos del dominio (vocabulario interno)

- **Tool** — una suscripción que pagas. Unidad atómica.
- **Project** — una app que mantienes viva. Tiene su stack.
- **Stack** — conjunto de tools usadas por un Project.
- **Recommended Stack** — plantilla curada por nosotros con tools sugeridas y coste estimado.
- **Burn rate** — gasto mensual en moneda base; se calcula a 3 niveles: global, por categoría, por proyecto.
- **Savings plan** — listado priorizado de candidatos a recortar con ahorro estimado.
- **Allocation** — porcentaje con el que un tool se reparte entre proyectos. Suma ≤ 100%. **Oculto en UX por defecto** (ver §8).

---

## 7. Planes y gating

- **Free** — 1 proyecto, 10 tools, 3 alertas activas, histórico 30 días, sin export CSV, sin biblioteca de Recommended Stacks.
- **Pro** (7,99 €/mes o 69 €/año) — proyectos ilimitados, tools ilimitadas, alertas ilimitadas, biblioteca completa de stacks, export CSV, histórico 12 meses, savings plan completo.
- **Lifetime Founder** (149 € one-time, 100 plazas) — todo Pro para siempre + badge Founder + comunidad privada.

Sin trial. Free actúa como demo permanente con límites duros.

---

## 8. UX de allocations (regla de producto, no opcional)

**Regla:** `allocation_pct` existe en el modelo de datos y backend desde el día 1. **Pero en el frontend de MVP no se muestra como decisión principal.** El usuario no técnico no debe sentir que está haciendo contabilidad.

### Cómo se presenta al añadir/editar una tool

El formulario ofrece un único selector con tres opciones:

1. **"Sin proyecto"** → la tool queda en la lista general sin asignar. `project_tools` vacío para esta tool.
2. **"Asignada a un proyecto"** → dropdown con tus proyectos activos. `allocation_pct = 100` implícito. Nunca se menciona el porcentaje.
3. **"Compartida entre proyectos"** → solo entonces se abre un sub-formulario donde el usuario marca 2+ proyectos. Ahí SÍ se puede ajustar porcentaje por proyecto (slider o numérico). Si el usuario no ajusta, se reparte equitativamente por defecto (ej. 2 proyectos = 50/50). Validación en UI: la suma debe dar 100%.

### Lo que hace el backend

- Guarda siempre filas en `project_tools` con `allocation_pct` consistente.
- Valida con CHECK + trigger que la suma de allocations de un tool ≤ 100%.
- Expone API/RPC que devuelve para cada tool: `assignment: 'none' | 'single' | 'shared'`, el frontend usa ese flag para renderizar el selector correcto.

### Qué NO se hace en MVP

- No hay sliders visibles por defecto.
- No se muestra "%" en el listado de tools.
- No hay tooltip educativo invasivo sobre allocations.
- El dashboard de proyecto muestra el **coste efectivo** de la tool para ese proyecto (= `amount_in_base_cents × allocation_pct / 100`), pero sin entrar en el concepto salvo que el usuario haya marcado "compartida".

### Por qué

Mantenemos la potencia para fase 2 (un builder que reparte Cursor 50/50 entre dos apps lo agradecerá) pero sin que el 95% de usuarios lo vea. El 95% tiene cada tool en un solo proyecto o sin proyecto. Para ellos, allocations no existe.

---

## 9. Recommended Stacks (alcance contenido, MVP)

**Regla:** biblioteca sobria y útil, nada de pseudo-consultoría dinámica ni IA.

### Qué SÍ hay en MVP

- **8 stacks curados** (§20).
- Cada stack con: nombre, descripción breve, audiencia objetivo, coste mensual estimado, lista de tools con rol ("Editor", "Hosting", "Payments"…), fecha de última revisión.
- Pantalla `/stacks` con grid de tarjetas + vista de detalle.
- Acción **"Aplicar a un proyecto"** que pregunta a qué proyecto aplicarlo y:
  - Identifica qué tools del stack ya tiene el usuario (marcadas con check).
  - Sugiere alta rápida de las que faltan con valores del stack como defaults.
  - No añade nada automáticamente sin confirmar.
- Comparador simple con diff visual: "Tu proyecto X tiene estas tools, el stack recomendado tiene estas. Te faltan N, te sobran M."

### Qué NO hay en MVP

- Generación dinámica de stacks según descripción del proyecto ("dime qué app montas y te sugiero el stack"). Va a fase 2 con IA.
- Recomendaciones personalizadas basadas en comportamiento.
- Stacks custom creados por el usuario.
- Notificaciones automáticas de "hay un stack mejor para ti".
- Optimización automática de coste con restricciones.

### Por qué

Los stacks son diferenciador **solo si** son útiles y creíbles. Un comparador simple bien hecho vende más que un recomendador IA flojo. Capa curada ahora, capa inteligente después.

---

## 10. Lifetime Founder (tratamiento sobrio)

**Regla:** Lifetime existe porque aporta cashflow temprano y afinidad con audiencia builder, pero **no organiza el producto**.

### Qué hay

- Producto Stripe BurnPilot Lifetime 149 € one-time.
- Plan `lifetime` en `profiles.plan` con gating igual que Pro.
- **Un bloque de pricing** en la landing con las 3 opciones (Free · Pro · Lifetime).
- **Un contador simple** del tipo "X de 100 plazas" (se actualiza vía query a Supabase). Nada de temporizadores dramáticos, popups ni CTAs agresivos.
- Badge "Founder" discreto en el perfil del usuario Lifetime.

### Qué NO hay

- No hay hero de la landing dedicado a Lifetime.
- No hay banners persistentes.
- No hay dark patterns ("¡últimas 3 plazas!!!").
- No hay emails automáticos de urgencia.
- No hay módulo de referidos, afiliados, ni gamificación en v1.0.
- La palabra "Founder" aparece solo en pricing y en el perfil; el resto del producto habla de Pro y Free.

### Por qué

El producto debe convencer por lo que hace, no por el grito de urgencia. Un Lifetime sobrio vende a builders serios. Un Lifetime ansioso los espanta.

---

## 11. Alcance MVP — división CORE / SECONDARY

Esta es la división que pediste. Sirve para proteger el lanzamiento si aprieta el tiempo.

### 11.1 CORE MVP (sale sí o sí)

Sin estos elementos no lanzamos:

- **Auth**: Supabase Auth (email+password + Google OAuth + verificación obligatoria).
- **Perfil básico**: moneda base, presupuesto opcional, plan actual.
- **Tools CRUD**: crear, editar, eliminar, duplicar, filtrar, buscar.
- **Projects CRUD**: crear, editar, archivar.
- **Asignación tool↔project** con la UX simplificada del §8 (sin proyecto / asignada / compartida).
- **Dashboard global**: burn mensual/anual, top 5, donut por categoría, KPI por proyecto, próximas renovaciones, alertas activas.
- **Dashboard por proyecto**: burn del proyecto, tools asignadas, alertas específicas.
- **5 alertas deterministas**: overlap, sobrepresupuesto, doubtful caro, stale, tool huérfana.
- **Savings plan** (`/savings`): listado priorizado de oportunidades de recorte con ahorro estimado y acciones básicas (marcar como recortado, marcar para revisar).
- **Billing Pro + Lifetime**: Stripe Checkout + Portal + webhook idempotente + Stripe Tax.
- **Gating por plan**: Free limitado (1 proyecto, 10 tools, 3 alertas), Pro/Lifetime ilimitado.
- **Onboarding 90s**: moneda + presupuesto + projects opcionales + grid plantillas.
- **Settings básicos**: email, password, moneda, presupuesto, delete account.
- **Landing mínima**: hero + 3 bloques valor + pricing + FAQ + legal.
- **Observabilidad mínima**: Sentry front+back, Better Stack uptime del `/health`.

### 11.2 SECONDARY MVP (sale con el producto o una semana después si aprieta)

Importante pero postponible sin romper la tesis:

- **Biblioteca Recommended Stacks** (`/stacks`) con 8 stacks y comparador simple.
- **Comparador de stack vs proyecto** con diff visual.
- **Export CSV** (Pro) refinado — en el peor caso sale versión básica en CORE y refinamos luego.
- **Contador Lifetime** visualmente trabajado — en CORE hay contador básico, pulido en SECONDARY.
- **Dashboard-history** (área 6 meses): si el tiempo aprieta, basta con que exista el mes actual y el anterior; los 6 meses completos son SECONDARY.
- **Animaciones, microinteracciones, estados vacíos pulidos**: CORE tiene el funcional, SECONDARY el pulido.
- **Ilustraciones/iconografía custom**: CORE usa lucide-react tal cual, SECONDARY puede sumar ilustraciones propias.
- **Políticas legales largas**: CORE tiene plantillas adaptadas suficientes, SECONDARY revisa con abogado si lanzamos a más de N países.

### 11.3 Regla de ejecución

- Sprints 1-5: exclusivamente CORE (Billing queda en Sprint 5 para proteger el lanzamiento).
- Sprint 6: SECONDARY (stacks + dashboard-history + pulido).
- Sprint 7: lanzamiento (CORE obligatorio + SECONDARY lo que haya dado tiempo).
- Si en Sprint 5 detecto retraso: movemos SECONDARY a post-lanzamiento (v1.0.1 una semana después). **No movemos CORE nunca.**
- **Nota**: el "wow" inicial del dashboard CORE viene de burn mensual, alertas, savings y costes por proyecto. El área histórica de 6 meses NO es fuente principal de valor y se entrega en SECONDARY.

### 11.4 Umbrales numéricos del MVP (fijados, no arbitrarios)

Todos los importes se evalúan sobre `amount_in_base_cents` (normalizado a mensual en moneda base del usuario).

- **Coste relevante**: ≥ **1000 céntimos** (10 €/mes o equivalente). Por debajo, una tool no dispara alertas de tipo "caro" ni entra en savings plan.
- **Ahorro relevante**: ≥ **500 céntimos** (5 €/mes). Por debajo no se sugiere como oportunidad de recorte (evita ruido y micro-optimizaciones).
- **Umbral `stale`**: `updated_at < now() - 60 días`.
- **Umbral `doubtful caro`**: `state = 'doubtful'` AND coste ≥ coste relevante.
- **Sobrepresupuesto**: activa solo si `profiles.monthly_budget_cents IS NOT NULL` y `sum(burn_mensual) > monthly_budget_cents`.

#### Priorización del Savings plan

Cada candidato recibe `priority_score = weight × monthly_saving_cents`. Orden descendente.

Pesos fijos (escala 1-5, fáciles de justificar):

- `state = 'to_cancel'` → **weight 5** (el usuario ya decidió; va primero).
- `state = 'doubtful'` con coste ≥ relevante → **weight 4**.
- `perceived_usefulness ≤ 2` con coste ≥ relevante → **weight 3.5**.
- Tool huérfana (sin proyecto activo) con coste ≥ relevante → **weight 3**.
- Tool en categoría con overlap y utilidad ≤ 3 → **weight 2.5**.

Tie-breaker ante empates de score: mayor `monthly_saving_cents` primero.

**Ahorro potencial mostrado en `/savings`** = suma de `monthly_saving_cents` de todos los candidatos con score > 0 (no del total del catálogo; no engañamos).

---

## 12. Fuera de MVP (roadmap futuro)

- **Fase 2**: import CSV bancario, email forwarding parser, alertas IA, stacks generados dinámicamente con IA, notificaciones email de renovación, app móvil.
- **Fase 3**: equipos/workspaces (si emerge B2B), integraciones OAuth con proveedores.
- **Nunca**: app que apaga servicios, negociación de facturas.

---

## 13. Stack técnico

- **Frontend**: React 19 + Vite + TypeScript + Tailwind + shadcn/ui + Tremor + TanStack Query + **Zustand** + react-hook-form + Zod + lucide-react + date-fns.
- **Despliegue frontend**: **Netlify** (confirmado), **autodeploy desde `main`** (confirmado). Previews automáticos en PRs.
- **Backend thin**: Node 20 + TypeScript + **Express** en **Railway**.
- **Data**: **Supabase** (Auth + Postgres + RLS por user_id). Región eu-west-1. Cliente JS pineado a `2.49.1`.
- **Pagos**: **Stripe** (Checkout + Customer Portal + Webhook) + **Stripe Tax**.
- **Email**: **Resend** (from `hello@burnpilot.app`, SPF + DKIM vía Cloudflare).
- **DNS + CDN**: **Cloudflare**.
- **Observabilidad**: **Sentry** + **Better Stack** + **Umami**.
- **Repo**: propio `saas-burnrate` en `github.com/japerez1978/`, monorepo **NPM Workspaces**.
- **CI**: GitHub Actions (lint + typecheck + `npm run build` Exit 0 antes de merge).

---

## 14. Arquitectura (regla dura)

- **Frontend → Supabase**: directo (auth, CRUD de tools/projects, dashboards vía SQL functions, alertas, stacks).
- **Frontend → Backend Railway**: solo para `/billing/*`, `/mail/send`, `DELETE /me`, lectura de `/health`.
- **Backend Railway → Supabase**: con `service_role` para escribir `stripe_events`, `subscriptions_billing`, limpiar cuentas, refrescar FX.
- **Backend Railway → Stripe / Resend**: integraciones externas.
- **Stripe → Backend Railway**: webhook firmado.

**Si aparece `GET /api/tools` en Railway, es error de arquitectura. Ese dato lo sirve Supabase.**

---

## 15. Estructura del repo

```
saas-burnrate/
  apps/
    web/                       # React+Vite (Netlify)
      src/
        components/ui/
        components/features/
        pages/                 # landing, auth, onboarding, dashboard, tools, projects, stacks, savings, settings
        hooks/
        services/              # llamadas Supabase + API Railway
        store/                 # Zustand: useSessionStore, usePlanStore
        types/
        utils/
        constants/
      netlify.toml
    api/                       # Express thin (Railway)
      src/
        routes/
        controllers/           # delgados
        services/              # gordos, Result<T,E>
        middleware/
          auth.ts
          cors.ts
          rateLimit.ts
        types/
        utils/
          logger.ts            # helper log(level, action, data) JSON
      railway.json
  packages/
    types/                     # Zod schemas compartidos
    utils/                     # puras (money, fx, dates)
  supabase/
    migrations/
      0001_init.sql            # profiles, tools, categories, fx_rates, alerts_dismissed
      0002_projects.sql        # projects, project_tools
      0003_billing.sql         # subscriptions_billing, stripe_events
      0004_stacks.sql          # recommended_stacks, recommended_stack_items
      0005_rls.sql
      0006_functions.sql       # dashboard_summary, project_summary, compute_alerts, savings_plan, stack_comparison
      0007_seeds.sql
      0008_triggers.sql
  docs/
    agents/AGENTS.md
    burnpilot_plan.md          # este documento
    runbook.md
    rocket_comparison.md
  .github/workflows/ci.yml
  .env.example
  package.json
```

---

## 16. Modelo de datos (B2C, sin tenant_id)

**Aislación por `user_id` con RLS. Sin multi-tenant.**

### Tablas

- `profiles` (id uuid PK ref auth.users, email, base_currency char(3), monthly_budget_cents int, plan text default 'free', stripe_customer_id text unique, onboarding_completed_at, created_at, updated_at).
- `categories` (id smallint PK, slug, name, color, icon) — 8 categorías builder, read-only.
- `tools` (id uuid PK, user_id FK, name, vendor, category_id, plan_label, amount_cents int, currency char(3), periodicity, last_renewal_at date, state, perceived_usefulness 1-5, notes, fx_rate_to_base numeric(18,8), amount_in_base_cents int, timestamps, deleted_at).
- `projects` (id uuid PK, user_id FK, name, description, color, icon, status text default 'active', created_at, updated_at, archived_at).
- `project_tools` (project_id FK, tool_id FK, allocation_pct numeric(5,2) default 100, created_at) PK (project_id, tool_id). CHECK + trigger: suma de allocations por tool ≤ 100%.
- `fx_rates` (from_currency, to_currency, rate, captured_at) PK compuesta.
- `subscriptions_billing` (id, user_id, stripe_subscription_id unique, stripe_price_id, status, cancel_at_period_end, current_period_end, timestamps).
- `stripe_events` (event_id PK, type, payload jsonb, received_at, processed_at).
- `alerts_dismissed` (user_id, alert_key text, dismissed_at) PK (user_id, alert_key).
- `recommended_stacks` (id smallint PK, slug, name, description, target_audience, monthly_cost_estimate_cents int, last_reviewed_at date).
- `recommended_stack_items` (stack_id FK, tool_template_slug text, role text, suggested_plan text, monthly_cost_cents int) PK (stack_id, tool_template_slug).

### Reglas

- **Dinero en céntimos `integer`. Cero floats.**
- **Índices**: tools (user_id, state), tools (user_id, category_id), project_tools (tool_id), projects (user_id, status).
- **RLS** activa en todas las tablas con datos de usuario, `auth.uid() = user_id` (o vía join para `project_tools`). `subscriptions_billing` lectura propia, escritura solo service_role. `stripe_events` sin policies cliente. `categories`, `fx_rates`, `recommended_stacks*` lectura pública.

### Funciones SQL clave

- `dashboard_summary()`
- `dashboard_history(months int)`
- `project_summary(project_id uuid)`
- `compute_alerts()` — 5 reglas.
- `savings_plan()` — listado priorizado con ahorro estimado.
- `stack_comparison(project_id uuid, stack_id smallint)` — diff simple.
- `tool_assignment(tool_id uuid)` — devuelve `'none' | 'single' | 'shared'` para que el frontend pinte el selector del §8.

---

## 17. Endpoints backend Railway

Formato `{ ok: true, data }` o `{ ok: false, error, code }`. Validación Zod. Patrón `Result<T, E>`.

- `GET /health`
- `POST /billing/checkout-session` (JWT)
- `POST /billing/portal-session` (JWT)
- `POST /billing/lifetime-checkout` (JWT)
- `POST /webhooks/stripe` (firma verificada, raw body)
- `POST /cron/fx-refresh` (header `x-cron-token`)
- `POST /mail/send` (interno, allowlist)
- `DELETE /me` (JWT, body `{ confirm: true }`)

---

## 18. Seguridad no negociable

- JWT Supabase en header `Authorization`.
- CORS restringido a `https://app.burnpilot.app` y `https://burnpilot.app`.
- `express-rate-limit` global + específico en `/billing/*` y `DELETE /me`.
- `helmet` para headers.
- Webhook Stripe: firma + idempotencia por `event_id` PK.
- Secrets solo en Railway/Netlify env vars. `.env.example` sin valores.
- RLS testeada con 2 cuentas antes de cada release.
- Logs JSON sin secrets, tokens ni PII.
- Pre-push: `npm run build` Exit 0.

---

## 19. Roadmap por sprints

### Nota sobre plazos

- **Objetivo ideal**: 4-5 semanas a tiempo parcial.
- **Expectativa realista a respetar**: **5-7 semanas a tiempo parcial.**
- Si al final del Sprint 4 llevamos retraso, movemos el bloque SECONDARY (Sprint 5) a post-lanzamiento y salimos solo con CORE. **No metemos atajos en CORE ni ignoramos seguridad/tests por cumplir fecha.**

### Sprints

**Sprint 0 — Cimientos** (1-2 días)
- Cuentas creadas; dominio registrado en Cloudflare Registrar.
- Scaffold monorepo NPM Workspaces.
- Deploy hola mundo Netlify (autodeploy desde `main`) y Railway (`GET /health`).
- Wordmark temporal Inter bold + icono lucide.
- CI GitHub Actions básico.

**Sprint 1 — Auth + perfil [CORE]** (2-3 días)
- Supabase Auth: password policy, plantillas ES, Google OAuth, redirect URLs.
- Migración `0001_init.sql` + trigger `handle_new_user`.
- Páginas login/register/reset, `useSessionStore` Zustand, `<RequireAuth>`.

**Sprint 2 — Tools + Projects CRUD [CORE]** (4-5 días)
- Migraciones `0002_projects.sql` + RLS.
- Seeds: 8 categorías + 16 plantillas + fx_rates iniciales.
- UI tools con selector simple "sin proyecto / asignada / compartida" (§8).
- UI projects: listado sidebar + CRUD.
- Validación react-hook-form + Zod.
- Test RLS con 2 cuentas.

**Sprint 3 — Dashboards [CORE]** (4-5 días)
- SQL `dashboard_summary()` + `project_summary()` + `tool_assignment()`. La función `dashboard_history()` se crea también aquí pero su **visualización** de área 6m va a Sprint 6 (SECONDARY).
- Pantalla dashboard global: burn mensual/anual, top 5, donut por categoría, KPI por proyecto, próximas renovaciones 7 días, alertas activas. **No incluye área histórica 6m en CORE.**
- Pantalla `/projects/:id` con burn + tools + alertas específicas.
- Tremor + paleta trading dark global.

**Sprint 4 — Alertas + Savings + Onboarding + Settings [CORE]** (3-4 días)
- SQL `compute_alerts()` (5 reglas) + `savings_plan()`.
- Pantalla `/savings` con plan de recorte priorizado y acciones básicas.
- Onboarding 90s con projects.
- Settings CORE (email, password, moneda, presupuesto, delete account vía `DELETE /me` en Railway).

**Sprint 5 — Billing Pro + Lifetime [CORE]** (3-4 días)
- Migración `0003_billing.sql`.
- Stripe: productos + prices (Pro mensual 7,99 €, anual 69 €, Lifetime 149 €). Stripe Tax activado.
- Endpoints `/billing/*` + webhook con 6 eventos críticos.
- UI pricing, banner `past_due`, modal plan limit, contador Lifetime **sobrio**.
- Test con `stripe listen`.

**Sprint 6 — Recommended Stacks + pulido SECONDARY** (3-4 días)
- Migración `0004_stacks.sql` + seed 8 stacks.
- SQL `stack_comparison()`.
- Pantalla `/stacks` sobria con biblioteca + "Aplicar a proyecto".
- Pantalla dashboard-history (área 6m) — se pule aquí; la función SQL ya existe desde Sprint 3.
- Export CSV refinado (Pro).
- Estados vacíos pulidos, microinteracciones.

**Sprint 7 — Landing + go-live** (2-3 días)
- Landing BurnPilot con comparativa vs Rocket Money, pricing, FAQ, legal.
- Sentry DSN, Better Stack tokens, Umami.
- Runbook en `docs/runbook.md`.
- Política privacidad + términos (plantillas adaptadas).
- Backup Supabase Pro verificado.
- Checklist go-live.

**Sprint 8 — Post-MVP (definición extendida en repo)**  
No forma parte del plan v1.3 original; se añade como iteración tras go-live. Objetivo: **legal definitivo**, **Stripe Live**, **observabilidad** (Sentry/Umami/monitores), **backups Supabase** con restore probado, **hardening** ligero (CORS, checklist §18), mejoras opcionales de SEO/copy. Detalle: `docs/sprint8_scope.md`.

---

## 20. Catálogo inicial de Recommended Stacks (seed para Sprint 5)

8 stacks curados con coste mensual orientativo:

1. **Indie SaaS Minimal** — ~50 €/mes — Cursor + Supabase + Netlify + Stripe + Resend + Cloudflare.
2. **AI Agent Prototype** — ~80 €/mes — Cursor + Claude API + Vercel + Supabase + Resend.
3. **No-code MVP** — ~120 €/mes — Lovable + Stripe + Resend + Cloudflare + Notion.
4. **Content Automation** — ~60 €/mes — n8n cloud + Notion + ChatGPT + Resend.
5. **Design + Build** — ~90 €/mes — Figma + Framer + Cursor + Vercel + Stripe.
6. **AI Writing Pro** — ~70 €/mes — Claude + ChatGPT Plus + Notion + Grammarly.
7. **Solo Founder Stack** — ~150 €/mes — Cursor + Claude + Supabase + Vercel + Stripe + Resend + Notion + Figma.
8. **Backend-heavy SaaS** — ~140 €/mes — Cursor + Railway + Postgres + Redis + Stripe + Resend + Sentry + Better Stack.

Cada stack con `last_reviewed_at`, badge "actualizado en MM/YYYY", revisión trimestral manual.

---

## 21. Riesgos

- **R1 Producto**: diferencial depende de ejecución builder-native. Mitigación: onboarding y copy obsesivos.
- **R2 Adquisición**: Lifetime sin audiencia no se llena. Mitigación: pre-launch en Product Hunt, Indie Hackers, Twitter/X vibe coding. El Lifetime va sobrio (§10), así que no depender de él.
- **R3 Webhook Stripe**: idempotencia + alerta Better Stack si `stripe_events.processed_at IS NULL > 5 min`.
- **R4 RLS mal escrita**: test manual con 2 cuentas cada release.
- **R5 FX desactualizado**: cron diario + alerta si `max(captured_at) < now() - 48h`.
- **R6 Vendor lock Supabase**: `pg_dump` mensual verificado.
- **R7 Coste Lifetime futuro**: ~30 €/mes infra cubrible con 10 Pro mensuales.
- **R8 UX Projects**: si el usuario no entiende projects, se bloquea. Mitigación: projects opcionales en MVP, selector simplificado §8, onboarding explícito.
- **R9 Mantenimiento Recommended Stacks**: precios cambian. Mitigación: badge "actualizado" + revisión trimestral.
- **R10 Allocations confusas**: resuelto en §8 — están ocultas por defecto.
- **R11 Plazo optimista**: si defendemos 4-5 semanas como obligatorio metemos atajos. Mitigación: §19 fija 5-7 semanas como expectativa realista y permite sacrificar SECONDARY antes que CORE.

---

## 22. Operativas (confirmadas)

- **Dominio**: `burnpilot.app` (cambiado de burnrate.app al renombrar el producto). Registrar en Cloudflare Registrar. DNS en Cloudflare.
- **Email from**: `hello@burnpilot.app`. SPF + DKIM vía Cloudflare.
- **Stripe KYC**: hacerlo pronto para modo live; sandbox basta para desarrollo inicial.
- **Netlify**: confirmado; **autodeploy desde `main`**; previews automáticos en PRs.
- **Logo**: Sprint 0 con **wordmark temporal** Inter bold + icono lucide, sin bloquear cimientos por branding final. Logo definitivo va a SECONDARY o post-lanzamiento.
- **Proyectos a crear**: Supabase (dev + prod eu-west), Railway, Stripe, Cloudflare, Resend, Sentry, Better Stack, Umami, GitHub repo `burnpilot`.
- **Docs guía**: `AGENTS.md` y `cursorrules.txt` se respetan tal cual; divergencias (Netlify) documentadas en P13 del AGENTS.md del proyecto.

---

## 23. Cambios respecto a v1.2

1. **§3 Principios de producto** (nuevo): 5 anclas de decisión.
2. **§8 UX de allocations** (nuevo): backend mantiene `allocation_pct`, frontend lo oculta por defecto, solo 3 opciones en el selector.
3. **§9 Recommended Stacks**: ambición contenida, sin IA en MVP, comparador simple.
4. **§10 Lifetime Founder**: tratamiento sobrio, sin secuestrar copy ni UX.
5. **§11 Alcance MVP**: dividido explícitamente en **CORE MVP** y **SECONDARY MVP**.
6. **§19 Roadmap**: 8 sprints (se añade Sprint 5 de SECONDARY) con nota explícita de plazo **realista 5-7 semanas**. Sprint 5 es sacrificable a post-lanzamiento si aprieta.
7. **§21 Riesgo R11**: explícito contra plazos optimistas.
8. **§22 Operativas**: confirmaciones cerradas (dominio, email, Netlify autodeploy, logo temporal).
9. **Tesis intacta**: se mantiene posicionamiento "spend optimizer stack-aware", projects, savings, recommended stacks, lifetime. No se vuelve a v1.1.

---

## 24. Estado de confirmaciones

- Plan v1.3: **aprobado para arrancar Sprint 0** con los ajustes integrados.
- Operativas: **cerradas** (§22).
- Próximo paso: salir de Plan mode y ejecutar Sprint 0.

Cuando me digas "adelante, arranca Sprint 0", salimos de Plan mode y empiezo por:

1. Scaffold del monorepo NPM Workspaces.
2. Configuración de TypeScript, ESLint, Prettier, CI.
3. `apps/web` vacío con Vite + React + Tailwind + shadcn inicializado.
4. `apps/api` con Express + TS + ruta `GET /health` funcionando.
5. `supabase/` con migración 0001 stub.
6. Deploy hola mundo a Netlify (`app.burnpilot.app`) y Railway (`api.burnpilot.app`).
7. Wordmark temporal.
8. Primer commit honesto: `chore(repo): scaffold monorepo saas-burnrate`.
