import { z } from 'zod';

/** Acciones que el agente externo puede interpretar (extensible en fase 2). */
export const stackosAgentActionSchema = z.enum([
  'chat',
  'define_feature',
  'suggest_backlog',
  'refine_item',
]);

export type StackosAgentAction = z.infer<typeof stackosAgentActionSchema>;

const stackosAgentItemSnapshotSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(500),
  description: z.string().max(8000).optional(),
  score: z.number().int().min(0).max(100).optional(),
  moscow: z.enum(['M', 'S', 'C', 'W']).optional(),
  workflowState: z
    .enum(['active', 'validated', 'postponed', 'archived'])
    .optional(),
});

/**
 * Body que envía el cliente a BurnPilot (`POST /v1/stackos/agent`).
 * La API reenvía un sobre ampliado al agente externo (ver docs/stackos-spec.md § Fase 2).
 */
export const stackosAgentClientBodySchema = z.object({
  action: stackosAgentActionSchema.default('chat'),
  message: z.string().min(1).max(20_000),
  context: z
    .object({
      projectId: z.string().uuid().optional(),
      projectName: z.string().max(200).optional(),
      scoringMode: z.enum(['launch', 'retention']).optional(),
      items: z.array(stackosAgentItemSnapshotSchema).max(200).optional(),
    })
    .optional(),
});

/** Body validado (salida Zod; `action` siempre presente). */
export type StackosAgentClientBody = z.infer<typeof stackosAgentClientBodySchema>;
/** Lo que puede enviar el cliente (p. ej. sin `action`, default `chat`). */
export type StackosAgentClientBodyInput = z.input<typeof stackosAgentClientBodySchema>;

/** Sobre que BurnPilot envía al HTTP del agente externo (contrato estable). */
export type StackosAgentUpstreamEnvelope = {
  source: 'burnpilot';
  protocolVersion: 1;
  userId: string;
  action: StackosAgentAction;
  message: string;
  context?: StackosAgentClientBody['context'];
};

/**
 * Respuesta sugerida del agente externo (200 JSON). Campos opcionales;
 * se acepta cualquier JSON objeto y se devuelve en `data`.
 */
export const stackosAgentSuggestedResponseSchema = z
  .object({
    reply: z.string().optional(),
    summary: z.string().optional(),
    proposedItems: z
      .array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        }),
      )
      .optional(),
    /** Payload libre para herramientas futuras (n8n, LangGraph, etc.). */
    meta: z.record(z.unknown()).optional(),
  })
  .passthrough();

export type StackosAgentSuggestedResponse = z.infer<typeof stackosAgentSuggestedResponseSchema>;
