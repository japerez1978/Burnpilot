# Sprint 6 — cierre (SECONDARY)

**Fecha cierre documentación:** 2026-04-19  
**Plan de referencia:** [burnpilot_plan.md §19](burnpilot_plan.md) — *Sprint 6 — Recommended Stacks + pulido*.

## Entregables

| Área | Qué se hizo |
|------|-------------|
| **SQL** | `20250429000001_sprint6_stack_snapshots.sql` — tabla `stack_snapshots`, trigger en `project_tools`, `take_project_snapshot`, `project_history`, `dashboard_history` (histórico real + fallback). Idempotente (re-ejecutable). |
| **SQL** | `20250430000001_recommended_stacks.sql` — `recommended_stacks` + `recommended_stack_items`, seed 8 stacks, RPC `stack_comparison`. Idempotente. |
| **Web `/dashboard`** | Gráfico de evolución mensual global (`useDashboardHistoryQuery` + `GlobalBurnHistoryChart`, RPC `dashboard_history`). |
| **Web `/projects/:id`** | Sin cambio funcional nuevo en este sprint (ya tenía historial por proyecto). |
| **Web `/stacks`** | Listado de stacks, comparación con proyecto seleccionado, enlace **Añadir sugerida** → `/tools?prefillName=&assignProject=` para alta con nombre y proyecto pre-rellenados. |
| **Web `/tools`** | Lectura de query `prefillName` y `assignProject`; abre modal de alta con `initialCreatePreset`. |
| **Web `/settings/account`** | Export CSV de herramientas (planes Pro / Lifetime). |

## Operativa

1. Aplicar migraciones **29** y **30** en Supabase en orden (ver [STATUS.md](STATUS.md)).
2. Tras cambios en `project_tools`, se generan snapshots (deduplicación 2 h); el gráfico global usa agregación por mes.

## Fuera de alcance / siguiente

- **Sprint 7:** landing pública, instrumentación producción, legal (plan maestro).
- Pulido fino de microinteracciones y vacíos: mejora continua, no bloqueante.
