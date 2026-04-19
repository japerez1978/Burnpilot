import type { ReactNode } from 'react';
import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link
        to="/"
        className="mb-10 flex items-center gap-2 text-fg-primary transition-opacity hover:opacity-80"
      >
        <Flame className="h-8 w-8 text-accent-green" strokeWidth={2} />
        <span className="text-xl font-bold tracking-tight">BurnPilot</span>
      </Link>
      <div className="w-full max-w-md rounded-xl border border-bg-border bg-bg-card p-8 shadow-xl shadow-black/40">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-fg-muted">{subtitle}</p> : null}
        <div className="mt-8 space-y-5">{children}</div>
      </div>
    </main>
  );
}
