# BurnPilot — go-live paso a paso

Guía única: qué hacer en qué orden. **Los paneles web (Netlify, Railway, Stripe…) solo los puedes configurar tú** con tu cuenta; este documento dice exactamente qué clics y qué pegar desde tu `.env.local` / `.env` local ya verificados.

## 0. Prerrequisito en tu Mac

En la raíz del monorepo:

```bash
cp apps/web/.env.example apps/web/.env.local   # si no existe
cp apps/api/.env.example apps/api/.env         # si no existe
```

Rellena valores reales (Supabase, Stripe, URLs). Luego:

```bash
npm run go-live:check
```

Cuando pase sin errores, las mismas claves y valores (sin comillas raras) van a Netlify y Railway.

**Sacar bloques listos para pegar** (solo en tu Mac, no compartas la salida):

```bash
npm run env:deploy-hints
npm run env:deploy-hints -- --netlify   # solo VITE_*
npm run env:deploy-hints -- --railway   # solo API
```

Para simular producción:

```bash
npm run go-live:check -- --production
```

---

## 1. Supabase (proyecto de producción)

1. Abre [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto.
2. **SQL** → asegúrate de haber aplicado todas las migraciones en `supabase/migrations/` en orden (18 → 30).
3. **Authentication** → **URL configuration**:
   - **Site URL:** `https://app.burnpilot.app` (o tu dominio Netlify definitivo).
   - **Redirect URLs:** añade `https://app.burnpilot.app/**`, `http://localhost:5173/**` si sigues desarrollando.
4. **Settings → API:** copia **Project URL** y **anon/public key** → ya deben coincidir con `VITE_SUPABASE_*` y `SUPABASE_*` en tus env.

### Datos en la base de datos (importante)

Lo que ves en local (herramientas, proyectos, filas en tablas) vive en **tu** instancia de Postgres (normalmente el proyecto Supabase que usas en desarrollo). **Producción** usa otro despliegue / otro proyecto: las tablas pueden estar vacías aunque las variables estén bien. Las migraciones crean el esquema; los datos hay que crearlos de nuevo en producción o migrarlos con cuidado (dump/restore entre proyectos solo si sabes lo que haces).

---

## 2. API en Railway (primero la API)

1. **Repo y build:** el backend espera el **monorepo en la raíz** (donde están `railway.json`, `nixpacks.toml` y `packages/`). El build debe ejecutar `npm run build:api` (types + utils + API); el arranque es `node apps/api/dist/server.js`. Si en Railway el servicio tenía **Root Directory** en `apps/api`, cámbialo a la raíz del repo para que ese pipeline sea el que corre.
2. **Variables de entorno:** en [Railway](https://railway.app) → tu servicio **API** → **Variables**.

   **Forma rápida:** en tu Mac (después de `go-live:check`):

   ```bash
   npm run env:deploy-hints -- --railway
   ```

   Copia cada línea `CLAVE=valor` al panel (o usa el editor masivo si tu plan lo permite). **No** subas el archivo `.env` al repo.

   **Checklist** (mismos nombres que `apps/api/.env.example`; ajusta URLs a **https** y dominios reales):

   | Variable | Notas |
   |----------|--------|
   | `NODE_ENV` | `production` |
   | `LOG_LEVEL` | p. ej. `info` |
   | `PORT` | Suele inyectarla Railway; si no, `3000` |
   | `ALLOWED_ORIGIN` | Un origen del front (sin barra final). Si solo tienes un dominio en prod, basta. |
   | `ALLOWED_ORIGINS` | **Opcional:** varios dominios separados por **coma** si el front responde en apex y subdominio (p. ej. `https://burnpilot.app,https://www.burnpilot.app,https://app.burnpilot.app`). Evita CORS cuando Netlify usa `burnpilot.app` y tenías solo `app.burnpilot.app` en `ALLOWED_ORIGIN`. |
   | `APP_URL` | URL pública del front (misma idea que Netlify). |
   | `MARKETING_URL` | Igual que `APP_URL` si solo tienes una web. |
   | `SUPABASE_URL` | Igual que en Supabase → Settings → API (y que `VITE_SUPABASE_URL`). |
   | `SUPABASE_ANON_KEY` | Igual que `VITE_SUPABASE_ANON_KEY`. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor; nunca en el front. |
   | `SUPABASE_JWT_SECRET` | Settings → API → JWT Secret (proyecto correcto). |
   | `STRIPE_SECRET_KEY` | Modo test o **live** según fase. |
   | `STRIPE_WEBHOOK_SECRET` | Del webhook que apunte a **esta** API (`/webhooks/stripe`). |
   | `STRIPE_PRICE_ID_PRO_MONTHLY` / `YEARLY` / `LIFETIME` | IDs de precios en Stripe. |
   | `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Si envías email desde la API. |
   | `CRON_SECRET` | Si usas cron firmado. |
   | `SENTRY_DSN` / `BETTER_STACK_SOURCE_TOKEN` | Opcional, observabilidad. |
   | `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Para Roadmappilot / IA en Herramientas (`/v1/tools/ai-*`). Sin esto, esos endpoints responden 503. |

   Opcionales avanzados: `STACKOS_AGENT_URL`, `STACKOS_AGENT_API_KEY`, `STACKOS_AGENT_TIMEOUT_MS` (agente HTTP externo).

3. **Deploy** → espera build verde. Abre la URL pública del servicio + `/health` → debe responder OK (JSON con `ok`).
4. Anota la URL HTTPS definitiva (p. ej. `https://api.burnpilot.app`) → es la que pondrás en **`VITE_API_URL`** en Netlify (sección 3).

---

## 3. Frontend en Netlify

1. **Build:** el repo tiene `netlify.toml` en la **raíz** del monorepo: `npm ci && npm run build:web`, publish `apps/web/dist`. En Netlify → **Site configuration → Build settings**: **Base directory** vacío (raíz del repo), para que se use ese archivo.
2. [Netlify](https://app.netlify.com) → sitio del front → **Site configuration → Environment variables**.
3. Añade las mismas claves que en `apps/web/.env.local` (puedes generarlas con `npm run env:deploy-hints -- --netlify`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` = URL HTTPS de la API (Railway), **no** localhost.
   - Opcional: `VITE_AUTH_SITE_ORIGIN`, `VITE_SENTRY_DSN`, `VITE_UMAMI_WEBSITE_ID`.
4. **Deploys** → “Trigger deploy” para que Vite recompile con las variables.
5. **Domain:** conecta `app.burnpilot.app` (o el dominio que uses) y SSL.

Los `.env` locales **no** se suben a Git: hay que copiarlos a mano (o con el script de arriba) a Netlify y Railway.

---

## 4. Stripe

1. [Stripe Dashboard](https://dashboard.stripe.com) → modo **Live** cuando vayas en serio.
2. **Developers → Webhooks** → endpoint: `https://api.burnpilot.app/webhooks/stripe` (tu URL real de API).
3. Copia el **Signing secret** → `STRIPE_WEBHOOK_SECRET` en Railway.
4. Comprueba precios y `STRIPE_PRICE_ID_*` en variables de Railway.

---

## 5. Cosas que no son código

- **Legales:** sustituir borradores en `/legal/privacy` y `/legal/terms` tras asesoría (texto en código o CMS).
- **Sentry / Umami:** crea proyecto/sitio y pega DSN / website ID en Netlify.
- **Better Stack (u otro):** monitor GET `https://…/health` y la URL de la web.
- **Backup Supabase:** ver [runbook § Backups](runbook.md#backups-supabase); prueba un restore antes de datos críticos.

---

## 6. Smoke test en producción

1. Registro nuevo usuario → email de confirmación si aplica.
2. Onboarding → crear una herramienta → ver dashboard.
3. Billing: checkout de prueba (modo test primero, luego live si aplica).
4. `/settings/account` → “Eliminar cuenta” solo si `VITE_API_URL` apunta bien a la API con service role.

---

## Si algo falla

- **CORS en el front:** el origen del navegador (p. ej. `https://burnpilot.app`) debe estar en `ALLOWED_ORIGIN` o en la lista `ALLOWED_ORIGINS` (coma, sin espacios). Comprueba en DevTools → red el valor exacto del header `Origin`.
- **Build Netlify sin Supabase:** faltan `VITE_*` en entorno de build o no redeploy tras cambiarlas.
- Más: [docs/runbook.md](runbook.md). Tras el despliegue, referencia **sin secretos:** [production_environment.md](production_environment.md).
