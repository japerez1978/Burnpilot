# Roadmappilot — especificación funcional (BurnPilot)

Nombre de producto en la app: **Roadmappilot**. En código y base de datos se mantiene el prefijo técnico `stackos_*` y rutas API `/v1/stackos/*`.

> Referencia mantenible. Prototipo visual/HTML: [stackos-module-spec.md](stackos-module-spec.md).  
> **Última revisión:** 2026-04-21

## Propósito

Roadmap vivo por **proyecto** (`projects`): priorizar features de producto con **cinco indicadores** (1–100), **score** ponderado 1–100, **MoSCoW derivado** y **estados de flujo** (independientes de MoSCoW).

## Indicadores

| Clave | Significado (mayor = mejor) |
|-------|-----------------------------|
| `facilidad` | Facilidad técnica (100 = trivial con IA) |
| `velocidad` | Velocidad de desarrollo (100 = horas con IA) |
| `eficiencia` | Eficiencia de coste de mantenimiento (100 = coste cero) |
| `einicial` | Engagement inicial (100 = wow primer uso) |
| `elifetime` | Engagement lifetime (100 = uso recurrente a largo plazo) |

## Modos de puntuación

- **`launch`**: peso mayor a `einicial`.
- **`retention`**: peso mayor a `elifetime`.

Pesos exactos: ver `WEIGHTS` en [@burnpilot/utils `stackosScoring`](../packages/utils/src/stackosScoring.ts).

## Score y MoSCoW

- **Score:** suma ponderada de los cinco indicadores, redondeada, acotada a 1–100.
- **MoSCoW** (derivado del score, no editable manualmente en MVP):
  - `M` si score ≥ 75  
  - `S` si score ≥ 55  
  - `C` si score ≥ 35  
  - `W` si score &lt; 35  

## Estados de flujo (`workflow_state`)

Distintos de MoSCoW; gobiernan la UI y agrupación:

- `active` — en curso  
- `validated` — validada  
- `postponed` — en espera  
- `archived` — archivada  

Transiciones: validar, posponer, archivar, reactivar/restaurar (vuelta a `active`).

## Datos persistidos (Supabase)

- `stackos_roadmaps`: un roadmap por `(user_id, project_id)`, `scoring_mode`.
- `stackos_items`: filas del roadmap con indicadores, `score`, `moscow`, `workflow_state`, textos y `tech` (JSON array).

No confundir con `recommended_stacks` (catálogo curado global).

## IA (análisis)

Ajuste de indicadores y campos `why`, `how`, `tech`, `ai_note` vía **API Anthropic solo en backend** (`POST /v1/stackos/analyze`), JWT obligatorio.

## Fase 2 — agente externo (roadmap / definición de funcionalidad)

Objetivo: un **agente conversacional u orquestado** (n8n, LangGraph, servicio propio, etc.) que ayude a **definir funcionalidades**, **refinar el backlog** y **proponer ítems** usando el contexto del proyecto.

### Arquitectura

1. El **navegador** solo llama a BurnPilot (`VITE_API_URL`) con JWT Supabase.
2. **Railway** expone `POST /v1/stackos/agent`, valida el body (Zod en `@burnpilot/types`) y reenvía un **sobre JSON** al HTTP configurado en `STACKOS_AGENT_URL`.
3. El **agente externo** implementa la lógica (LLM, herramientas, memoria). Responde **200** con JSON.

### Variables de entorno (solo `apps/api`)

| Variable | Obligatorio | Descripción |
|----------|-------------|-------------|
| `STACKOS_AGENT_URL` | Sí, para activar la ruta | URL completa del POST del agente (ej. `https://agente.example/rpc/stackos`). |
| `STACKOS_AGENT_API_KEY` | No | Si existe, se envía al agente como `Authorization: Bearer …` (server-to-server, no es el JWT del usuario). |
| `STACKOS_AGENT_TIMEOUT_MS` | No | Por defecto 55000 ms. |

### Sobre hacia el agente (`StackosAgentUpstreamEnvelope`)

```json
{
  "source": "burnpilot",
  "protocolVersion": 1,
  "userId": "<uuid Supabase auth.users>",
  "action": "chat | define_feature | suggest_backlog | refine_item",
  "message": "texto del usuario o instrucción",
  "context": {
    "projectId": "uuid opcional",
    "projectName": "string opcional",
    "scoringMode": "launch | retention",
    "items": [ { "id", "name", "description", "score", "moscow", "workflowState" } ]
  }
}
```

- **`userId`**: trazabilidad y cuotas en el agente; **no** sustituye auth en BurnPilot (ya validado antes del forward).
- **`action`**: hint para el agente; puede ignorarse si el modelo infiere la intención desde `message`.

### Respuesta del agente

- Recomendado: `{ "reply": "markdown o texto", "summary": "…", "proposedItems": [ { "name", "description" } ], "meta": { } }` (campos opcionales; ver `stackosAgentSuggestedResponseSchema` en `@burnpilot/types`).
- También válido: `{ "ok": true, "data": { … } }` — la API reexpone ese cuerpo al cliente sin envolver de nuevo.

### Cliente web

`fetchStackosAgent` en `apps/web/src/lib/stackosApi.ts` — tipos `StackosAgentClientBodyInput` (y envelope aguas arriba) en `@burnpilot/types`.

## Export prompt

Texto largo listo para pegar en un asistente de código, generado en cliente con la misma fórmula que `@burnpilot/utils` (sin duplicar lógica).
