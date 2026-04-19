import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatAuthError } from '@/lib/authErrors';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres.'),
    confirm: z.string().min(8, 'Mínimo 8 caracteres.'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }

    const supabase = getSupabaseClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(true);
      if (!session) return;
    });
  }, []);

  if (!isSupabaseConfigured()) {
    return (
      <AuthLayout title="Nueva contraseña" subtitle="Configura Supabase en .env.local.">
        <Link to="/login" className="block text-center text-sm text-accent-green hover:underline">
          Volver al login
        </Link>
      </AuthLayout>
    );
  }

  const supabase = getSupabaseClient();

  async function onSubmit(values: FormValues) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setFormError('root', {
        message: 'Enlace inválido o caducado. Solicita un nuevo correo de recuperación.',
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setFormError('root', { message: formatAuthError(error.message) });
      return;
    }

    navigate('/dashboard', { replace: true });
  }

  return (
    <AuthLayout
      title="Nueva contraseña"
      subtitle="El enlace del correo te ha dado una sesión temporal; define tu contraseña nueva."
    >
      {!ready ? (
        <p className="text-sm text-fg-muted">Comprobando enlace…</p>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-fg-primary">
              Contraseña nueva
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
          <div className="space-y-1.5">
            <label htmlFor="confirm" className="text-sm font-medium text-fg-primary">
              Repetir contraseña
            </label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...register('confirm')}
            />
            {errors.confirm ? (
              <p className="text-sm text-accent-red">{errors.confirm.message}</p>
            ) : null}
          </div>

          {errors.root ? (
            <p className="text-sm text-accent-red" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-fg-muted">
        <Link to="/login" className="text-accent-green hover:underline">
          Volver a entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
