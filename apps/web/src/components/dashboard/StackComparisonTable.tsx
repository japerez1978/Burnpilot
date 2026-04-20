import { formatCents } from '@burnpilot/utils';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { SnapshotRow } from '@/hooks/useProjectHistoryQuery';

type Props = {
  snapshots: SnapshotRow[];
  currency?: string;
  className?: string;
};

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const abs = Math.abs(pct);

  if (abs < 0.5) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
        <Minus className="h-3 w-3" />
        Sin cambio
      </span>
    );
  }

  const up = current > previous;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        up ? 'text-accent-red' : 'text-accent-green'
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : '-'}{abs.toFixed(1)}%
    </span>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return 'Ahora';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.round(diffDays / 7)} semanas`;
  return `Hace ${Math.round(diffDays / 30)} meses`;
}

export function StackComparisonTable({ snapshots, currency = 'EUR', className }: Props) {
  if (snapshots.length === 0) {
    return (
      <p className={`text-sm text-fg-muted ${className ?? ''}`}>
        Sin snapshots. Modifica las herramientas del proyecto para generar el primer registro.
      </p>
    );
  }

  // Mostrar de más reciente a más antiguo
  const ordered = [...snapshots].reverse();

  return (
    <div className={`overflow-x-auto ${className ?? ''}`}>
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-bg-border text-left text-xs font-medium uppercase tracking-wide text-fg-muted">
            <th className="pb-2 pr-4">Momento</th>
            <th className="pb-2 pr-4 text-right">Burn mensual</th>
            <th className="pb-2 pr-4 text-right">Burn anual</th>
            <th className="pb-2 pr-4 text-right">Herramientas</th>
            <th className="pb-2 text-right">Variación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bg-border/50">
          {ordered.map((snap, i) => {
            const prev = ordered[i + 1];
            return (
              <tr key={snap.id} className={i === 0 ? 'text-fg-primary' : 'text-fg-muted'}>
                <td className="py-3 pr-4">
                  <span className={i === 0 ? 'font-medium' : ''}>
                    {formatRelative(snap.captured_at)}
                  </span>
                  {i === 0 && (
                    <span className="ml-2 rounded-full bg-accent-green/10 px-2 py-0.5 text-xs font-medium text-accent-green">
                      Actual
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-right font-mono">
                  {formatCents(snap.monthly_burn_base_cents, currency)}
                </td>
                <td className="py-3 pr-4 text-right font-mono">
                  {formatCents(snap.yearly_burn_base_cents, currency)}
                </td>
                <td className="py-3 pr-4 text-right">{snap.tool_count}</td>
                <td className="py-3 text-right">
                  {prev ? (
                    <DeltaBadge
                      current={snap.monthly_burn_base_cents}
                      previous={prev.monthly_burn_base_cents}
                    />
                  ) : (
                    <span className="text-xs text-fg-muted/50">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
