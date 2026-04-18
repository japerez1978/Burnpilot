# 🏗️ Technical Architecture Report: Multi-Tenant SaaS v4.0

**Para:** CTO / Ultra-Senior Full Stack Developer
**Asunto:** Consolidación de Infraestructura y Desacoplamiento de Lógica Core

## 1. Visión Holística
Hemos transicionado de una arquitectura de "SILOS" (donde cada aplicación gestionaba su propia lógica de tenants y auth) a una **Arquitectura de Núcleo Compartido (Core-Centric)**. El objetivo es eliminar la deuda técnica por duplicación y garantizar una fuente única de verdad para el estado de negocio.

---

## 2. El Módulo `core-saas` (Shared Library)
Implementado como un módulo local (`file:../core-saas`) para evitar la latencia de registros externos y maximizar la coherencia en desarrollo.

- **Stack**: React + TanStack Query (v5) + Supabase JS SDK.
- **Deduplicación de Red**: Se ha centralizado la instancia de `supabaseClient`. Ninguna aplicación instancia Supabase por su cuenta; consumen el cliente del Core para asegurar que las suscripciones a eventos de Auth sean consistentes.
- **Capa de Abstracción de Datos (Hooks)**:
  - `useTenant(userId, email)`: Implementa lógica de **Auto-linking**. Si un `auth.uid()` no tiene vínculo en `tenant_users` pero existe una invitación previa por email, el hook realiza el `UPDATE` atómico para vincular la identidad en el primer login.
  - `useUserAccess(tenantUserId)`: Gestiona la visibilidad de productos. Basado en slugs (`scoring`, `ofertas`) para facilitar el `Feature Flagging`.

---

## 3. Estrategia de Persistencia e Integridad (Database)
Se ha normalizado el esquema para resolver colisiones de tipos y RLS.

### Consolidación de Tipos de Datos:
- **`tenant_users.id`**: UUID (Primary Key).
- **`tenants.id`**: INT8 (Identity).
- **`user_app_access`**: Tabla de unión (Join Table) que utiliza `tenant_user_id (UUID)` y `tenant_id (INT8)`.
- **Corrección Crítica**: Se resolvió el error de casting `bigint = uuid` en las políticas RLS mediante la correcta tipificación de la tabla de accesos y el uso de `CASCADE` en la refactorización de esquemas.

### Seguridad a Nivel de Fila (RLS):
Las políticas se han reescrito para ser herméticas:
```sql
CREATE POLICY "Users view access" ON user_app_access FOR SELECT USING (
  tenant_user_id IN (SELECT id FROM tenant_users WHERE auth_user_id = auth.uid())
);
```
Este patrón garantiza que la sesión de JWT (`auth.uid()`) solo pueda resolver sus propios permisos de aplicación mediante el `ID` interno de usuario de su empresa.

---

## 4. Gestión de Estado Global (React Query)
Hemos eliminado el uso abusivo de `useEffect` y estados locales (`useState`) para datos de servidor.

- **Caching & Invalidation**: El Panel de Administración utiliza `queryClient.invalidateQueries({ queryKey: ['saas'] })`. 
- **Efecto de Red**: Cualquier cambio en permisos realizado desde la App de Admin se propaga instantáneamente a las apps de usuario (Scoring/Ofertas) sin recarga de página, gracias a la sincronización de las Query Keys compartidas.

---

## 5. Próximos Pasos & Escalabilidad
El sistema está preparado para soportar Micro-frontends. Para añadir un nuevo producto al catálogo:
1. Insertar slug en tabla `apps`.
2. Consumir `useUserAccess('nuevo-slug')` en la nueva aplicación.
3. El sistema de permisos y RLS funcionará "Out-of-the-box".

> [!NOTE]
> La infraestructura está diseñada para ser agnóstica al Framework, aunque actualmente está optimizada para el ecosistema React/Vite de las 3 aplicaciones actuales.
