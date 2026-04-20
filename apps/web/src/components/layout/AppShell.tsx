import { Outlet, Link, useLocation } from 'react-router-dom';
import { CreditCard, Flame, LayoutDashboard, Layers, PiggyBank, Settings, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectSidebarSection } from '@/components/projects/ProjectSidebarSection';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tools', label: 'Herramientas', icon: Wrench },
  { to: '/stacks', label: 'Stacks', icon: Layers },
  { to: '/savings', label: 'Ahorro', icon: PiggyBank },
  { to: '/settings/account', label: 'Cuenta', icon: Settings },
  { to: '/settings/billing', label: 'Facturación', icon: CreditCard },
] as const;

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-bg-base">
      <aside className="flex w-64 shrink-0 flex-col border-r border-bg-border bg-bg-elev">
        <div className="flex items-center gap-2 border-b border-bg-border px-4 py-4">
          <Flame className="h-7 w-7 text-accent-green" strokeWidth={2} />
          <span className="text-lg font-bold tracking-tight">BurnPilot</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-bg-card text-fg-primary'
                    : 'text-fg-muted hover:bg-bg-card/60 hover:text-fg-primary',
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                {label}
              </Link>
            );
          })}
        </nav>
        <ProjectSidebarSection />
      </aside>
      <main className="min-h-screen flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
