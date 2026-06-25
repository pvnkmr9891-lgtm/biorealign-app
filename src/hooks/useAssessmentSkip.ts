import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAssessmentStore } from '@/store/assessmentStore';
import { useAuthStore } from '@/store/authStore';

export function useAssessmentSkip() {
  const router = useRouter();
  const [skipping, setSkipping] = useState(false);

  const skip = useCallback(async () => {
    setSkipping(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const payload = useAssessmentStore.getState().getPayload();
        // Save partial assessment data — ignore conflict errors
        try { await supabase.from('assessments').insert({ client_id: user.id, ...payload }); } catch (_) {}
        // Mark onboarding done so auth guard stops redirecting to onboarding
        await supabase.from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
        useAuthStore.setState(s => ({
          profile: s.profile ? { ...s.profile, onboarding_completed: true } : s.profile,
        }));
      }
    } finally {
      setSkipping(false);
      router.replace('/(client)');
    }
  }, [router]);

  return { skip, skipping };
}
