export const TYPES_VERSION = '0.1.0' as const;

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; code?: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Reexportaciones explícitas: Rollup/Vite no siguen bien `export *` en salida CJS (`__exportStar`). */
export {
  assignmentModeSchema,
  projectFormSchema,
  toolFormSchema,
  type ProjectFormValues,
  type ToolFormValues,
} from './toolForm';

export {
  stackosAgentActionSchema,
  stackosAgentClientBodySchema,
  stackosAgentSuggestedResponseSchema,
  type StackosAgentAction,
  type StackosAgentClientBody,
  type StackosAgentClientBodyInput,
  type StackosAgentSuggestedResponse,
  type StackosAgentUpstreamEnvelope,
} from './stackosAgent';

export {
  toolsAiCategoryListSchema,
  toolsAiCategorySnapshotSchema,
  toolsAiEnrichBodySchema,
  toolsAiEnrichDataSchema,
  toolsAiPricingPlanSchema,
  toolsAiPricingSchema,
  toolsAiScoresSchema,
  toolsAiSuggestBodySchema,
  toolsAiSuggestDataSchema,
  toolsAiSuggestionItemSchema,
  type ToolsAiCategorySnapshot,
  type ToolsAiEnrichBody,
  type ToolsAiEnrichData,
  type ToolsAiSuggestBody,
  type ToolsAiSuggestData,
  type ToolsAiSuggestionItem,
} from './toolsAi';
