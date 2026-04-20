import { useQuery } from '@tanstack/react-query';
import type { DashboardHistoryPoint } from '@/lib/dashboardRpc';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

export function useDashboardHistoryQuery(months = 6) {
  const user = useSessionStore((s) => s.session?.user);
  const configured = isSupabaseConfigured();

  return useQuery({
    queryKey: ['dashboard-history', user?.id, months],
    enabled: configured && Boolean(user?.id),
    queryFn: async (): Promise<DashboardHistoryPoint[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('dashboard_history', { p_months: months });
      if (error) throw error;
      if (data == null) return [];
      const parsed = typeof data === 'string' ? (JSON.parse(data) as unknown) : data;
      return Array.isArray(parsed) ? (parsed as DashboardHistoryPoint[]) : [];
    },
  });
}
