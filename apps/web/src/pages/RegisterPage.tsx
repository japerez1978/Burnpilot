import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button, ButtonSecondary } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getAuthSiteOrigin } from '@/lib/authSiteOrigin';
import { formatAuthError } from '@/lib/authErrors';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

const schema = z.object({
  fullName: z.string().max(120).optional(),
  email: z.string().email('Introduce un email válido.'),
  password: z.string().min(8, 'Mínimo 8 caracteres.'),
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const [oauthLoading, setOauthLoading] = useState(false);
  const [registeredNotice, setRegisteredNotice] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!isSupabaseConfigured()) {
    return (
      <AuthLayout
        title="Crear cuenta"
        subtitle="Configura Supabase en .env.local para registrarte."
      >
        <p className="text-sm text-accent-amber">
          Añade <code className="font-mono text-fg-primary">VITE_SUPABASE_URL</code> y{' '}
          <code className="font-mono text-fg-primary">VITE_SUPABASE_ANON_KEY</code> del proyecto
          Supabase que ya usas.
        </p>
        <Link to="/" className="block text-center text-sm text-accent-green hover:underline">
          Volver al inicio
        </Link>
      </AuthLayout>
    );
  }

  const supabase = getSupabaseClient();

  async function onSubmit(values: FormValues) {
    setRegisteredNotice(null);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${getAuthSiteOrigin()}/auth/callback`,
        data: {
          full_name: values.fullName?.trim() || undefined,
        },
      },
    });

    if (error) {
      setFormError('root', { message: formatAuthError(error.message) });
      return;
    }

    if (data.session) {
      setRegisteredNotice('Cuenta creada. Ya puedes entrar.');
      return;
    }

    setRegisteredNotice(
      'Revisa tu correo para confirmar la cuenta antes de entrar (según la configuración de Auth en Supabase).',
    );
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
      title="Crear cuenta"
      subtitle="Usa el mismo proyecto Supabase que ya tienes; no hace falta crear otro."
    >
      {registeredNotice ? (
        <p className="rounded-lg border border-accent-green/30 bg-bg-base px-3 py-2 text-sm text-fg-primary">
          {registeredNotice}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="text-sm font-medium text-fg-primary">
            Nombre (opcional)
          </label>
          <Input id="fullName" type="text" autoComplete="name" {...register('fullName')} />
          {errors.fullName ? (
            <p className="text-sm text-accent-red">{errors.fullName.message}</p>
          ) : null}
        </div>
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
            autoComplete="new-password"
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
          {isSubmitting ? 'Creando cuenta…' : 'Registrarse'}
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
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-medium text-accent-green hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
