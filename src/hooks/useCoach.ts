import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
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
  inbox:         (uid: string) => ['coach', uid, 'inbox'] as const,
  unreadCount:   (uid: string) => ['coach', uid, 'unread'] as const,
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
// Single client detail
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
// Today's sessions
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
// All sessions
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
      sessionId, notes_pre, notes_post, status,
    }: {
      sessionId: string; notes_pre?: string; notes_post?: string; status?: string;
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
// Coach inbox — last message per conversation
// ---------------------------------------------------------------------------
export function useCoachInbox() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachKeys.inbox(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      // Get all enrollments for this coach with client info
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          client_id,
          client:profiles!enrollments_client_id_fkey(id, full_name, avatar_url)
        `)
        .eq('coach_id', user!.id)
        .eq('status', 'active');

      if (error) throw error;
      if (!enrollments?.length) return [];

      // Get last message + unread count per enrollment
      const conversations = await Promise.all(
        enrollments.map(async (enroll: any) => {
      const [lastMsgRes, unreadRes] = await Promise.all([
  supabase
    .from('messages')
    .select('id, body, sent_at, sender_id, read_at')
    .eq('enrollment_id', enroll.id)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle(),
  supabase
    .from('messages')
    .select('id, receiver_id, read_at')
    .eq('enrollment_id', enroll.id)
    .is('read_at', null),
]);

// Count only messages where THIS coach is the receiver
const unreadCount = (unreadRes.data ?? [])
  .filter((m: any) => m.receiver_id === user!.id).length;

console.log('[Inbox]', enroll.client?.full_name, 'unread:', unreadCount, 'raw data:', unreadRes.data);

return {
  enrollmentId: enroll.id,
  clientId:     enroll.client_id,
  clientName:   enroll.client?.full_name ?? 'Unknown',
  lastMessage:  lastMsgRes.data ?? null,
  unreadCount,
};
        })
      );

      // Sort by most recent message
      return conversations.sort((a, b) => {
        const aTime = a.lastMessage?.sent_at ?? '';
        const bTime = b.lastMessage?.sent_at ?? '';
        return bTime.localeCompare(aTime);
      });
    },
    refetchInterval: 10000, // refresh inbox every 10s
  });
}

// ---------------------------------------------------------------------------
// Total unread count for coach (for badge)
// ---------------------------------------------------------------------------
export function useCoachUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachKeys.unreadCount(user?.id ?? ''),
    enabled: !!user?.id,
   queryFn: async () => {
  const { data } = await supabase
    .from('messages')
    .select('id')
    .eq('receiver_id', user!.id)
    .is('read_at', null);
  return data?.length ?? 0;
},
    refetchInterval: 10000,
  });
}

// ---------------------------------------------------------------------------
// Messages with Realtime subscription
// ---------------------------------------------------------------------------
export function useMessages(enrollmentId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!enrollmentId) return;

    const channel = supabase
      .channel(`messages:${enrollmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `enrollment_id=eq.${enrollmentId}`,
        },
        () => {
          // Invalidate on new message — triggers refetch
          qc.invalidateQueries({ queryKey: coachKeys.messages(enrollmentId) });
          if (user?.id) {
            qc.invalidateQueries({ queryKey: coachKeys.inbox(user.id) });
            qc.invalidateQueries({ queryKey: coachKeys.unreadCount(user.id) });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enrollmentId, user?.id]);

  return useQuery({
    queryKey: coachKeys.messages(enrollmentId),
    enabled: !!enrollmentId,
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
// Mark messages as read
// ---------------------------------------------------------------------------
export function useMarkMessagesRead() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('enrollment_id', enrollmentId)
        .eq('receiver_id', user!.id)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: (_, enrollmentId) => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: coachKeys.messages(enrollmentId) });
        qc.invalidateQueries({ queryKey: coachKeys.inbox(user.id) });
        qc.invalidateQueries({ queryKey: coachKeys.unreadCount(user.id) });
      }
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
      enrollmentId, receiverId, body,
    }: {
      enrollmentId: string; receiverId: string; body: string;
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
      if (user?.id) {
        qc.invalidateQueries({ queryKey: coachKeys.inbox(user.id) });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Client: get their coach + enrollment for messaging
// ---------------------------------------------------------------------------
export function useClientCoachInfo() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client', user?.id ?? '', 'coach_info'],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get active enrollment with coach info
      const { data: enrollment, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          coach_id,
          coach:profiles!enrollments_coach_id_fkey(id, full_name, avatar_url)
        `)
        .eq('client_id', user!.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return enrollment;
    },
  });
}

// ---------------------------------------------------------------------------
// Client: unread message count
// ---------------------------------------------------------------------------
export function useClientUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client', user?.id ?? '', 'unread'],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user!.id)
        .is('read_at', null);

      return count ?? 0;
    },
    refetchInterval: 10000,
  });
}
