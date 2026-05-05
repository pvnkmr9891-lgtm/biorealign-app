import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAssessmentStore } from '@/store/assessmentStore';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

export function useAssessmentSubmit() {
  const { user } = useAuth();
  const { getPayload, setSubmitting, setSubmitError } = useAssessmentStore();

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

      // 3. ✅ Re-fetch profile into Zustand store so AuthGuard
      //    sees onboarding_completed = true immediately
      await useAuthStore.getState().fetchProfile(user.id);

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