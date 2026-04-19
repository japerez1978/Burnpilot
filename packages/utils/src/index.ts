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
