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
