import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toLocalDateStr } from '@/lib/dateHelpers';

export type AchievementKind = 'streak' | 'tier' | 'perfect_week';

export interface Achievement {
  id: string;
  client_id: string;
  kind: AchievementKind;
  label: string;
  icon: string;
  achieved_on: string;
  created_at: string;
}

const achievementKeys = {
  list: (uid: string) => ['client_achievements', uid] as const,
};

export function useAchievements() {
  const { user } = useAuth();
  return useQuery({
    queryKey: achievementKeys.list(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_achievements')
        .select('*')
        .eq('client_id', user!.id)
        .order('achieved_on', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Achievement[];
    },
  });
}

// Fires from the three places a milestone is detected on the home screen
// (streak crossing, tier-up, perfect week). onConflict silently no-ops if
// this exact milestone/day was already recorded — safe to call every time
// the crossing condition is true, not just once.
export function useRecordAchievement() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ kind, label, icon, achievedOn }: { kind: AchievementKind; label: string; icon: string; achievedOn?: string }) => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('client_achievements')
        .upsert(
          { client_id: user.id, kind, label, icon, achieved_on: achievedOn ?? toLocalDateStr(new Date()) },
          { onConflict: 'client_id,kind,label,achieved_on', ignoreDuplicates: true }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: achievementKeys.list(user.id) });
    },
  });
}
