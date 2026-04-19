/** Mensajes legibles en español para errores frecuentes de Supabase Auth. */
export function formatAuthError(message: string | undefined): string {
  if (!message) return 'Ha ocurrido un error. Inténtalo de nuevo.';

  const m = message.toLowerCase();

  if (m.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos.';
  }
  if (m.includes('email not confirmed')) {
    return 'Aún no has confirmado el email. Revisa tu bandeja de entrada.';
  }
  if (m.includes('user already registered')) {
    return 'Ya existe una cuenta con este email.';
  }
  if (m.includes('password should be at least')) {
    return 'La contraseña no cumple los requisitos mínimos.';
  }
  if (m.includes('signup requires a valid password')) {
    return 'Introduce una contraseña válida.';
  }
  if (m.includes('rate limit')) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  }

  return message;
}
