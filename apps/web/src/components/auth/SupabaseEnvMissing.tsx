import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { getSupabaseConfigDebug } from '@/lib/supabase';

type Props = {
  title: string;
  /** Texto corto bajo el título (local vs prod se explica en el cuerpo). */
  subtitle: string;
};

/**
 * Pantalla cuando VITE_SUPABASE_* no llegaron al bundle (típico: Netlify sin vars o sin redeploy).
 */
export function SupabaseEnvMissing({ title, subtitle }: Props) {
  const d = getSupabaseConfigDebug();
  const prod = import.meta.env.PROD;

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      <p className="text-sm text-accent-amber">
        Añade <code className="font-mono text-fg-primary">VITE_SUPABASE_URL</code> y{' '}
        <code className="font-mono text-fg-primary">VITE_SUPABASE_ANON_KEY</code>
        {prod ? (
          <>
            {' '}
            en Netlify: <strong>Site configuration → Environment variables</strong> (mismos nombres que en
            local). Después <strong>Trigger deploy → Clear cache and deploy site</strong>: Vite solo lee
            esas variables al <em>build</em>.
          </>
        ) : (
          <>
            {' '}
            en <code className="font-mono text-fg-primary">apps/web/.env.local</code> (copia desde{' '}
            <code className="font-mono text-fg-primary">.env.example</code>).
          </>
        )}
      </p>
      {prod && (
        <p className="mt-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-fg-muted">
          Diagnóstico de este build: URL presente = {d.urlPresent ? 'sí' : 'no'}, longitud clave ={' '}
          {d.keyLength}, formato clave OK = {d.keyLooksValid ? 'sí' : 'no'}. Si longitud es 0, el último
          deploy se hizo sin esas variables visibles para el build.
        </p>
      )}
      <Link to="/" className="mt-4 block text-center text-sm text-accent-green hover:underline">
        Volver al inicio
      </Link>
    </AuthLayout>
  );
}
