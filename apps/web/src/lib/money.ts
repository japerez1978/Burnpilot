/** Convierte texto de importe mayor (ej. "20,5") a céntimos enteros. Vacío o "0" → 0 (plan gratuito). */
export function parseMajorToCents(raw: string): number | null {
  const s = raw.trim();
  if (!s) return 0;
  const normalized = s.replace(',', '.');
  const major = Number.parseFloat(normalized);
  if (Number.isNaN(major) || major < 0) return null;
  return Math.round(major * 100);
}
