import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export type StreakData = {
  current_streak:      number;
  longest_streak:      number;
  freeze_banked:       boolean;
  freeze_used_on:      string | null;
  last_qualified_date: string | null;
  updated_at:          string;
};

const STREAK_KEY = (uid: string) => ['client_streaks', uid];

// ── Read streak ───────────────────────────────────────────────────────────────
export function useStreak() {
  const { user } = useAuth();

  return useQuery<StreakData | null>({
    queryKey: STREAK_KEY(user?.id ?? ''),
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_streaks')
        .select('*')
        .eq('client_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as StreakData | null;
    },
  });
}

// ── Rebuild streak from full history (call on home mount to fix retroactive gaps) ─
export function useRebuildStreak() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc('rebuild_alignment_streak', {
        p_client_id: user.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: STREAK_KEY(user.id) });
      }
    },
  });
}

// ── Recalculate streak via RPC (call after saving workout logs) ───────────────
export function useRecalculateStreak() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc('recalculate_alignment_streak', {
        p_client_id: user.id,
      });
      if (error) throw error;
      return data as { score: number; current_streak: number; freeze_banked: boolean; action: string } | null;
    },
    onSuccess: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: STREAK_KEY(user.id) });
        qc.invalidateQueries({ queryKey: ['alignment', user.id] });
      }
    },
  });
}
