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

1. [Railway](https://railway.app) → servicio del backend (raíz del repo o `apps/api` según lo tengas).
2. **Variables** → crea una fila por cada clave de `apps/api/.env` que ya pasó `go-live:check`, en especial:
   - `ALLOWED_ORIGIN` = `https://app.burnpilot.app` (exactamente el origen del front; CORS).
   - `APP_URL` y `MARKETING_URL` = URL pública del front.
   - `SUPABASE_*` y `STRIPE_*` iguales que en local pero en modo **live** cuando toque.
3. **Deploy** → espera build verde. Abre la URL pública de Railway + `/health` → debe responder OK.
4. Anota la URL pública definitiva, p. ej. `https://api.burnpilot.app` → es la que pondrás en `VITE_API_URL` en Netlify.

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

- **CORS en el front:** `ALLOWED_ORIGIN` en Railway debe ser exactamente `https://tu-dominio-front` sin barra final.
- **Build Netlify sin Supabase:** faltan `VITE_*` en entorno de build o no redeploy tras cambiarlas.
- Más: [docs/runbook.md](runbook.md). Tras el despliegue, referencia **sin secretos:** [production_environment.md](production_environment.md).
