import { Flame } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navLink =
  'rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg-primary';
const navLinkActive = 'bg-bg-card text-fg-primary';

type Props = {
  children: React.ReactNode;
};

export function PublicLayout({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-base">
      <header className="sticky top-0 z-40 border-b border-bg-border bg-bg-base/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-fg-primary">
            <Flame className="h-8 w-8 text-accent-green" strokeWidth={2} />
            BurnPilot
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/pricing" className={({ isActive }) => cn(navLink, isActive && navLinkActive)} end>
              Precios
            </NavLink>
            <NavLink to="/faq" className={({ isActive }) => cn(navLink, isActive && navLinkActive)} end>
              FAQ
            </NavLink>
            <span className="mx-1 hidden h-4 w-px bg-bg-border sm:inline" aria-hidden />
            <Link to="/login" className={navLink}>
              Entrar
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-accent-green px-3 py-2 text-sm font-semibold text-bg-base hover:bg-accent-green/90"
            >
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-bg-border py-8 text-center text-xs text-fg-muted">
        <p className="font-medium text-fg-primary">BurnPilot</p>
        <p className="mt-2">Spend optimizer para builders no técnicos.</p>
        <nav className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link to="/legal/privacy" className="hover:text-accent-green">
            Privacidad
          </Link>
          <Link to="/legal/terms" className="hover:text-accent-green">
            Términos
          </Link>
        </nav>
        <p className="mt-4">© {new Date().getFullYear()} BurnPilot</p>
      </footer>
    </div>
  );
}
