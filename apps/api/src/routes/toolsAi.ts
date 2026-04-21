import {
  toolsAiEnrichBodySchema,
  toolsAiEnrichDataSchema,
  toolsAiSuggestBodySchema,
  toolsAiSuggestDataSchema,
} from '@burnpilot/types';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getBearerUser } from '../utils/authBearer';
import { loadConfig } from '../utils/config';
import { log } from '../utils/logger';

const config = loadConfig();

export const toolsAiRouter = Router();

const toolsAiLimit = rateLimit({
  windowMs: 60_000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'Too many tools AI requests', code: 'RATE_LIMIT' },
});

function allowedCategoryIds(categories: { id: number }[]): Set<number> {
  return new Set(categories.map((c) => c.id));
}

/** Normaliza URL devuelta por el modelo (https, válida) o undefined. */
function normalizeModelWebsiteUrl(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  const href = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, '')}`;
  try {
    const u = new URL(href);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
    return u.href.length > 2048 ? u.href.slice(0, 2048) : u.href;
  } catch {
    return undefined;
  }
}

function resolveTargetCategoryId(
  body: { categoryId?: number; categorySlug?: string },
  categories: { id: number; slug: string }[],
): number | null {
  if (body.categoryId != null) {
    return categories.some((c) => c.id === body.categoryId) ? body.categoryId : null;
  }
  if (body.categorySlug) {
    const row = categories.find((c) => c.slug === body.categorySlug);
    return row?.id ?? null;
  }
  return null;
}

function parseModelJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function anthropicJsonPrompt(userPrompt: string, maxTokens: number): Promise<{ ok: true; json: unknown } | { ok: false }> {
  if (!config.ANTHROPIC_API_KEY) {
    return { ok: false };
  }
  const model =
    config.ANTHROPIC_MODEL && config.ANTHROPIC_MODEL.length > 0
      ? config.ANTHROPIC_MODEL
      : 'claude-sonnet-4-20250514';

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    log('warn', 'toolsAi.anthropic_http', { status: resp.status, body: errText.slice(0, 500) });
    return { ok: false };
  }

  const data = (await resp.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === 'text')?.text?.trim();
  if (!text) return { ok: false };

  const json = parseModelJson(text);
  if (!json || typeof json !== 'object') {
    log('warn', 'toolsAi.parse', { preview: text.slice(0, 200) });
    return { ok: false };
  }
  return { ok: true, json };
}

toolsAiRouter.post('/tools/ai-enrich', toolsAiLimit, async (req, res) => {
  if (!config.ANTHROPIC_API_KEY) {
    res.status(503).json({
      ok: false,
      error: 'ANTHROPIC_API_KEY not configured',
      code: 'NOT_CONFIGURED',
    });
    return;
  }

  const parsed = toolsAiEnrichBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: 'Invalid body',
      code: 'VALIDATION_ERROR',
      details: parsed.error.flatten(),
    });
    return;
  }

  const auth = await getBearerUser(config, req.headers.authorization);
  if ('error' in auth) {
    const status = auth.code === 'NO_TOKEN' ? 401 : auth.code === 'NOT_CONFIGURED' ? 503 : 401;
    res.status(status).json({ ok: false, error: auth.error, code: auth.code });
    return;
  }

  const b = parsed.data;
  const allowed = allowedCategoryIds(b.categories);
  const catJson = JSON.stringify(b.categories);

  const userPrompt = `Eres asistente para BurnPilot (control de gastos de herramientas SaaS para builders). El usuario describe una herramienta o suscripción.

Nombre: ${JSON.stringify(b.name)}
Proveedor (opcional): ${JSON.stringify(b.vendor ?? '')}
Notas actuales (opcional): ${JSON.stringify(b.notes ?? '')}

Categorías permitidas (elige SOLO categoryId de esta lista):
${catJson}

Tarea:
1) Redacta notas útiles en español (qué es, para qué sirve, 2-4 frases).
2) Elige la categoría más adecuada (categoryId entero de la lista).
3) Resume planes y precios aproximados en EUR/USD como orientación (puede estar desactualizado): pricing.summary + pricing.plans[] con name, priceHint (texto corto, ej. "desde ~20 €/mes"), billing opcional (monthly/yearly/etc.).
4) Tres scores enteros 1-100: precio (100=mejor relación calidad-precio o más barato para el caso típico indie), eficacia (100=muy útil para el objetivo), sencillez (100=muy fácil de usar).
5) websiteUrl (opcional): URL https de la web oficial o pricing del producto; omite el campo si no estás seguro.
6) disclaimer: una frase legal en español: datos orientativos, verificar en la web oficial del proveedor.

Responde SOLO JSON válido, sin markdown:
{"notes":"...","categoryId":<int>,"websiteUrl":"https://...","pricing":{"summary":"...","plans":[{"name":"...","priceHint":"...","billing":"..."}]},"scores":{"precio":<1-100>,"eficacia":<1-100>,"sencillez":<1-100>},"disclaimer":"..."}`;

  try {
    const out = await anthropicJsonPrompt(userPrompt, 1536);
    if (!out.ok) {
      res.status(502).json({ ok: false, error: 'Model request or parse failed', code: 'UPSTREAM_ERROR' });
      return;
    }

    const data = toolsAiEnrichDataSchema.safeParse(out.json);
    if (!data.success || !allowed.has(data.data.categoryId)) {
      res.status(502).json({ ok: false, error: 'Invalid model JSON or categoryId', code: 'PARSE_ERROR' });
      return;
    }

    const websiteUrl = normalizeModelWebsiteUrl(data.data.websiteUrl);
    res.json({
      ok: true,
      data: {
        ...data.data,
        ...(websiteUrl ? { websiteUrl } : {}),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log('error', 'toolsAi.enrich', { message: msg });
    res.status(500).json({ ok: false, error: msg, code: 'INTERNAL' });
  }
});

toolsAiRouter.post('/tools/ai-suggest', toolsAiLimit, async (req, res) => {
  if (!config.ANTHROPIC_API_KEY) {
    res.status(503).json({
      ok: false,
      error: 'ANTHROPIC_API_KEY not configured',
      code: 'NOT_CONFIGURED',
    });
    return;
  }

  const parsed = toolsAiSuggestBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: 'Invalid body',
      code: 'VALIDATION_ERROR',
      details: parsed.error.flatten(),
    });
    return;
  }

  const auth = await getBearerUser(config, req.headers.authorization);
  if ('error' in auth) {
    const status = auth.code === 'NO_TOKEN' ? 401 : auth.code === 'NOT_CONFIGURED' ? 503 : 401;
    res.status(status).json({ ok: false, error: auth.error, code: auth.code });
    return;
  }

  const b = parsed.data;
  const targetId = resolveTargetCategoryId(
    { categoryId: b.categoryId, categorySlug: b.categorySlug },
    b.categories,
  );
  if (targetId == null) {
    res.status(400).json({
      ok: false,
      error: 'categoryId o categorySlug no coincide con categories enviadas',
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  const allowed = allowedCategoryIds(b.categories);
  const anchor = b.categories.find((c) => c.id === targetId);
  const catJson = JSON.stringify(b.categories);
  const limit = b.limit;

  const userPrompt = `Eres asistente para BurnPilot. Sugiere herramientas SaaS reales o muy conocidas para builders no técnicos.

Categoría objetivo (id ${targetId}): ${JSON.stringify(anchor?.name ?? '')} slug ${JSON.stringify(anchor?.slug ?? '')}
Búsqueda o filtro del usuario (opcional): ${JSON.stringify(b.query ?? '')}
Cantidad de sugerencias: ${limit} (devuelve exactamente hasta ${limit} ítems, no menos salvo imposibilidad).

Lista completa de categorías (referencia): ${catJson}

Para cada sugerencia:
- name, vendor (opcional), notes (breve, español)
- websiteUrl (opcional): https de la web oficial; omite si no estás seguro
- categoryId: DEBE ser siempre el entero ${targetId} (solo herramientas de esta categoría)
- pricing: summary corto + plans[] con name, priceHint, billing opcional (precios ORIENTATIVOS)
- scores: precio, eficacia, sencillez (1-100, mismo criterio que enriquecimiento)

Al final incluye disclaimer en español: datos orientativos, verificar precios en web oficial.

Responde SOLO JSON válido:
{"suggestions":[{"name":"...","vendor":"...","notes":"...","websiteUrl":"https://...","categoryId":${targetId},"pricing":{"summary":"...","plans":[...]},"scores":{"precio":n,"eficacia":n,"sencillez":n}}],"disclaimer":"..."}`;

  try {
    const out = await anthropicJsonPrompt(userPrompt, 2048);
    if (!out.ok) {
      res.status(502).json({ ok: false, error: 'Model request or parse failed', code: 'UPSTREAM_ERROR' });
      return;
    }

    const raw = toolsAiSuggestDataSchema.safeParse(out.json);
    if (!raw.success) {
      res.status(502).json({ ok: false, error: 'Invalid model JSON shape', code: 'PARSE_ERROR' });
      return;
    }

    const suggestions = raw.data.suggestions
      .filter((s) => allowed.has(s.categoryId))
      .slice(0, b.limit)
      .map((s) => {
        const websiteUrl = normalizeModelWebsiteUrl(s.websiteUrl);
        return {
          ...s,
          categoryId: targetId,
          ...(websiteUrl ? { websiteUrl } : {}),
        };
      });

    if (suggestions.length === 0) {
      res.status(502).json({ ok: false, error: 'No valid suggestions from model', code: 'PARSE_ERROR' });
      return;
    }

    res.json({
      ok: true,
      data: { suggestions, disclaimer: raw.data.disclaimer },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log('error', 'toolsAi.suggest', { message: msg });
    res.status(500).json({ ok: false, error: msg, code: 'INTERNAL' });
  }
});
