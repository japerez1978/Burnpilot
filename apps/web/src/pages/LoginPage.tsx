import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button, ButtonSecondary } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getAuthSiteOrigin } from '@/lib/authSiteOrigin';
import { formatAuthError } from '@/lib/authErrors';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

const schema = z.object({
  email: z.string().email('Introduce un email válido.'),
  password: z.string().min(8, 'Mínimo 8 caracteres.'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';

  const [oauthLoading, setOauthLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!isSupabaseConfigured()) {
    return (
      <AuthLayout
        title="Entrar"
        subtitle="Configura Supabase en .env.local para usar el login."
      >
        <p className="text-sm text-accent-amber">
          Añade <code className="font-mono text-fg-primary">VITE_SUPABASE_URL</code> y{' '}
          <code className="font-mono text-fg-primary">VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <Link to="/" className="block text-center text-sm text-accent-green hover:underline">
          Volver al inicio
        </Link>
      </AuthLayout>
    );
  }

  const supabase = getSupabaseClient();

  async function onSubmit(values: FormValues) {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setFormError('root', { message: formatAuthError(error.message) });
      return;
    }

    navigate(from, { replace: true });
  }

  async function signInWithGoogle() {
    setOauthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getAuthSiteOrigin()}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
    setOauthLoading(false);
    if (error) {
      setFormError('root', { message: formatAuthError(error.message) });
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Accede con email o Google. La verificación de email debe estar activa en Supabase."
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-fg-primary">
            Email
          </label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email ? <p className="text-sm text-accent-red">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-fg-primary">
            Contraseña
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-sm text-accent-red">{errors.password.message}</p>
          ) : null}
        </div>

        {errors.root ? (
          <p className="text-sm text-accent-red" role="alert">
            {errors.root.message}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting || oauthLoading}>
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-bg-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="bg-bg-card px-2 text-fg-muted">o</span>
        </div>
      </div>

      <ButtonSecondary
        type="button"
        className="w-full"
        onClick={() => void signInWithGoogle()}
        disabled={oauthLoading || isSubmitting}
      >
        {oauthLoading ? 'Abriendo Google…' : 'Continuar con Google'}
      </ButtonSecondary>

      <p className="text-center text-sm text-fg-muted">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="font-medium text-accent-green hover:underline">
          Regístrate
        </Link>
      </p>
      <p className="text-center text-sm text-fg-muted">
        <Link to="/auth/forgot" className="hover:text-fg-primary hover:underline">
          ¿Olvidaste la contraseña?
        </Link>
      </p>
    </AuthLayout>
  );
}
