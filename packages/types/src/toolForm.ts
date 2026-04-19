import { z } from 'zod';

export const assignmentModeSchema = z.enum(['none', 'single', 'shared']);

export const toolFormSchema = z
  .object({
    name: z.string().min(1, 'Nombre requerido').max(200),
    vendor: z.string().max(200).optional().or(z.literal('')),
    categoryId: z.coerce.number().int().positive(),
    planLabel: z.string().max(120).optional().or(z.literal('')),
    amount: z
      .string()
      .trim()
      .refine(
        (s) => s === '' || /^[0-9]+([.,][0-9]{1,2})?$/.test(s),
        'Importe no válido (ej. 0, 20 o 20,99).',
      )
      .refine((s) => {
        if (s === '') return true;
        const major = Number.parseFloat(s.replace(',', '.'));
        return !Number.isNaN(major) && major >= 0;
      }, 'El importe no puede ser negativo.'),
    currency: z.enum(['EUR', 'USD', 'GBP']),
    periodicity: z.enum(['monthly', 'yearly', 'quarterly']),
    lastRenewalAt: z.string().min(1, 'Fecha requerida'),
    state: z.enum(['active', 'trial', 'doubtful', 'to_cancel', 'canceled']),
    perceivedUsefulness: z.union([z.literal(''), z.enum(['1', '2', '3', '4', '5'])]),
    notes: z.string().max(4000).optional().or(z.literal('')),
    assignmentMode: assignmentModeSchema,
    singleProjectId: z.union([z.string().uuid(), z.literal(''), z.null()]).optional(),
    sharedAllocations: z
      .array(
        z.object({
          projectId: z.string().uuid(),
          allocationPct: z.number().min(0.01).max(100),
        }),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.assignmentMode === 'single') {
      const sid = data.singleProjectId;
      if (!sid || sid === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Elige un proyecto.',
          path: ['singleProjectId'],
        });
      }
    }
    if (data.assignmentMode === 'shared') {
      const rows = data.sharedAllocations ?? [];
      if (rows.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Marca al menos dos proyectos.',
          path: ['sharedAllocations'],
        });
        return;
      }
      const sum = rows.reduce((a, r) => a + r.allocationPct, 0);
      if (Math.abs(sum - 100) > 0.02) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Los porcentajes deben sumar 100%.',
          path: ['sharedAllocations'],
        });
      }
    }
  });

export type ToolFormValues = z.infer<typeof toolFormSchema>;

export const projectFormSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(120),
  description: z.string().max(2000).optional().or(z.literal('')),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
