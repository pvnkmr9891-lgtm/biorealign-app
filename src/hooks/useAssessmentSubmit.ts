import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAssessmentStore } from '@/store/assessmentStore';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { assignFBRBeginnerPlan, isFBRBeginner } from '@/hooks/useAssignWorkoutPlan';
import { getWeekStart } from '@/hooks/useManualLog';

export function useAssessmentSubmit() {
  const { user } = useAuth();
  const { getPayload, setSubmitting, setSubmitError } = useAssessmentStore();
  const queryClient = useQueryClient();

  const submit = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setSubmitError('Not authenticated. Please log in again.');
      return false;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = getPayload();

      // 1. Insert assessment record
      const { error: assessmentError } = await supabase
        .from('assessments')
        .insert({ client_id: user.id, ...payload });

      if (assessmentError) throw assessmentError;

      // 2. Mark onboarding complete on profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 3. Re-fetch profile into Zustand store so AuthGuard sees onboarding_completed = true
      await useAuthStore.getState().fetchProfile(user.id);

      // 4. Auto-assign FBR beginner home plan if the combination matches
      const profile = useAuthStore.getState().profile as any;
      if (isFBRBeginner(profile?.workout_program_id, profile?.workout_intensity)) {
        try {
          const weekStart = getWeekStart();
          await assignFBRBeginnerPlan(user.id, profile?.workout_training_type, weekStart);
        } catch (e) { console.warn('[Plan] auto-assign failed', e); }
      }

      // 5. Invalidate assessment + workout queries
      queryClient.invalidateQueries({ queryKey: ['my_assessment', user.id] });
      queryClient.invalidateQueries({ queryKey: ['coach', 'assessment', user.id] });
      queryClient.invalidateQueries({ queryKey: ['workout', 'plan', user.id] });

      return true;
    } catch (err: any) {
      const message = err?.message ?? 'Submission failed. Please try again.';
      setSubmitError(message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, getPayload, setSubmitting, setSubmitError]);

  return { submit };
}