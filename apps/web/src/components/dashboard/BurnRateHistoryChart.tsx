import { formatCents } from '@burnpilot/utils';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SnapshotRow } from '@/hooks/useProjectHistoryQuery';

type Props = {
  snapshots: SnapshotRow[];
  currency?: string;
  className?: string;
};

function relativeLabel(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return 'Ahora';
  if (diffDays < 7) return `Hace ${diffDays}d`;
  if (diffDays < 30) return `Hace ${Math.round(diffDays / 7)}sem`;
  return `Hace ${Math.round(diffDays / 30)}mes`;
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  currency: string;
};

function CustomTooltip({ active, payload, label, currency }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-bg-border bg-bg-elev px-3 py-2 text-xs shadow-lg">
      <p className="text-fg-muted">{label}</p>
      <p className="mt-1 font-mono font-semibold text-accent-green">
        {formatCents(payload[0].value, currency)}/mes
      </p>
    </div>
  );
}

export function BurnRateHistoryChart({ snapshots, currency = 'EUR', className }: Props) {
  if (snapshots.length < 2) {
    return (
      <div className={`flex items-center justify-center py-8 text-sm text-fg-muted ${className ?? ''}`}>
        {snapshots.length === 0
          ? 'Sin historial aún. Asigna o modifica herramientas para generar snapshots.'
          : 'Se necesitan al menos 2 snapshots para mostrar el gráfico.'}
      </div>
    );
  }

  const data = snapshots.map((s) => ({
    label: relativeLabel(s.captured_at),
    burn: s.monthly_burn_base_cents,
    captured_at: s.captured_at,
  }));

  const maxBurn = Math.max(...data.map((d) => d.burn));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="burnGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--color-fg-muted, #9ca3af)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            hide
            domain={[0, maxBurn * 1.2]}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Area
            type="monotone"
            dataKey="burn"
            stroke="#4ADE80"
            strokeWidth={2}
            fill="url(#burnGradient)"
            dot={{ r: 3, fill: '#4ADE80', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#4ADE80', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
