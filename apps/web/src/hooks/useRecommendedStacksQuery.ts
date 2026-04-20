import { useQuery } from '@tanstack/react-query';
import type { RecommendedStackRow } from '@/lib/dashboardRpc';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

export function useRecommendedStacksQuery() {
  const user = useSessionStore((s) => s.session?.user);
  const configured = isSupabaseConfigured();

  return useQuery({
    queryKey: ['recommended-stacks'],
    enabled: configured && Boolean(user?.id),
    queryFn: async (): Promise<RecommendedStackRow[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('recommended_stacks')
        .select('id, slug, name, description, monthly_estimate_cents, last_reviewed_at, sort_order, recommended_stack_items(label, sort_order)')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as RecommendedStackRow[];
      return rows.map((row) => ({
        ...row,
        recommended_stack_items: [...(row.recommended_stack_items ?? [])].sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
      }));
    },
  });
}
