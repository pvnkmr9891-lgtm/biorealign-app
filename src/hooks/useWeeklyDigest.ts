import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getWeekStart } from '@/hooks/useManualLog';

export interface WeeklyDigest {
  id: string;
  coach_id: string;
  client_id: string;
  week_start: string;
  summary: string;
  wins: string[];
  concerns: string[];
  suggested_message: string | null;
  created_at: string;
}

const digestKeys = {
  digest: (coachId: string, clientId: string, weekStart: string) =>
    ['weekly_digest', coachId, clientId, weekStart] as const,
};

/** Cached digest for the current week, if one was already generated. */
export function useWeeklyDigest(clientId: string) {
  const { user } = useAuth();
  const weekStart = getWeekStart();

  return useQuery({
    queryKey: digestKeys.digest(user?.id ?? '', clientId, weekStart),
    enabled: !!user?.id && !!clientId,
    queryFn: async (): Promise<WeeklyDigest | null> => {
      const { data, error } = await supabase
        .from('coach_client_digests')
        .select('*')
        .eq('coach_id', user!.id)
        .eq('client_id', clientId)
        .eq('week_start', weekStart)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Generate (or force-regenerate) this week's digest via the edge function. */
export function useGenerateWeeklyDigest(clientId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const weekStart = getWeekStart();

  return useMutation({
    mutationFn: async ({ force = false }: { force?: boolean } = {}): Promise<WeeklyDigest> => {
      const { data, error } = await supabase.functions.invoke('coach-weekly-digest', {
        body: { clientId, weekStart, force },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.digest as WeeklyDigest;
    },
    onSuccess: (digest) => {
      qc.setQueryData(digestKeys.digest(user?.id ?? '', clientId, weekStart), digest);
    },
  });
}
