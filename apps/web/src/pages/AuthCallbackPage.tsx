import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      navigate('/login', { replace: true });
      return;
    }

    const supabase = getSupabaseClient();

    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        navigate('/login', { replace: true });
        return;
      }
      navigate('/dashboard', { replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-fg-muted">
      Finalizando acceso…
    </div>
  );
}
