# Backlog de producto BurnPilot — método MoSCoW

> **Ruta oficial:** `docs/product_backlog_moscow.md`  
> **Estado:** inventario vivo de ideas; **no** sustituye al plan maestro ni al scope del sprint.

---

## 1. Propósito del documento

Este archivo es el **lugar estable** dentro del repo para:

- Capturar **ideas** de funcionalidades futuras, mejoras, experimentos y dudas de roadmap.
- **Priorizarlas** con el método **MoSCoW** (Must / Should / Could / Won’t for now).
- **Separar** claramente el backlog de producto del **scope aprobado** del MVP y de lo acordado en sprint.
- Dar **contexto estratégico** a personas y a la IA sin obligar a ejecutar nada por el mero hecho de estar anotado.
- Reducir el riesgo de que ideas sueltas **contaminen** el alcance actual o se implementen sin decisión explícita.

El plan maestro sigue siendo **[docs/burnpilot_plan.md](burnpilot_plan.md)**. El estado operativo del sprint sigue siendo **[docs/STATUS.md](STATUS.md)**.

---

## 2. Reglas de uso

1. **Quién escribe:** principalmente el fundador / producto; cualquier colaborador puede proponer entradas en *Parking Lot* o moverlas entre categorías con acuerdo explícito.
2. **Frecuencia:** actualizar cuando surja una idea; no hace falta bloquear un PR solo por tocar este doc si el cambio es coherente con estas reglas.
3. **Formato:** una idea por bloque (o por fila en tabla); mantener el texto **breve**; el detalle técnico vive en issues/PRs cuando existan.
4. **MoSCoW es relativo al momento:** una idea puede cambiar de categoría cuando cambien prioridades; **Won’t have (for now)** no es “nunca”, es **no ahora** salvo que se diga lo contrario.
5. **La IA y los agentes:** pueden **leer** este documento, **resumir**, **proponer** orden de ataque o roadmap, y **sugerir** reclasificaciones; **no** implementan ítems del backlog **solo porque aparezcan aquí** (ver §3 y [AGENTS.md](../AGENTS.md)).

---

## 3. Backlog ≠ scope actual (obligatorio)

| Concepto | Qué es |
|----------|--------|
| **Scope aprobado / MVP** | Lo definido en el plan maestro, en decisiones explícitas del fundador y en lo reflejado en `docs/STATUS.md` y en el sprint activo. |
| **Este backlog** | Cola de ideas y prioridades **candidatas**; material para conversación y planificación; **no** es compromiso de entrega. |

**Regla de oro:** nada de este archivo pasa a ser trabajo obligatorio hasta que:

1. El fundador **apruebe explícitamente** la idea (o un conjunto acotado), **y**
2. Quede reflejado en **plan**, **sprint**, **`docs/STATUS.md`** o instrucción explícita en el chat / issue.

Hasta entonces, las entradas son **opcionales** y **no** deben implementarse de oficio.

---

## 4. Formato recomendado para nuevas ideas

Copia y pega este bloque bajo la sección que corresponda (o en *Parking Lot* si aún no está clasificada):

```markdown
### [Título corto de la idea]

- **Nota:** (opcional) contexto, problema de usuario, dependencia.
- **Añadido:** YYYY-MM-DD
- **ID/issue:** (opcional) enlace a Linear/GitHub si existe.
```

Para listas muy densas puedes usar una sola línea:

`- **Idea** — nota breve — YYYY-MM-DD`

---

## 5. Must have

*Crítico para la visión de producto o el siguiente hito mayor acordado — cuando se promueva desde el backlog a plan, suele bloquear valor si no existe.*

<!-- ir debajo -->

---

## 6. Should have

*Importante pero no bloqueante para un primer corte; alta prioridad después de los Must.*

<!-- Añadir debajo -->
- Que burnpilot app se conecte a la tool listada para que pueda extraer toda la info inicial y mantenerla actualizada en tiempo real. 

- Que burnpilot app se conecte a la app del proyecto donde se imputan los gastos para que, cruzando datos reales de ambas (revenue y burn), podamos ver y gestionar diferentes KPI, como: 
MRR 
ARR
ACV
ARPU
LTV / CLV
CAC
LTV:CAC
Churn Rate
Revenue Churn
NRR
Gross Burn
Net Burn
Burn Rate
Runway
Break Even
Quick Ratio
Payback Period
MoM Growth
Expansion MRR
New MRR
Churned MRR

- **Referencia (modelo / definición de métricas):** [SaaS_Revenue_Calculator_Leadstodeals.xlsx](SaaS_Revenue_Calculator_Leadstodeals.xlsx)

## 7. Could have

*Deseable si sobra capacidad; mejoras de pulido, experimentos de menor riesgo.*
- Que burnpilot app se conecte al banco del usuario para tener acceso a los cargos emitidos por esas aplicaciones, y así extraer toda la info en tiempo real. 


---

## 8. Won’t have (for now)

*Explícitamente **no** en el horizonte inmediato; evita re debates y registra la decisión de posponer. Revisar en revisiones de roadmap.*

<!-- Añadir debajo -->

---

## 9. Parking Lot / Raw Ideas

*Ideas sin clasificar, enunciados a medio cocinar, “más tarde”, enlaces sueltos. Clasificar en MoSCoW cuando haya claridad.*

<!-- Añadir debajo -->

---

## 10. Historial de promociones (opcional)

*Cuando una idea pase del backlog a scope real, puedes anotar fecha y destino (sprint, issue, sección de STATUS) en una línea aquí — ayuda a la trazabilidad.*

| Fecha | Idea (referencia) | Promovida a |
|-------|-------------------|-------------|
| | | |

---

*Última revisión de estructura del documento: 2026-04-19*
