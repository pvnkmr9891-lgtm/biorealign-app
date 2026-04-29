import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------
export const coachKeys = {
  clients:       (uid: string) => ['coach', uid, 'clients'] as const,
  client:        (uid: string, clientId: string) => ['coach', uid, 'client', clientId] as const,
  sessions:      (uid: string) => ['coach', uid, 'sessions'] as const,
  todaySessions: (uid: string) => ['coach', uid, 'sessions', 'today'] as const,
  messages:      (enrollmentId: string) => ['messages', enrollmentId] as const,
};

// ---------------------------------------------------------------------------
// All clients for this coach
// ---------------------------------------------------------------------------
export function useCoachClients() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachKeys.clients(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          status,
          current_week,
          started_at,
          program:programs(id, name, slug, duration_weeks),
          client:profiles!enrollments_client_id_fkey(
            id, full_name, phone, avatar_url, health_goals, conditions
          )
        `)
        .eq('coach_id', user!.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Single client detail + latest metrics
// ---------------------------------------------------------------------------
export function useClientDetail(clientId: string, enrollmentId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachKeys.client(user?.id ?? '', clientId),
    enabled: !!clientId && !!enrollmentId,
    queryFn: async () => {
      const [profileRes, metricsRes, checkinsRes, sessionsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', clientId).single(),
        supabase.from('progress_metrics')
          .select('*').eq('client_id', clientId)
          .order('recorded_at', { ascending: false }).limit(8),
        supabase.from('daily_checkins')
          .select('*').eq('client_id', clientId)
          .order('date', { ascending: false }).limit(7),
        supabase.from('sessions')
          .select('*').eq('client_id', clientId)
          .order('scheduled_at', { ascending: false }).limit(5),
      ]);

      return {
        profile:  profileRes.data,
        metrics:  metricsRes.data  ?? [],
        checkins: checkinsRes.data ?? [],
        sessions: sessionsRes.data ?? [],
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Today's sessions for coach
// ---------------------------------------------------------------------------
export function useTodaySessions() {
  const { user } = useAuth();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  return useQuery({
    queryKey: coachKeys.todaySessions(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          client:profiles!sessions_client_id_fkey(id, full_name, avatar_url)
        `)
        .eq('coach_id', user!.id)
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// All sessions for coach
// ---------------------------------------------------------------------------
export function useCoachSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachKeys.sessions(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          client:profiles!sessions_client_id_fkey(id, full_name, avatar_url)
        `)
        .eq('coach_id', user!.id)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Save session notes
// ---------------------------------------------------------------------------
export function useSaveSessionNotes() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sessionId,
      notes_pre,
      notes_post,
      status,
    }: {
      sessionId: string;
      notes_pre?: string;
      notes_post?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('sessions')
        .update({ notes_pre, notes_post, status })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: coachKeys.sessions(user.id) });
        qc.invalidateQueries({ queryKey: coachKeys.todaySessions(user.id) });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Messages for an enrollment
// ---------------------------------------------------------------------------
export function useMessages(enrollmentId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachKeys.messages(enrollmentId),
    enabled: !!enrollmentId,
    refetchInterval: 5000, // poll every 5s for new messages
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
        `)
        .eq('enrollment_id', enrollmentId)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Send message
// ---------------------------------------------------------------------------
export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      enrollmentId,
      receiverId,
      body,
    }: {
      enrollmentId: string;
      receiverId: string;
      body: string;
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          enrollment_id: enrollmentId,
          sender_id:     user!.id,
          receiver_id:   receiverId,
          body:          body.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: coachKeys.messages(vars.enrollmentId) });
    },
  });
}
