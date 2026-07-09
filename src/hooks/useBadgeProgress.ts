import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useStreak } from '@/hooks/useStreakSystem';
import { useAlignmentHistory, useTotalDaysLogged } from '@/hooks/useAlignmentScore';
import { PHASES, BadgeCategory, BadgeDef, PhaseDef } from '@/constants/badges';

export interface BadgeState extends BadgeDef {
  earned: boolean;
  progress: number; // current value for this badge's category, uncapped
}

export interface PhaseState extends PhaseDef {
  badges: BadgeState[];
  locked: boolean;
  complete: boolean;
  earnedCount: number;
}

// Lightweight row-count queries (head:true, count:'exact') — cheaper than
// fetching full history just to know "how many".
function useRowCount(table: string, clientId: string | undefined) {
  return useQuery({
    queryKey: ['badge_progress', table, clientId],
    enabled: !!clientId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useBadgeProgress() {
  const { user } = useAuth();
  const clientId = user?.id;

  const { data: streak }              = useStreak();
  const { data: alignHistory28 = [] } = useAlignmentHistory(28);
  const { data: daysLogged = 0 }      = useTotalDaysLogged(clientId, null);
  const { data: checkinCount = 0 }    = useRowCount('daily_checkins', clientId);
  const { data: measurementCount = 0 } = useRowCount('body_metrics', clientId);
  const { data: perfectWeekCount = 0 } = useQuery({
    queryKey: ['badge_progress', 'perfect_weeks', clientId],
    enabled: !!clientId,
    staleTime: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('client_achievements')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId!)
        .eq('kind', 'perfect_week');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const rollingAvg = useMemo(() => {
    const scored = alignHistory28.filter((d) => d.score !== null);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((s, d) => s + (d.score ?? 0), 0) / scored.length);
  }, [alignHistory28]);

  const metrics: Record<BadgeCategory, number> = {
    streak:       streak?.longest_streak ?? 0,
    perfect_week: perfectWeekCount,
    days_logged:  daysLogged,
    checkin:      checkinCount,
    measurement:  measurementCount,
    alignment:    rollingAvg,
  };

  const phases: PhaseState[] = useMemo(() => {
    let prevComplete = true; // phase 1 is never locked
    return PHASES.map((phase) => {
      const badges: BadgeState[] = phase.badges.map((b) => ({
        ...b,
        progress: metrics[b.category],
        earned:   metrics[b.category] >= b.threshold,
      }));
      const complete = badges.every((b) => b.earned);
      const locked = !prevComplete;
      prevComplete = complete;
      return { ...phase, badges, locked, complete, earnedCount: badges.filter((b) => b.earned).length };
    });
  }, [streak?.longest_streak, perfectWeekCount, daysLogged, checkinCount, measurementCount, rollingAvg]);

  const totalEarned = phases.reduce((s, p) => s + p.earnedCount, 0);
  const totalBadges = phases.reduce((s, p) => s + p.badges.length, 0);

  return { phases, totalEarned, totalBadges };
}
