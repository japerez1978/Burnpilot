import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getAuthSiteOrigin } from '@/lib/authSiteOrigin';
import { formatAuthError } from '@/lib/authErrors';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

const schema = z.object({
  email: z.string().email('Introduce un email válido.'),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [info, setInfo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
    clearErrors,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!isSupabaseConfigured()) {
    return (
      <AuthLayout title="Recuperar contraseña" subtitle="Configura Supabase en .env.local.">
        <p className="text-sm text-accent-amber">
          Añade las variables del proyecto Supabase existente en{' '}
          <code className="font-mono text-fg-primary">apps/web/.env.local</code>.
        </p>
        <Link to="/login" className="block text-center text-sm text-accent-green hover:underline">
          Volver al login
        </Link>
      </AuthLayout>
    );
  }

  const supabase = getSupabaseClient();

  async function onSubmit(values: FormValues) {
    clearErrors('root');
    setInfo(null);

    const redirectTo = `${getAuthSiteOrigin()}/auth/reset`;

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo,
    });

    if (error) {
      setFormError('root', { message: formatAuthError(error.message) });
      return;
    }

    setInfo(
      'Si el email existe, recibirás un enlace para restablecer la contraseña. Revisa también spam.',
    );
  }

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace (vía Supabase Auth) para elegir una contraseña nueva."
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-fg-primary">
            Email
          </label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email ? <p className="text-sm text-accent-red">{errors.email.message}</p> : null}
        </div>

        {info ? (
          <p className="text-sm text-fg-muted" role="status">
            {info}
          </p>
        ) : null}

        {errors.root ? (
          <p className="text-sm text-accent-red" role="alert">
            {errors.root.message}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
        </Button>
      </form>

      <p className="text-center text-sm text-fg-muted">
        <Link to="/login" className="text-accent-green hover:underline">
          Volver a entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
