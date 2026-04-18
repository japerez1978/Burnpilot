# AGENTS.md — Leadstodeals
> Instrucciones estándar para Claude y cualquier agente de IA que trabaje
> en proyectos de Leadstodeals. Válido para cualquier tipo de app,
> con o sin HubSpot, con o sin Railway, con cualquier base de datos.
>
> ── Copia este archivo a la raíz de cada proyecto nuevo ──
> ── Completa ÚNICAMENTE la sección [PROYECTO] al final ──
> ── Las secciones 1–14 son globales y NO se modifican ──

---

## 0. CÓMO USAR ESTE ARCHIVO

1. Copia `AGENTS.md` a la raíz del repo del nuevo proyecto
2. Rellena la sección `[PROYECTO]` (P1–P11) con los detalles concretos
3. Al iniciar una sesión con Claude, pega el contenido completo del archivo
4. Claude tendrá todo el contexto para trabajar como un equipo senior

---

## 1. IDENTIDAD DEL PROYECTO

```
Proyecto:        [NOMBRE DEL PROYECTO]
Cliente:         [NOMBRE DEL CLIENTE / "Interno Leadstodeals"]
Tenant ID:       [UUID del tenant en Supabase / "N/A si no es multi-tenant"]
Repo GitHub:     github.com/japerez1978/[NOMBRE-REPO]
Frontend URL:    [https://nombre.vercel.app / otra plataforma]
Backend URL:     [https://nombre.railway.app / N/A si no hay backend]
Base de datos:   [Supabase / PostgreSQL / SQLite / N/A]
Integraciones:   [HubSpot / Stripe / Notion / Ninguna / ...]
Fecha inicio:    [FECHA]
```

---

## 2. STACK TECNOLÓGICO BASE

> El stack concreto del proyecto se especifica en la sección P2.
> Estas son las opciones disponibles en Leadstodeals.

### Frontends disponibles
- React + Vite + Tailwind CSS → apps interactivas complejas
- HTML + CSS + JavaScript puro → herramientas simples, calculadoras
- Next.js → apps que necesiten SSR o SEO

### Backends disponibles
- Node.js + Express en Railway → cuando hay APIs externas o lógica servidor
- Vercel Functions → lógica servidor simple sin servidor dedicado
- Sin backend → apps puramente frontend con Supabase directo

### Bases de datos disponibles
- Supabase → base de datos principal con auth y storage incluidos
- SQLite local → prototipos y herramientas sin backend
- Sin base de datos → apps estáticas o que usan APIs externas

### Integraciones opcionales (solo si el proyecto las necesita)
- HubSpot API → CRM del cliente
- Stripe → pagos y suscripciones
- Resend → emails transaccionales
- Notion API → documentación y gestión
- Cualquier otra API REST

### Herramientas de desarrollo (siempre las mismas)
- Editor: Antigravity (VSCode)
- Versiones: GitHub (japerez1978)
- Deploy frontend: Vercel
- Deploy backend/servidor: Railway
- Tipos: TypeScript (cuando el proyecto lo requiera)

---

## 3. ESTRUCTURA DE CARPETAS

### Proyecto solo frontend (HTML/JS puro)
```
proyecto/
  ├── index.html
  ├── css/
  ├── js/
  └── assets/
```

### Proyecto React (frontend solo)
```
proyecto/src/
  ├── components/
  │     ├── ui/           # Genéricos (Button, Input, Modal, Spinner)
  │     └── features/     # Componentes de negocio por módulo
  ├── pages/              # Una carpeta por ruta
  ├── hooks/              # Custom hooks reutilizables
  ├── services/           # Llamadas a APIs — NUNCA en componentes
  ├── store/              # Estado global (Zustand si se usa)
  ├── types/              # Tipos TypeScript
  ├── utils/              # Funciones puras
  └── constants/          # Constantes
```

### Proyecto fullstack (frontend + backend separados)
```
proyecto/
  ├── apps/
  │     ├── web/          # Frontend (Vercel)
  │     └── api/          # Backend (Railway u otro)
  └── packages/
        ├── types/        # Tipos compartidos
        └── utils/        # Utilidades compartidas
```

### Backend Node.js (cuando existe)
```
apps/api/src/
  ├── routes/             # Definición de rutas
  ├── controllers/        # Lógica de cada endpoint (delgados)
  ├── services/           # Lógica de negocio (gordos)
  ├── middleware/
  │     ├── auth.ts       # Verificación JWT
  │     ├── cors.ts
  │     └── rateLimit.ts
  ├── types/
  └── utils/
```

---

## 4. REGLAS MULTI-TENANT
### Solo aplican si el proyecto es multi-tenant. Ignorar si no lo es.

### 4.1 El tenant_id va en el JWT, NUNCA en la URL

```typescript
// ❌ MAL — expone el tenant en la URL
GET /api/tenants/123/datos

// ✅ BIEN — el tenant viene del JWT automáticamente
GET /api/datos
```

### 4.2 Middleware de tenant obligatorio en todos los endpoints

```typescript
export const requireTenant = (req, res, next) => {
  const tenant_id = req.user?.tenant_id
  if (!tenant_id) return res.status(401).json({ error: 'Sin tenant' })
  req.tenant_id = tenant_id
  next()
}
router.get('/', requireAuth, requireTenant, controller)
```

### 4.3 Row Level Security en Supabase — todas las tablas

```sql
ALTER TABLE [tabla] ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON [tabla]
  FOR ALL USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
```

### 4.4 Verificar módulos activos antes de servir cualquier funcionalidad

```typescript
// Frontend
const { hasModule } = useTenantStore()
if (!hasModule('nombre_modulo')) return <UpgradePrompt />

// Backend
const activo = await supabase
  .from('app_modules')
  .select('activo')
  .eq('tenant_id', tenant_id)
  .eq('modulo_slug', modulo)
  .single()
```

---

## 5. ESTÁNDARES DE CÓDIGO

### 5.1 Un componente, una responsabilidad

```typescript
// ❌ MAL — >100 líneas mezclando fetch + lógica + render
const Pagina = () => { /* todo junto */ }

// ✅ BIEN — separado por responsabilidad
const Pagina     = () => <Contenedor />
const Contenedor = () => {
  const { datos, isLoading, error } = useDatos()
  if (isLoading) return <Spinner />
  if (error)     return <Error mensaje={error} />
  return <Vista datos={datos} />
}
const Vista = ({ datos }) => <div>...</div>
```

### 5.2 Custom hooks para toda la lógica

```typescript
// ✅ La lógica vive en el hook, no en el componente
const useDatos = () => {
  const [datos, setDatos]       = useState([])
  const [isLoading, setLoading] = useState(false)
  const [error, setError]       = useState(null)

  const fetch = async () => {
    setLoading(true)
    try {
      setDatos(await miServicio.getAll())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])
  return { datos, isLoading, error, refetch: fetch }
}
```

### 5.3 Siempre los tres estados de UI

```typescript
if (isLoading)     return <Spinner />
if (error)         return <Error mensaje={error} />
if (!datos.length) return <Vacio />
return <Lista datos={datos} />
```

### 5.4 Props tipadas con TypeScript

```typescript
// ❌ MAL — sin tipos
const Boton = ({ label, onClick, disabled }) => ...

// ✅ BIEN — con tipos
interface BotonProps {
  label:     string
  onClick:   () => void
  disabled?: boolean
  variante?: 'primario' | 'secundario' | 'peligro'
  cargando?: boolean
}
const Boton = ({ label, onClick, disabled = false, variante = 'primario', cargando = false }: BotonProps) => ...
```

### 5.5 Controladores delgados, servicios gordos (cuando hay backend)

```typescript
// ❌ MAL — lógica mezclada en el controlador
export const getDatos = async (req, res) => {
  const r = await fetch('https://api.externa.com/...')
  const d = await r.json()
  res.json(d.results.filter(...).map(...))
}

// ✅ BIEN — controlador delgado
export const getDatos = async (req, res) => {
  try {
    const datos = await miServicio.getAll(req.tenant_id)
    res.json({ ok: true, data: datos })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
```

### 5.6 Formato de respuestas API — siempre el mismo

```typescript
// Éxito
{ ok: true,  data: [...], meta: { total: 42, page: 1 } }

// Error
{ ok: false, error: 'Mensaje legible', code: 'UNAUTHORIZED' }
```

### 5.7 Patrón Result para manejo de errores

```typescript
type Result<T, E = Error> =
  | { ok: true;  value: T }
  | { ok: false; error: E }

const ok  = <T>(value: T): Result<T>        => ({ ok: true,  value })
const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

// Uso
const result = await crearRegistro(data)
if (!result.ok) return res.status(500).json({ ok: false, error: result.error.message })
res.json({ ok: true, data: result.value })
```

### 5.8 Nunca `any` en TypeScript

```typescript
// ❌ MAL
const parsear = (data: any) => data.campo

// ✅ BIEN
const parsear = (data: unknown): MiTipo => {
  // validar y tipar explícitamente
}
```

---

## 6. SEGURIDAD — CHECKLIST OBLIGATORIO

- [ ] Secrets y tokens NUNCA en el frontend — solo en variables de entorno del servidor
- [ ] Ningún secret en el código fuente ni en GitHub
- [ ] Autenticación verificada en cada request del backend
- [ ] Inputs sanitizados antes de enviarlos a cualquier API o base de datos
- [ ] HTTPS siempre — Vercel y Railway lo dan gratis
- [ ] CORS configurado — solo permite el origen autorizado
- [ ] Rate limiting activo si hay backend expuesto
- [ ] Logs sin datos sensibles (sin tokens, sin contraseñas, sin PII)
- [ ] Variables de entorno nuevas añadidas al `.env.example`
- [ ] RLS activo en Supabase si el proyecto es multi-tenant

---

## 7. GIT — ESTÁNDARES

### Conventional Commits

```bash
# Formato: tipo(ámbito): descripción en minúsculas
feat(formulario): añadir validación de campos obligatorios
fix(api): corregir paginación en listado de registros
chore(deps): actualizar dependencias npm
refactor(auth): extraer lógica de token a función reutilizable
docs(readme): actualizar instrucciones de instalación
test(calculos): añadir tests del módulo de precios
style(componentes): formatear con prettier
```

### Tipos de commit

| Tipo | Cuándo usar |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `chore` | Mantenimiento, dependencias |
| `refactor` | Mejora sin cambio funcional |
| `docs` | Documentación |
| `test` | Tests |
| `style` | Formato, espacios |

### Estrategia de ramas

```bash
main        # Producción — nunca commitear directamente
develop     # Desarrollo — rama base para PR
feat/nombre # Nueva funcionalidad
fix/nombre  # Corrección de bug
```

---

## 8. PERFORMANCE — REGLAS BÁSICAS

### Frontend
- Lazy loading de rutas — cada página carga solo cuando se necesita
- Debounce en buscadores — mínimo 300ms antes de llamar a la API
- Paginación siempre en listados — nunca cargar >50 registros sin paginar
- `useMemo` y `useCallback` solo cuando hay problema real de rendimiento

### Backend (cuando existe)
- Seleccionar solo los campos necesarios — nunca `SELECT *`
- Índices en columnas más consultadas
- Paginación en todos los endpoints de listado
- Timeout en todas las llamadas a APIs externas
- Cachear respuestas que no cambian frecuentemente

```typescript
// ✅ Paginación siempre
GET /api/registros?page=1&limit=20

// ✅ Solo campos necesarios
const { data } = await supabase
  .from('tabla')
  .select('id, nombre, estado')   // no .select('*')
  .range(offset, offset + limit - 1)
```

---

## 9. VARIABLES DE ENTORNO

### Frontend
```bash
# Solo variables públicas con prefijo VITE_
VITE_API_URL=https://mi-api.railway.app
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
# Añadir las específicas del proyecto en la sección P9
```

### Backend
```bash
# Variables privadas — nunca en el frontend
PORT=3000
ALLOWED_ORIGIN=https://mi-app.vercel.app
# Añadir las específicas del proyecto en la sección P9
```

### Reglas críticas de variables de entorno
- NUNCA subir `.env` a GitHub — añadir al `.gitignore`
- SIEMPRE mantener `.env.example` actualizado con las claves (sin valores)
- En Railway Raw Editor: los valores NO llevan comillas dobles
  - ✅ Correcto: `MI_TOKEN=valor-sin-comillas`
  - ❌ Incorrecto: `MI_TOKEN="valor-con-comillas"`

### Validación al arrancar el servidor
```typescript
// config/env.ts — OBLIGATORIO en todos los proyectos con backend
const required = ['VARIABLE_1', 'VARIABLE_2'] // definir en sección P9
const missing  = required.filter(key => !process.env[key])
if (missing.length) {
  console.error('❌ Variables de entorno faltantes:', missing)
  process.exit(1)
}
```

---

## 10. ESTADO GLOBAL (cuando se usa React + Zustand)

```typescript
// store/appStore.ts — adaptar al dominio del proyecto
import { create } from 'zustand'

interface AppStore {
  // Estado de sesión (si hay auth)
  usuario:    Usuario | null
  setUsuario: (u: Usuario | null) => void

  // Estado de tenant (solo si es multi-tenant)
  tenant_id:  string | null
  modules:    string[]
  setTenant:  (id: string, modules: string[]) => void
  hasModule:  (m: string) => boolean
}

export const useAppStore = create<AppStore>((set, get) => ({
  usuario:    null,
  setUsuario: (u) => set({ usuario: u }),

  tenant_id:  null,
  modules:    [],
  setTenant:  (id, modules) => set({ tenant_id: id, modules }),
  hasModule:  (m) => get().modules.includes(m),
}))
```

---

## 11. LOGGING ESTRUCTURADO (cuando hay backend)

```typescript
// utils/logger.ts
export const log = (
  level:  'info' | 'warn' | 'error',
  action: string,
  data:   Record<string, unknown> = {}
) => {
  console.log(JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    action,
    ...data,
  }))
}

// Uso
log('info',  'registro_creado',  { id: resultado.id })
log('error', 'api_externa_error', { mensaje: err.message })
// NUNCA: log('info', 'token', { token: process.env.SECRET })
```

---

## 12. TESTING — MÍNIMOS OBLIGATORIOS

```typescript
// Testear siempre:
// 1. Lógica de negocio crítica (cálculos, reglas, validaciones)
// 2. Funciones puras de utilidad
// 3. Middlewares de auth si los hay

describe('[Módulo]', () => {
  it('caso de éxito principal', async () => { ... })
  it('caso de error esperado', async () => { ... })
  it('caso límite / edge case', async () => { ... })
})
```

---

## 13. CHECKLIST ANTES DE GIT PUSH

- [ ] El código compila sin errores (`npm run build`)
- [ ] No hay `console.log` de debug en el código
- [ ] No hay secrets ni tokens en el código
- [ ] Variables nuevas añadidas al `.env.example`
- [ ] Endpoints devuelven formato estándar `{ ok, data }` o `{ ok, error }`
- [ ] Autenticación y tenant validados en endpoints nuevos (si aplica)
- [ ] RLS activo en tablas nuevas de Supabase (si aplica)
- [ ] Paginación implementada en listados
- [ ] Los tres estados de UI manejados (loading, error, vacío)
- [ ] El commit sigue el formato Conventional Commits

---

## 14. CHECKLIST ANTES DE DESPLEGAR A PRODUCCIÓN

- [ ] Variables de entorno configuradas en Vercel y/o Railway (sin comillas)
- [ ] Health check responde correctamente (si hay backend)
- [ ] Migraciones de base de datos aplicadas (si aplica)
- [ ] Flujo completo probado en local antes de subir
- [ ] CORS configurado para el dominio de producción
- [ ] Rate limiting activo (si hay backend expuesto)
- [ ] El `.env` NO está en el repo (verificar `.gitignore`)

---
---
---

# [PROYECTO] — ESPECIFICACIONES CONCRETAS

> ⬇️ Rellena esta sección para cada proyecto nuevo.
> Las secciones 1–14 de arriba son globales — NO se modifican.

---

## P1. IDENTIFICACIÓN

```
Proyecto:     [NOMBRE]
Cliente:      [CLIENTE / "Interno"]
Tenant ID:    [UUID en Supabase / "N/A"]
Descripción:  [Una línea: qué hace la app y para quién]
Tipo de app:  [SaaS multi-tenant / App de cliente / Herramienta interna / Landing]
```

---

## P2. STACK CONCRETO DE ESTE PROYECTO

```
Frontend:     [React+Vite / HTML puro / Next.js]
Estilos:      [Tailwind / CSS puro / otro]
Backend:      [Node.js+Express en Railway / Vercel Functions / Sin backend]
Base de datos:[Supabase / PostgreSQL / Sin BD]
Auth:         [Supabase Auth / Sin auth / otro]
Estado global:[Zustand / useState local / Sin estado global]
Integraciones:[HubSpot / Stripe / Ninguna / lista]
PDF:          [jsPDF / react-pdf / Sin PDF]
```

---

## P3. INTEGRACIONES EXTERNAS (solo las que usa este proyecto)

### [Nombre de la integración — ej: HubSpot]
```
URL base:     [https://api.ejemplo.com]
Auth:         [Bearer token / API key / OAuth]
Objeto/recurso principal: [deals / contacts / ...]
Endpoints usados:
  - GET  /ruta → descripción
  - POST /ruta → descripción
  - PATCH /ruta/:id → descripción
Notas especiales: [ej: proxy necesario por CORS / token en servidor]
```

### [Otra integración si la hay]
```
[mismo formato]
```

---

## P4. ESTRUCTURA DE DATOS

### Tablas Supabase (si usa Supabase)

```sql
-- Solo las tablas específicas de este proyecto
-- Las tablas base del SaaS (tenants, users, etc.) ya existen

CREATE TABLE [nombre] (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  UUID REFERENCES tenants(id),  -- solo si es multi-tenant
  -- campos específicos del proyecto
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE [nombre] ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aislamiento" ON [nombre]
  FOR ALL USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
  -- o si no es multi-tenant: FOR ALL USING (auth.uid() = user_id);
```

### Estructura de datos clave (si no usa Supabase)

```typescript
// Tipos principales del proyecto
interface [NombreEntidad] {
  id:    string
  // campos...
}
```

---

## P5. PANTALLAS / VISTAS PRINCIPALES

```
1. [Nombre pantalla]  → [Descripción: qué muestra y qué hace el usuario]
2. [Nombre pantalla]  → [Descripción]
3. [Nombre pantalla]  → [Descripción]
```

---

## P6. CAMPOS DEL FORMULARIO PRINCIPAL

| Campo en app | Propiedad/campo BD | Tipo | Validación / Lógica especial |
|---|---|---|---|
| [nombre visible] | [nombre técnico] | [text/select/number...] | [reglas] |

---

## P7. ENDPOINTS DEL BACKEND (si tiene backend propio)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | /health | No | Health check |
| GET | /[recurso] | Sí | Listar con paginación |
| POST | /[recurso] | Sí | Crear nuevo registro |
| PATCH | /[recurso]/:id | Sí | Actualizar campos |
| DELETE | /[recurso]/:id | Sí | Eliminar (soft delete preferible) |

---

## P8. LÓGICA DE NEGOCIO ESPECÍFICA

```
[Describe aquí cualquier regla particular de este proyecto]

Ejemplos:
- Numeración automática de registros y lógica de versiones
- Cálculo de precios, márgenes o descuentos
- Estados y transiciones permitidas entre estados
- Reglas de validación no estándar
- Integraciones que deben mantenerse sincronizadas
```

---

## P9. VARIABLES DE ENTORNO DE ESTE PROYECTO

### Frontend (.env)
```bash
VITE_API_URL=
# añadir las variables específicas
```

### Backend (.env) — si tiene backend
```bash
PORT=3000
ALLOWED_ORIGIN=
# añadir las variables específicas
```

---

## P10. USUARIOS Y ROLES (si tiene auth)

| Rol | Permisos | Quién lo tiene |
|---|---|---|
| admin | Todo | [nombres o descripción] |
| user | [qué puede hacer] | [descripción] |
| viewer | Solo lectura | [descripción] |

---

## P11. DISEÑO Y ESTILO

```
Paleta:     [colores principales, ej: azul oscuro #0b0d11 + verde #00c896]
Fuente:     [Space Grotesk / Inter / sistema]
Modo:       [dark / light / ambos]
Referencia: [URL de Figma / "sin diseño previo, generar libremente"]
```

---

## P12. NOTAS Y DECISIONES TÉCNICAS

```
[Registra aquí decisiones importantes durante el desarrollo]

Formato: YYYY-MM-DD: decisión tomada y motivo

Ejemplo:
2026-03-31: Usar HubSpot Negocios estándar en lugar de objeto custom
            para simplificar permisos — el objeto custom requería
            scopes adicionales que complicaban la app privada.

2026-03-31: Variables en Railway Raw Editor sin comillas dobles —
            las comillas se incluyen como parte del valor y rompen
            la autenticación con APIs externas.
```

---

## P13. ESTADO ACTUAL Y PRÓXIMOS PASOS

```
Estado:          [En diseño / En desarrollo / En producción / En pausa]
URL producción:  [si aplica]
URL local:       http://localhost:5173 (frontend) / http://localhost:3000 (backend)

Completado:
  ✅ [hito completado]

En curso:
  🔄 [tarea en progreso]

Pendiente:
  ⏳ [próximo paso]
  ⏳ [siguiente paso]
```
