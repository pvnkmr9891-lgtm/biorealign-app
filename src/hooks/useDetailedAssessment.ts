import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export type AssessmentStageKey = 'lifestyle' | 'health' | 'nutrition' | 'workstyle' | 'goals' | 'body_metrics' | 'resources' | 'sport_profile' | 'performance';

export const detailedAssessmentKeys = {
  mine:    (clientId: string) => ['detailed_assessment', clientId] as const,
};

export function useMyDetailedAssessment() {
  const { user } = useAuth();

  return useQuery({
    queryKey: detailedAssessmentKeys.mine(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_detailed_assessments')
        .select('*')
        .eq('client_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;

      // Self-heal: the coach's approval flow normally creates this shell
      // row, but if that insert ever fails (or this row predates the
      // coach-side INSERT policy), create it ourselves — the client always
      // has insert rights on their own row, so this can't get stuck.
      const { data: profile } = await supabase.from('profiles').select('assigned_coach_id').eq('id', user!.id).single();
      if (!profile?.assigned_coach_id) return null;

      const { data: created, error: createError } = await supabase
        .from('coach_detailed_assessments')
        .insert({ client_id: user!.id, coach_id: profile.assigned_coach_id })
        .select('*')
        .single();
      if (createError) throw createError;
      return created;
    },
    refetchInterval: 15000, // pick up coach review status without a manual reload
  });
}

export function useClientDetailedAssessment(clientId: string) {
  return useQuery({
    queryKey: detailedAssessmentKeys.mine(clientId),
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_detailed_assessments')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// The athlete toggle saves immediately (not gated behind "Next") since it
// controls which stages are visible at all — it's its own relational column
// so it stays directly queryable later, not buried inside a jsonb blob.
export function useSetAthleteFlag() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (isAthlete: boolean) => {
      const { error } = await supabase
        .from('coach_detailed_assessments')
        .update({ is_athlete: isAthlete, updated_at: new Date().toISOString() })
        .eq('client_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: detailedAssessmentKeys.mine(user.id) });
    },
  });
}

// Save one stage's answers + advance current_stage pointer
export function useSaveAssessmentStage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stageKey, data, nextStage,
    }: { stageKey: AssessmentStageKey; data: Record<string, any>; nextStage: number }) => {
      const { error } = await supabase
        .from('coach_detailed_assessments')
        .update({ [stageKey]: data, current_stage: nextStage, updated_at: new Date().toISOString() })
        .eq('client_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: detailedAssessmentKeys.mine(user.id) });
    },
  });
}

export function useSubmitDetailedAssessment() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: row, error } = await supabase
        .from('coach_detailed_assessments')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('client_id', user!.id)
        .select('coach_id')
        .single();
      if (error) throw error;

      if (row?.coach_id) {
        await supabase.from('notifications').insert({
          user_id: row.coach_id,
          title: 'Detailed assessment submitted',
          body: `${profile?.full_name ?? 'Your client'} completed their detailed assessment. Review it and build their plan.`,
          type: 'alert',
          action_url: '/(coach)/lite-clients',
        });
      }
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: detailedAssessmentKeys.mine(user.id) });
    },
  });
}

export function useMarkAssessmentReviewed() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('coach_detailed_assessments')
        .update({ status: 'reviewed', reviewed_at: new Date().toISOString(), reviewed_by: user!.id })
        .eq('client_id', clientId);
      if (error) throw error;
    },
    onSuccess: (_d, clientId) => {
      qc.invalidateQueries({ queryKey: detailedAssessmentKeys.mine(clientId) });
    },
  });
}
