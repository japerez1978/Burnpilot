import { todayLocalIsoDate } from '@burnpilot/utils';

export type ToolWithPendingFields = {
  amount_cents: number;
  currency: string;
  periodicity: string;
  plan_label: string | null;
  last_renewal_at: string;
  amount_in_base_cents?: number | null;
  pending_amount_cents?: number | null;
  pending_amount_in_base_cents?: number | null;
  pending_periodicity?: string | null;
  pending_plan_label?: string | null;
  pending_effective_date?: string | null;
};

/**
 * Si `pending_effective_date` ya pasó, refleja en los campos canónicos lo que la BD
 * ya usa en RPCs (hasta que compactes filas con un job opcional).
 */
export function mergePendingTool<T extends ToolWithPendingFields & Record<string, unknown>>(row: T): T {
  const today = todayLocalIsoDate();
  if (!row.pending_effective_date || row.pending_effective_date > today) {
    return row;
  }
  return {
    ...row,
    amount_cents: row.pending_amount_cents ?? row.amount_cents,
    amount_in_base_cents: row.pending_amount_in_base_cents ?? row.amount_in_base_cents,
    periodicity: (row.pending_periodicity ?? row.periodicity) as string,
    plan_label: row.pending_plan_label ?? row.plan_label,
    pending_amount_cents: null,
    pending_amount_in_base_cents: null,
    pending_periodicity: null,
    pending_plan_label: null,
    pending_effective_date: null,
  };
}
