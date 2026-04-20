import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

export type BillingRow = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

/** Lectura de subscriptions_billing (RLS: solo la fila propia). */
export function useBillingQuery() {
  const user = useSessionStore((s) => s.session?.user);
  const configured = isSupabaseConfigured();

  return useQuery({
    queryKey: ['billing', user?.id],
    enabled: configured && Boolean(user?.id),
    queryFn: async (): Promise<BillingRow | null> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('subscriptions_billing')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as BillingRow | null) ?? null;
    },
  });
}
