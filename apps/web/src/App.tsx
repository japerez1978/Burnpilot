import { Flame } from 'lucide-react';

export function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex items-center gap-3">
        <Flame className="h-10 w-10 text-accent-green" strokeWidth={2} />
        <h1 className="text-4xl font-bold tracking-tight">BurnPilot</h1>
      </div>
      <p className="max-w-md text-center text-fg-muted">
        Spend optimizer para builders no técnicos.
      </p>
      <code className="rounded border border-bg-border bg-bg-card px-3 py-1.5 font-mono text-sm text-accent-green">
        Sprint 0 · cimientos listos
      </code>
    </main>
  );
}
