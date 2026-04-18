# Informe Técnico: Reestructuración y Estabilización de Ecosistema SaaS
## Arquitectura: Monorepositorio Unificado (NPM Workspaces)

### 1. Estado Inicial y Análisis de Fallos
El ecosistema sufría de una fragmentación de repositorios (`leadstodeals-scoring`, `leadstodeals-admin`, etc.) que impedía una resolución de dependencias consistente en entornos de integración continua (CI/CD) como Vercel.

- **Problema A (Bloqueo de Build)**: Las aplicaciones dependían de `core-saas` mediante rutas relativas (`file:../core-saas`). Vercel, al clonar solo el repositorio de la aplicación, no tenía acceso a la carpeta hermana, provocando el error `UNLOADABLE_DEPENDENCY`.
- **Problema B (Inconsistencia de Versiones)**: Se detectaron versiones inexistentes de `@supabase/supabase-js` (ej. `2.103.0`) que impedían la resolución de tipos y el empaquetado estable.

---

### 2. Transformación Arquitectónica: El Monorepositorio
Se optó por una migración hacia una estructura de **Monorepositorio** utilizando **NPM Workspaces** para centralizar la gobernanza del código.

#### Cambios en la Raíz (`/PROYECTOS SAAS`):
- **Inicialización de Workspace**: Se creó un `package.json` maestro que define los límites de las aplicaciones y la librería compartida.
- **Hoisting de Dependencias**: Al ejecutar `npm install` en la raíz, NPM eleva todas las dependencias comunes al `node_modules` global, optimizando el espacio y garantizando que todas las aplicaciones usen exactamente la misma versión del motor.
- **Consolidación de Versión Controlada**: Se eliminaron los metadatos de Git internos (`.git/`) y se centralizó el historial en un único repositorio: `leadstodeals-ecosystem`.

---

### 3. Blindaje del Sistema de Construcción (Vite Hardening)
Para asegurar que Vite (y su bundler Rolldown) resolviera las dependencias en el entorno "hoisted" de Vercel, se inyectó una capa de **Master Aliases** en los archivos `vite.config.js`:

#### Lógica de Resolución Absoluta:
```javascript
resolve: {
  alias: {
    'core-saas': path.resolve(__dirname, '../core-saas'),
    '@supabase/supabase-js': path.resolve(__dirname, '../node_modules/@supabase/supabase-js'),
    '@tanstack/react-query': path.resolve(__dirname, '../node_modules/@tanstack/react-query')
  }
}
```
> [!NOTE]
> Esta configuración fuerza al empaquetador a buscar las librerías en la raíz del monorepositorio, ignorando cualquier inconsistencia que pudiera surgir por la estructura de carpetas de Vercel.

#### Permisos de Sistema de Archivos:
Se añadió `server.fs.allow: ['..']` para permitir que el servidor de desarrollo y el de construcción accedan a archivos fuera del "Root Directory" de la aplicación (específicamente para leer el `core-saas`).

---

### 4. Resolución de Errores de Ejecución (Runtime/Blank Screen)
Tras el primer despliegue exitoso, se detectaron fallos de renderizado en blanco ("Blank Screens").

- **Causa**: Las aplicaciones de Admin y Sats estaban intentando inicializar el cliente de Supabase sin credenciales.
- **Solución**: 
    1. **Inyección de Secretos**: Se guiaron los pasos para configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en los ajustes de Vercel.
    2. **Normalización de Supabase**: Se forzó la versión estable **`2.49.1`** en todo el ecosistema para evitar conflictos de API.

---

### 5. Configuración de Despliegue en Vercel
Se estabilizaron los proyectos mediante los siguientes ajustes manuales:
- **Root Directory**: Configurado por aplicación (ej. `leadstodeals-scoring`).
- **Build Step Toggle**: Activación obligatoria de *"Include files outside of the Root Directory"* para permitir la ingesta del código compartido del core.

### 6. Conclusión de Infraestructura
El ecosistema ahora es **atómico y predecible**. Cualquier cambio en el `core-saas` se propaga instantáneamente a todas las aplicaciones, y el sistema de construcción está blindado contra cambios de rutas en el servidor de CI/CD.

---
**Autor**: Antigravity AI Engine
**Estado**: Estable / Producción
**Tecnologías**: React 19, Vite 6/8, Supabase, NPM Workspaces.
