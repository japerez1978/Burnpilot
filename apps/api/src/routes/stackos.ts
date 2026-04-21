import { stackosAgentClientBodySchema } from '@burnpilot/types';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getBearerUser } from '../utils/authBearer';
import { loadConfig } from '../utils/config';
import { log } from '../utils/logger';

const config = loadConfig();

export const stackosRouter = Router();

const analyzeLimit = rateLimit({
  windowMs: 60_000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'Too many Roadmappilot analyze requests', code: 'RATE_LIMIT' },
});

const agentLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'Too many Roadmappilot agent requests', code: 'RATE_LIMIT' },
});

const analyzeBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(8000),
  facilidad: z.number().int().min(1).max(100),
  velocidad: z.number().int().min(1).max(100),
  eficiencia: z.number().int().min(1).max(100),
  einicial: z.number().int().min(1).max(100),
  elifetime: z.number().int().min(1).max(100),
});

const aiResponseSchema = z.object({
  facilidad: z.number().int().min(1).max(100).optional(),
  velocidad: z.number().int().min(1).max(100).optional(),
  eficiencia: z.number().int().min(1).max(100).optional(),
  einicial: z.number().int().min(1).max(100).optional(),
  elifetime: z.number().int().min(1).max(100).optional(),
  why: z.string().optional(),
  how: z.string().optional(),
  tech: z.array(z.string()).optional(),
  aiNote: z.string().optional(),
});

stackosRouter.post('/stackos/analyze', analyzeLimit, async (req, res) => {
  if (!config.ANTHROPIC_API_KEY) {
    res.status(503).json({
      ok: false,
      error: 'ANTHROPIC_API_KEY not configured',
      code: 'NOT_CONFIGURED',
    });
    return;
  }

  const parsed = analyzeBodySchema.safeParse(req.body);
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
  const model =
    config.ANTHROPIC_MODEL && config.ANTHROPIC_MODEL.length > 0
      ? config.ANTHROPIC_MODEL
      : 'claude-sonnet-4-20250514';

  const userPrompt = `Eres product manager experto en SaaS para vibe coders que construyen con IA sin saber programar. Analiza esta funcionalidad para Roadmappilot dentro de BurnPilot (roadmap de producto por proyecto).

Funcionalidad: ${JSON.stringify(b.name)}
Descripción: ${JSON.stringify(b.description)}
Indicadores propuestos (1-100, más alto = mejor siempre):
- Facilidad técnica (100=trivial con IA): ${b.facilidad}
- Velocidad de desarrollo (100=horas con IA): ${b.velocidad}
- Eficiencia de coste (100=coste cero mantenimiento): ${b.eficiencia}
- Engagement inicial (100=wow inmediato): ${b.einicial}
- Engagement lifetime (100=uso diario recurrente): ${b.elifetime}

Ajusta los indicadores si no son realistas. Responde SOLO con JSON válido sin markdown ni texto fuera del JSON:
{"facilidad":<1-100>,"velocidad":<1-100>,"eficiencia":<1-100>,"einicial":<1-100>,"elifetime":<1-100>,"why":"<por qué importa, 1-2 frases español>","how":"<cómo construirlo con IA, 1-2 frases español>","tech":["t1","t2","t3"],"aiNote":"<insight clave 1 frase español>"}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      log('warn', 'stackos.analyze.anthropic_http', { status: resp.status, body: errText.slice(0, 500) });
      res.status(502).json({
        ok: false,
        error: 'Anthropic request failed',
        code: 'UPSTREAM_ERROR',
      });
      return;
    }

    const data = (await resp.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.find((c) => c.type === 'text')?.text?.trim();
    if (!text) {
      res.status(502).json({ ok: false, error: 'Empty model response', code: 'UPSTREAM_ERROR' });
      return;
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          json = JSON.parse(m[0]);
        } catch {
          json = null;
        }
      }
    }
    if (!json || typeof json !== 'object') {
      log('warn', 'stackos.analyze.parse', { preview: text.slice(0, 200) });
      res.status(502).json({ ok: false, error: 'Model did not return JSON', code: 'PARSE_ERROR' });
      return;
    }

    const ai = aiResponseSchema.safeParse(json);
    if (!ai.success) {
      res.status(502).json({ ok: false, error: 'Invalid model JSON shape', code: 'PARSE_ERROR' });
      return;
    }

    const a = ai.data;
    res.json({
      ok: true,
      data: {
        facilidad: a.facilidad ?? b.facilidad,
        velocidad: a.velocidad ?? b.velocidad,
        eficiencia: a.eficiencia ?? b.eficiencia,
        einicial: a.einicial ?? b.einicial,
        elifetime: a.elifetime ?? b.elifetime,
        why: a.why ?? b.description,
        how: a.how ?? '—',
        tech: a.tech ?? [],
        aiNote: a.aiNote ?? '',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log('error', 'stackos.analyze', { message: msg });
    res.status(500).json({ ok: false, error: msg, code: 'INTERNAL' });
  }
});

/**
 * BFF hacia agente Roadmappilot externo (fase 2). No expone secretos al navegador.
 * Requiere STACKOS_AGENT_URL; opcional STACKOS_AGENT_API_KEY (server-to-server).
 */
stackosRouter.post('/stackos/agent', agentLimit, async (req, res) => {
  if (!config.STACKOS_AGENT_URL || config.STACKOS_AGENT_URL.length === 0) {
    res.status(503).json({
      ok: false,
      error: 'STACKOS_AGENT_URL not configured',
      code: 'NOT_CONFIGURED',
    });
    return;
  }

  const parsed = stackosAgentClientBodySchema.safeParse(req.body);
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
  const envelope = {
    source: 'burnpilot' as const,
    protocolVersion: 1 as const,
    userId: auth.user.id,
    action: b.action,
    message: b.message,
    context: b.context,
  };

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  };
  if (config.STACKOS_AGENT_API_KEY && config.STACKOS_AGENT_API_KEY.length > 0) {
    headers.authorization = `Bearer ${config.STACKOS_AGENT_API_KEY}`;
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), config.STACKOS_AGENT_TIMEOUT_MS);

  try {
    const resp = await fetch(config.STACKOS_AGENT_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(envelope),
      signal: ctrl.signal,
    });
    clearTimeout(t);

    const ct = resp.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      const preview = (await resp.text().catch(() => '')).slice(0, 400);
      log('warn', 'stackos.agent.non_json', { status: resp.status, preview });
      res.status(502).json({
        ok: false,
        error: 'Agent did not return JSON',
        code: 'UPSTREAM_ERROR',
      });
      return;
    }

    const raw = (await resp.json()) as unknown;
    if (!resp.ok) {
      log('warn', 'stackos.agent.http', { status: resp.status, body: raw });
      res.status(502).json({
        ok: false,
        error: 'Agent request failed',
        code: 'UPSTREAM_ERROR',
      });
      return;
    }

    if (
      raw &&
      typeof raw === 'object' &&
      'ok' in raw &&
      (raw as { ok?: unknown }).ok === true &&
      'data' in raw
    ) {
      res.json(raw as { ok: true; data: unknown });
      return;
    }

    res.json({ ok: true, data: raw });
  } catch (e) {
    clearTimeout(t);
    const aborted = e instanceof Error && e.name === 'AbortError';
    const msg = e instanceof Error ? e.message : String(e);
    log('error', 'stackos.agent', { message: msg, aborted });
    res.status(aborted ? 504 : 500).json({
      ok: false,
      error: aborted ? 'Agent request timed out' : msg,
      code: aborted ? 'UPSTREAM_TIMEOUT' : 'INTERNAL',
    });
  }
});
