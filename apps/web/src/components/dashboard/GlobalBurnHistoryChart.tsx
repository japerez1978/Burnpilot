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
import type { DashboardHistoryPoint } from '@/lib/dashboardRpc';

type Props = {
  points: DashboardHistoryPoint[];
  currency?: string;
  className?: string;
};

function monthLabel(isoMonth: string): string {
  const d = new Date(isoMonth);
  if (Number.isNaN(d.getTime())) return isoMonth;
  return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
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

export function GlobalBurnHistoryChart({ points, currency = 'EUR', className }: Props) {
  if (points.length === 0) {
    return (
      <div className={`flex items-center justify-center py-8 text-sm text-fg-muted ${className ?? ''}`}>
        Sin datos de histórico. Los puntos se generan al asignar herramientas a proyectos.
      </div>
    );
  }

  const data = points.map((p) => ({
    label: monthLabel(p.month),
    burn: p.total_base_cents,
    month: p.month,
  }));

  const maxBurn = Math.max(...data.map((d) => d.burn), 1);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="globalBurnGradient" x1="0" y1="0" x2="0" y2="1">
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
          <YAxis hide domain={[0, maxBurn * 1.15]} />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Area
            type="monotone"
            dataKey="burn"
            stroke="#4ADE80"
            strokeWidth={2}
            fill="url(#globalBurnGradient)"
            dot={{ r: 3, fill: '#4ADE80', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#4ADE80', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
