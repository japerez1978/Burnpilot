import { cn } from '@/lib/utils';
import type { DashboardAlert } from '@/lib/dashboardRpc';

const severityStyles: Record<DashboardAlert['severity'], string> = {
  critical: 'border-accent-red/40 bg-accent-red/10 text-fg-primary',
  warning: 'border-accent-amber/50 bg-accent-amber/10 text-fg-primary',
  info: 'border-bg-border bg-bg-elev text-fg-primary',
};

export function AlertList({ alerts, className }: { alerts: DashboardAlert[]; className?: string }) {
  if (alerts.length === 0) return null;

  return (
    <ul className={cn('space-y-2', className)}>
      {alerts.map((a, i) => (
        <li
          key={`${a.code}-${i}`}
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            severityStyles[a.severity] ?? severityStyles.info,
          )}
        >
          <p className="font-medium">{a.title}</p>
          <p className="mt-1 text-fg-muted">{a.detail}</p>
        </li>
      ))}
    </ul>
  );
}
