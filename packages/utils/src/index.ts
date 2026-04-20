export type Periodicity = 'monthly' | 'yearly' | 'quarterly';

export function formatCents(
  cents: number,
  currency: string = 'EUR',
  locale: string = 'es-ES',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function toMonthlyCents(amountCents: number, periodicity: Periodicity): number {
  switch (periodicity) {
    case 'monthly':
      return amountCents;
    case 'yearly':
      return Math.round(amountCents / 12);
    case 'quarterly':
      return Math.round(amountCents / 3);
  }
}

export function toYearlyCents(amountCents: number, periodicity: Periodicity): number {
  return toMonthlyCents(amountCents, periodicity) * 12;
}

/** Enteros que suman 100; para reparto equitativo entre N proyectos (MVP §8). */
export function splitEvenAllocations(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const rem = 100 - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0));
}

/** Fecha local del dispositivo en ISO (YYYY-MM-DD). Alineado con `current_date` del servidor si el TZ coincide. */
export function todayLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addCalendarMonths(d: Date, months: number): Date {
  const n = new Date(d.getTime());
  n.setMonth(n.getMonth() + months);
  return n;
}

/** Misma semántica que `public.next_billing_on_or_after` en SQL. */
export function nextBillingOnOrAfter(lastRenewalIso: string, periodicity: Periodicity): string {
  const [y, mo, da] = lastRenewalIso.split('-').map((x) => Number.parseInt(x, 10));
  let d = new Date(y, mo - 1, da);
  const today = new Date();
  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const step =
    periodicity === 'monthly' ? 1 : periodicity === 'quarterly' ? 3 : 12;
  let i = 0;
  while (d < today0 && i < 200) {
    d = addCalendarMonths(d, step);
    i += 1;
  }
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Coste mensual en moneda base (céntimos) como en `tool_monthly_base_cents` SQL. */
export function toolMonthlyBaseCentsFromParts(
  amountInBaseCents: number | null | undefined,
  amountCents: number,
  periodicity: Periodicity,
): number {
  if (amountInBaseCents != null) return amountInBaseCents;
  return toMonthlyCents(amountCents, periodicity);
}

export function toolAccruesToBurn(row: {
  deleted_at?: string | null;
  state: string;
  last_renewal_at: string;
  periodicity: Periodicity;
}): boolean {
  if (row.deleted_at) return false;
  if (row.state !== 'canceled') return true;
  const today = todayLocalIsoDate();
  const next = nextBillingOnOrAfter(row.last_renewal_at, row.periodicity);
  return today < next;
}

/** Aproxima `public.tool_row_monthly_burn_cents` para listados (sin acceso a RPC). */
export function toolRowMonthlyBurnCentsClient(row: {
  deleted_at?: string | null;
  state: string;
  last_renewal_at: string;
  periodicity: Periodicity;
  amount_cents: number;
  amount_in_base_cents?: number | null;
  pending_effective_date?: string | null;
  pending_amount_cents?: number | null;
  pending_amount_in_base_cents?: number | null;
  pending_periodicity?: string | null;
}): number {
  if (row.deleted_at) return 0;
  if (!toolAccruesToBurn(row)) return 0;
  const today = todayLocalIsoDate();
  const usePending =
    row.state !== 'canceled' &&
    row.pending_effective_date != null &&
    row.pending_effective_date <= today;

  const baseIn = usePending
    ? (row.pending_amount_in_base_cents ?? row.amount_in_base_cents)
    : row.amount_in_base_cents;
  const amt = usePending ? (row.pending_amount_cents ?? row.amount_cents) : row.amount_cents;
  const per = usePending && row.pending_periodicity ? (row.pending_periodicity as Periodicity) : row.periodicity;

  return toolMonthlyBaseCentsFromParts(baseIn, amt, per);
}
