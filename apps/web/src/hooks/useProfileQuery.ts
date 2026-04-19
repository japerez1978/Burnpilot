import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  display_currency: string;
  monthly_budget_cents: number | null;
  onboarding_completed_at: string | null;
  plan_tier: string;
  created_at: string;
  updated_at: string;
};

export function useProfileQuery() {
  const user = useSessionStore((s) => s.session?.user);
  const configured = isSupabaseConfigured();

  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: configured && Boolean(user?.id),
    queryFn: async (): Promise<Profile | null> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
      if (error) throw error;
      return data as Profile;
    },
  });
}
