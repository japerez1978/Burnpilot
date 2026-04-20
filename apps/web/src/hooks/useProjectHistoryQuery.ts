import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

export type SnapshotRow = {
  id: string;
  captured_at: string;
  monthly_burn_base_cents: number;
  yearly_burn_base_cents: number;
  tool_count: number;
};

/** Devuelve los últimos N snapshots de un proyecto (orden ASC por fecha). */
export function useProjectHistoryQuery(projectId: string | undefined, limit = 5) {
  const user = useSessionStore((s) => s.session?.user);
  const configured = isSupabaseConfigured();

  return useQuery({
    queryKey: ['project-history', user?.id, projectId],
    enabled: configured && Boolean(user?.id) && Boolean(projectId),
    queryFn: async (): Promise<SnapshotRow[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('project_history', {
        p_project_id: projectId!,
        p_limit: limit,
      });
      if (error) throw error;
      return (data as SnapshotRow[]) ?? [];
    },
  });
}
