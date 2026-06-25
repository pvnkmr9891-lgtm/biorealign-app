import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const coachRequestKeys = {
  pending: (coachId: string) => ['coach', coachId, 'coach_requests'] as const,
  myClients: (coachId: string) => ['coach', coachId, 'lite_clients'] as const,
};

// ── Pending requests for this coach, joined to client profile ───────────
export function usePendingCoachRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachRequestKeys.pending(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_requests')
        .select('id, client_id, message, created_at, client:profiles!coach_requests_client_id_fkey(id, full_name, avatar_url, phone)')
        .eq('coach_id', user!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });
}

// ── Approve / decline ─────────────────────────────────────────────────────
export function useRespondToCoachRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId, clientId, action,
    }: { requestId: string; clientId: string; action: 'approve' | 'decline' }) => {
      const { error: reqError } = await supabase
        .from('coach_requests')
        .update({ status: action === 'approve' ? 'approved' : 'declined', responded_at: new Date().toISOString() })
        .eq('id', requestId);
      if (reqError) throw reqError;

      if (action === 'approve') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ assigned_coach_id: user!.id })
          .eq('id', clientId);
        if (profileError) throw profileError;

        // Create the (empty) detailed-assessment shell now so the client's
        // profile screen has something to point at immediately. The client
        // side also self-heals if this is ever missing (see
        // useMyDetailedAssessment), so a failure here isn't fatal — but
        // surface it rather than swallowing it silently.
        const { error: assessmentError } = await supabase
          .from('coach_detailed_assessments')
          .upsert({ client_id: clientId, coach_id: user!.id }, { onConflict: 'client_id' });
        if (assessmentError) console.error('[CoachRequests] assessment shell create failed:', assessmentError.message);
      }

      await supabase.from('notifications').insert({
        user_id: clientId,
        title: action === 'approve' ? 'Coach request approved 🎉' : 'Coach request declined',
        body: action === 'approve'
          ? 'Your coach has accepted your request. Complete your detailed assessment to get started.'
          : 'Your coach request was declined. You can request another coach anytime.',
        type: 'coach_request',
        action_url: action === 'approve' ? '/(client)/profile' : null,
      });
    },
    onSuccess: (_d, vars) => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: coachRequestKeys.pending(user.id) });
        qc.invalidateQueries({ queryKey: coachRequestKeys.myClients(user.id) });
      }
      qc.invalidateQueries({ queryKey: ['client', vars.clientId, 'coach_status'] });
    },
  });
}

// ── Coach's assigned clients (Lite mode — via assigned_coach_id, not enrollments) ──
export function useMyLiteClients() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachRequestKeys.myClients(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, created_at')
        .eq('assigned_coach_id', user!.id)
        .order('full_name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
