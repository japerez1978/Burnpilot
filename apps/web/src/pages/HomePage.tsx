import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors bg-accent-green text-bg-base hover:bg-accent-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-green';

const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-bg-border bg-bg-card px-4 py-2.5 text-sm font-semibold text-fg-primary transition-colors hover:border-fg-muted/40 hover:bg-bg-elev focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-green';

export function HomePage() {
  const session = useSessionStore((s) => s.session);
  const configured = isSupabaseConfigured();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex items-center gap-3">
        <Flame className="h-10 w-10 text-accent-green" strokeWidth={2} />
        <h1 className="text-4xl font-bold tracking-tight">BurnPilot</h1>
      </div>
      <p className="max-w-md text-center text-fg-muted">
        Spend optimizer para builders no técnicos.
      </p>

      {!configured ? (
        <p className="max-w-lg rounded-lg border border-accent-amber/40 bg-bg-card px-4 py-3 text-center text-sm text-accent-amber">
          Falta configurar Supabase en <code className="font-mono text-fg-primary">apps/web/.env.local</code>{' '}
          (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {session ? (
          <Link to="/dashboard" className={cn(btnPrimary)}>
            Ir al dashboard
          </Link>
        ) : (
          <>
            <Link to="/login" className={cn(btnPrimary)}>
              Entrar
            </Link>
            <Link to="/register" className={cn(btnSecondary)}>
              Crear cuenta
            </Link>
          </>
        )}
      </div>

      <code className="rounded border border-bg-border bg-bg-card px-3 py-1.5 font-mono text-sm text-accent-green">
        Sprint 1 · Auth + perfil
      </code>
    </main>
  );
}
