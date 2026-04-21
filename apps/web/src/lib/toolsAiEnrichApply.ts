import type { ToolsAiEnrichData } from '@burnpilot/types';

type Plan = ToolsAiEnrichData['pricing']['plans'][number];

/** Texto de precios + disclaimer para persistir en `notes`. */
export function formatToolsAiPricingNotes(data: ToolsAiEnrichData): string {
  const lines: string[] = ['--- Precios (IA, orientativos) ---', data.pricing.summary.trim()];
  for (const p of data.pricing.plans) {
    const extra = p.billing ? ` (${p.billing})` : '';
    lines.push(`• ${p.name}: ${p.priceHint}${extra}`);
  }
  lines.push(
    `Scores IA: precio ${data.scores.precio}, eficacia ${data.scores.eficacia}, sencillez ${data.scores.sencillez}.`,
  );
  lines.push(data.disclaimer.trim());
  return lines.join('\n');
}

const FREE_NAME = /^(free|gratis|gratuito|gratuita)\b/i;

/** Importe principal antes de €/EUR (último número razonable antes del símbolo), o USD si no hay euro. */
export function parseMajorEuroFromHint(hint: string): number | null {
  const h = hint.trim();
  const euroIdx = h.search(/€|EUR\b/i);
  if (euroIdx !== -1) {
    const before = h.slice(0, euroIdx);
    const matches = [...before.matchAll(/(\d{1,6})(?:[.,](\d{1,2}))?/g)];
    if (matches.length === 0) return null;
    const [, intPart, decPart] = matches[matches.length - 1];
    const major =
      decPart != null
        ? Number.parseFloat(`${intPart}.${decPart.padEnd(2, '0').slice(0, 2)}`)
        : Number.parseInt(intPart, 10);
    return Number.isNaN(major) ? null : major;
  }
  const usd = h.match(/\$\s*(\d{1,6})(?:[.,](\d{1,2}))?/i);
  if (usd) {
    const dec = usd[2] != null ? `.${usd[2].padEnd(2, '0').slice(0, 2)}` : '';
    const major = Number.parseFloat(`${usd[1]}${dec}`);
    return Number.isNaN(major) ? null : major;
  }
  return null;
}

export function majorToFormAmount(major: number): string {
  if (!Number.isFinite(major)) return '';
  const rounded = Math.round(major * 100) / 100;
  if (rounded === Math.trunc(rounded)) return String(Math.trunc(rounded));
  const s = rounded.toFixed(2);
  return s.replace('.', ',');
}

export function periodicityFromBilling(billing?: string): 'monthly' | 'yearly' | 'quarterly' {
  const b = (billing ?? '').toLowerCase();
  if (b.includes('year') || b.includes('anual') || b.includes('annual')) return 'yearly';
  if (b.includes('quarter') || b.includes('trimest')) return 'quarterly';
  return 'monthly';
}

/**
 * Plan más útil para rellenar importe: prioriza uno con precio > 0; si no, el primero que no sea "Free";
 * si no, el primero.
 */
export function pickPlanForForm(plans: Plan[]): Plan | null {
  if (!plans.length) return null;
  for (const p of plans) {
    const m = parseMajorEuroFromHint(p.priceHint);
    if (m != null && m > 0) return p;
  }
  const nonFree = plans.find((p) => !FREE_NAME.test(p.name.trim()));
  return nonFree ?? plans[0];
}
