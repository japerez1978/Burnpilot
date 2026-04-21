import { z } from 'zod';

/** Snapshot de categorías enviado por el cliente; la API valida que los IDs devueltos estén aquí. */
export const toolsAiCategorySnapshotSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(120),
});

export type ToolsAiCategorySnapshot = z.infer<typeof toolsAiCategorySnapshotSchema>;

export const toolsAiCategoryListSchema = z
  .array(toolsAiCategorySnapshotSchema)
  .min(1)
  .max(100);

export const toolsAiEnrichBodySchema = z.object({
  name: z.string().min(1).max(200),
  vendor: z.string().max(200).optional(),
  notes: z.string().max(4000).optional(),
  categories: toolsAiCategoryListSchema,
});

export type ToolsAiEnrichBody = z.infer<typeof toolsAiEnrichBodySchema>;

export const toolsAiSuggestBodySchema = z
  .object({
    categoryId: z.number().int().positive().optional(),
    categorySlug: z.string().min(1).max(120).optional(),
    query: z.string().max(500).optional(),
    limit: z.number().int().min(3).max(10).default(6),
    categories: toolsAiCategoryListSchema,
  })
  .superRefine((data, ctx) => {
    const hasId = data.categoryId != null;
    const hasSlug = data.categorySlug != null && data.categorySlug.length > 0;
    if (!hasId && !hasSlug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indica categoryId o categorySlug',
        path: ['categoryId'],
      });
    }
    if (hasId && hasSlug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Usa solo categoryId o categorySlug, no ambos',
        path: ['categorySlug'],
      });
    }
  });

export type ToolsAiSuggestBody = z.infer<typeof toolsAiSuggestBodySchema>;

export const toolsAiPricingPlanSchema = z.object({
  name: z.string().min(1).max(200),
  priceHint: z.string().min(1).max(300),
  billing: z.string().max(80).optional(),
});

export const toolsAiPricingSchema = z.object({
  summary: z.string().min(1).max(1200),
  plans: z.array(toolsAiPricingPlanSchema).max(8),
});

export const toolsAiScoresSchema = z.object({
  /** Mayor = más asequible / mejor relación precio para un indie builder. */
  precio: z.number().int().min(1).max(100),
  eficacia: z.number().int().min(1).max(100),
  sencillez: z.number().int().min(1).max(100),
});

export const toolsAiEnrichDataSchema = z.object({
  notes: z.string().min(1).max(4000),
  categoryId: z.number().int().positive(),
  pricing: toolsAiPricingSchema,
  scores: toolsAiScoresSchema,
  disclaimer: z.string().min(1).max(500),
});

export type ToolsAiEnrichData = z.infer<typeof toolsAiEnrichDataSchema>;

export const toolsAiSuggestionItemSchema = z.object({
  name: z.string().min(1).max(200),
  vendor: z.string().max(200).optional(),
  notes: z.string().min(1).max(2000),
  categoryId: z.number().int().positive(),
  pricing: toolsAiPricingSchema,
  scores: toolsAiScoresSchema,
});

export type ToolsAiSuggestionItem = z.infer<typeof toolsAiSuggestionItemSchema>;

export const toolsAiSuggestDataSchema = z.object({
  suggestions: z.array(toolsAiSuggestionItemSchema).min(1).max(10),
  disclaimer: z.string().min(1).max(500),
});

export type ToolsAiSuggestData = z.infer<typeof toolsAiSuggestDataSchema>;
