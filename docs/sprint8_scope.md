# Sprint 8 — alcance propuesto (post-MVP)

> El [plan maestro v1.3](burnpilot_plan.md) define sprints **0–7**. El **Sprint 8** no estaba en el plan original; este documento fija el alcance para la siguiente iteración.

**Fecha definición:** 2026-04-20  
**Enfoque:** consolidar negocio y operativa tras go-live, sin nueva feature core grande salvo acuerdo explícito.

## Objetivo en una frase

Pasar de “MVP en producción que funciona” a **producto defendible**: legal, cobros reales, observabilidad y datos respaldados.

## Bloques de trabajo (prioridad sugerida)

### 1. Legal y confianza
- Sustituir borradores de **`/legal/privacy`** y **`/legal/terms`** con texto revisado por asesoría (jurisdicción, cookies/analítica si Umami/Sentry afectan copy).
- Revisar enlaces en pie de `PublicLayout` y consistencia de marca.

### 2. Stripe en modo Live
- Activar **Stripe Live** cuando el KYC lo permita.
- Productos/precios live alineados con la landing.
- Webhook **en entorno Live** apuntando al mismo contrato de ruta `/webhooks/stripe`; nuevo `whsec` live en Railway.
- Probar checkout y portal con importes reales en entorno controlado.

### 3. Observabilidad y alertas
- **Sentry** (front y opcional API): proyectos separados test/prod si aplica.
- **Umami** (o analítica acordada): sitio producción.
- **Better Stack** (u otro): monitores HTTP a `GET /health` de la API y a la URL pública del front; alertas por email/Slack.

### 4. Datos y continuidad
- **Backups Supabase:** política acordada (Plan Pro, PITR si aplica); **ensayo de restore** documentado en [runbook.md](runbook.md).
- Revisar límites y costes Railway/Netlify según tráfico.

### 5. Hardening ligero
- Revisar **`ALLOWED_ORIGIN`** y dominios del front (Netlify + dominio custom si se añade).
- Lista corta de checks de seguridad del plan (§18 [burnpilot_plan.md](burnpilot_plan.md)): rate limit, sin secretos en logs.

### 6. Producto / marketing (si sobra capacidad)
- SEO básico: títulos, meta description, OG image por página clave.
- Mejora de copy en `/pricing` y `/faq` según feedback.
- Opcional: reducción de bundle (code-splitting) si Lighthouse lo pide.

## Fuera de Sprint 8 (salvo replanificación)

- **BurnIntel** (n8n, scraping): [future/burnintel-n8n-agent.md](future/burnintel-n8n-agent.md).
- Grandes cambios de modelo de datos o nuevas pantallas core (allocations avanzadas, IA, etc.).

## Criterio de “hecho”

- Legal publicado con visto bueno externo o criterio explícito de riesgo aceptado por el fundador.
- Al menos un flujo de **pago Live** verificado de punta a punta.
- Monitores activos + runbook actualizado con “último restore probado”.
- **STATUS** y **handoff** actualizados al cierre del sprint.
