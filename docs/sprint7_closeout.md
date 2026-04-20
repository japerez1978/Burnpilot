# Sprint 7 — landing + go-live (MVP en repo)

**Fecha:** 2026-04-19  
**Plan:** [burnpilot_plan.md §19](burnpilot_plan.md).

## Entregables en código

| Ítem | Estado |
|------|--------|
| Landing pública ampliada (`/`) | Hero, valor, tabla comparativa BurnPilot vs Rocket Money, CTA, enlace FAQ |
| `/pricing` | Tres columnas Free / Pro / Lifetime (textos orientativos) |
| `/faq` | Lista de preguntas frecuentes |
| `/legal/privacy`, `/legal/terms` | Borradores legales con aviso de revisión |
| `PublicLayout` | Cabecera + pie con navegación y enlaces legales |
| Sentry | `@sentry/react` + `initObservability()` si `VITE_SENTRY_DSN` |
| Umami | Script opcional si `VITE_UMAMI_WEBSITE_ID` |
| Runbook | Sección go-live + observabilidad front |

## Pendiente fuera de repo (operativa)

- Sustituir borradores legales tras asesoría.
- Configurar DSN/tokens en Netlify/Railway y probar en staging.
- Verificar backup/restore Supabase en entorno real.
- Better Stack (u otro): monitores a `GET /health` y URL pública web.
