# BurnIntel — agente n8n + scraping + LLM (caja de futuras versiones)

> **Estado:** fuera del plan actual (CORE MVP v1.3). **No implementar** hasta nueva decisión explícita.  
> **Guardado:** registro de la propuesta y del análisis producto/CTO para no perder contexto.

---

## Propuesta (resumen)

- **Orquestación:** n8n en Railway, cron ~24h.  
- **Datos:** leer `tools` (u homólogo), loop por fila.  
- **Scraping:** Jina / Firecrawl → markdown.  
- **LLM:** Claude (p. ej. Haiku) → ficha JSON estructurada.  
- **Persistencia:** comparar con snapshot anterior en Supabase; si hay cambios → actualizar + embedding (pgvector) + log; si no → solo log.  
- **Credenciales típicas:** Supabase, Anthropic, Jina (en jobs servidor **no** usar anon como si fuera backend; diseño correcto: `service_role` + aislamiento por `user_id`).

---

## Veredicto ejecutivo (análisis Head of Product + CTO + growth)

| Dimensión | Lectura |
|-----------|---------|
| Encaje estratégico | **Aporta algo, pero no ahora.** Si se prioriza como línea principal antes del CORE, **distrae** (coste, ops, riesgo multi-tenant). |
| Producto visible | Sin superficie en UI (alertas, digest, badge), es **backoffice**; el usuario **no nota** valor. |
| Engagement / MRR corto plazo | **Bajo** directo. Medio plazo **solo si** se productiza (p. ej. alertas de cambio de precio/plan). |
| Coste de oportunidad | Retrasa tools, dashboard, alertas deterministas, billing — lo que **sí** mueve retención y MRR. |

**Recomendación registrada:** **A — NO hacerlo ahora** como sprint o línea estratégica dentro del roadmap BurnPilot.

**Reapertura condicionada:** tras CORE MVP consolidado **y** métricas de activación; si se retoma, solo como **piloto interno** time-boxed (p. ej. 1 semana), pos-Sprint 5, sin pgvector/Pro hasta validar coste y utilidad percibida.

---

## Qué sí aportaría (cuando toque)

- Base para **alertas** del tipo “cambio en precio/plan del proveedor” (nueva familia; no sustituye las 5 alertas deterministas del MVP).  
- Posible **diferenciación** y narrativa de “inteligencia” **si** la fiabilidad y la UX lo respaldan.  
- Posible **SEO/contenido** si se derivan piezas públicas (opcional, otro esfuerzo).

## Qué no aporta todavía

- Hábito de uso ni justificación de pricing sin **entregable en producto**.  
- Mejora directa de Recommended Stacks curados, Savings Plan determinista o alertas MVP **tal como están definidas**.

## Riesgos si se adelanta

- Complejidad operativa, coste variable (LLM + scrape), TOS/bloqueos, falsos positivos.  
- Diseño erróneo tipo **catálogo global por URL** sin `user_id` → **incumplimiento del modelo B2C**.

## Nombre tentativo de iniciativa (si revive)

**BurnIntel (piloto)** — módulo interno primero; **no** prometer en landing hasta criterios de éxito claros.

---

## Enlace con plan maestro

El roadmap vigente sigue en [docs/burnpilot_plan.md](../burnpilot_plan.md). Este documento **no** modifica prioridades hasta revisión explícita.
