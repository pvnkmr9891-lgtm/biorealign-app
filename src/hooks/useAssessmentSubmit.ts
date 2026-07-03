import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAssessmentStore } from '@/store/assessmentStore';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { assignFBRBeginnerPlan, isFBRBeginner } from '@/hooks/useAssignWorkoutPlan';
import { getWeekStart } from '@/hooks/useManualLog';

const CONDITION_LABELS: Record<string, string> = {
  diabetes: 'Diabetes', hypertension: 'Hypertension', thyroid: 'Thyroid',
  pcos: 'PCOS/PCOD', heart: 'Cardiac', asthma: 'Asthma', arthritis: 'Arthritis',
};

// CORE-Q9/Q10/Q-SUPPLEMENTS/Q-OCCUPATION/Q-LOCATION feed `profiles` directly
// (the single shared source the Overview tab edits) rather than only living
// in this assessment's jsonb — mirrors the existing diet_type cross-table
// pattern used by the Detailed Assessment.
function deriveProfileFieldsFromAnswers(answers: Record<string, any>) {
  const fields: Record<string, any> = {};

  const conditionValues: string[] = Array.isArray(answers['CORE-Q9']) ? answers['CORE-Q9'] : [];
  const conditions = conditionValues.filter((v) => v !== 'none').map((v) => CONDITION_LABELS[v] ?? v);
  const conditionDetail = String(answers['CORE-Q9-detail'] ?? '').trim();
  if (conditionDetail) conditions.push(conditionDetail);
  if (conditions.length) fields.conditions = conditions;

  if (answers['CORE-Q10'] === 'yes') {
    const medDetail = String(answers['CORE-Q10-detail'] ?? '').trim();
    if (medDetail) fields.medications = medDetail.split(',').map((s) => s.trim()).filter(Boolean);
  }

  const supplementValues: string[] = Array.isArray(answers['CORE-Q-SUPPLEMENTS']) ? answers['CORE-Q-SUPPLEMENTS'] : [];
  const supplements = supplementValues.filter((v) => v !== 'none');
  if (supplements.length) fields.supplements = supplements;

  const occupation = String(answers['CORE-Q-OCCUPATION'] ?? '').trim();
  if (occupation) fields.occupation = occupation;

  const location = String(answers['CORE-Q-LOCATION'] ?? '').trim();
  if (location) fields.location = location;

  return fields;
}

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

      // 2. Mark onboarding complete on profile, plus the fields that are
      // single-sourced on profiles (conditions/medications/supplements/
      // occupation/location) rather than duplicated in this assessment row.
      const profileFields = deriveProfileFieldsFromAnswers((payload as any).answers ?? {});
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          ...profileFields,
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