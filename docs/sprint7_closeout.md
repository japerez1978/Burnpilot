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

## Operativa verificada (2026-04-20)

- API pública **`https://api.burnpilot.app`** con `GET /health` OK; front en Netlify con `VITE_API_URL` apuntando a la API.
- Webhook Stripe con ruta **`/webhooks/stripe`** y `STRIPE_WEBHOOK_SECRET` alineado en Railway (destino correcto en Stripe).
- Inventario **sin secretos:** [production_environment.md](production_environment.md).

## Pendiente post go-live (Sprint 8)

- Legal definitivo, Stripe **Live**, monitores, backup/restore verificado. Ver [sprint8_scope.md](sprint8_scope.md).
