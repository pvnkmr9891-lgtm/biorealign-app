import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------
export const coachKeys = {
  client:        (uid: string, clientId: string) => ['coach', uid, 'client', clientId] as const,
  sessions:      (uid: string) => ['coach', uid, 'sessions'] as const,
  todaySessions: (uid: string) => ['coach', uid, 'sessions', 'today'] as const,
  messages:      (coachId: string, clientId: string) => ['messages', coachId, clientId] as const,
  inbox:         (uid: string) => ['coach', uid, 'inbox'] as const,
  unreadCount:   (uid: string) => ['coach', uid, 'unread'] as const,
};

// ---------------------------------------------------------------------------
// Single client activity (scores, check-ins, sessions)
// ---------------------------------------------------------------------------
export function useClientDetail(clientId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: coachKeys.client(user?.id ?? '', clientId),
    enabled: !!clientId,
    queryFn: async () => {
      const [metricsRes, checkinsRes, sessionsRes] = await Promise.all([
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
      // Coach's assigned clients (Lite mode — via assigned_coach_id)
      const { data: clients, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('assigned_coach_id', user!.id);

      if (error) throw error;
      if (!clients?.length) return [];

      // Get last message + unread count per client
      const conversations = await Promise.all(
        clients.map(async (client: any) => {
          const [lastMsgRes, unreadRes] = await Promise.all([
            supabase
              .from('messages')
              .select('id, body, sent_at, sender_id, read_at')
              .eq('coach_id', user!.id)
              .eq('client_id', client.id)
              .order('sent_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('messages')
              .select('id, receiver_id, read_at')
              .eq('coach_id', user!.id)
              .eq('client_id', client.id)
              .eq('receiver_id', user!.id)
              .is('read_at', null),
          ]);

          return {
            clientId:    client.id,
            coachId:     user!.id,
            clientName:  client.full_name ?? 'Unknown',
            lastMessage: lastMsgRes.data ?? null,
            unreadCount: (unreadRes.data ?? []).length,
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
export function useMessages(coachId: string, clientId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Read inside the realtime callback via a ref rather than as an effect
  // dependency — user?.id is only used inside the callback closure, not by
  // the subscription itself, but including it in the deps array meant the
  // effect re-ran the moment auth hydrated after mount (undefined -> real
  // id), tearing down and recreating the channel before the previous
  // teardown finished. Supabase's realtime-js throws "cannot add
  // postgres_changes callbacks after subscribe()" when a new .on() lands on
  // a channel that's still mid-unsubscribe from the old effect run — this
  // hit on essentially every fresh open of Messages, not just as an edge case.
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  // Realtime subscription
  useEffect(() => {
    if (!coachId || !clientId) return;

    // Unique per effect-run, not just per conversation. React Navigation
    // can "reconnect" (not cleanly remount) a screen that was frozen while
    // off-focus, re-running this effect before the previous run's
    // removeChannel() (async) has actually finished unsubscribing on the
    // wire. Supabase's realtime client reuses/collides on a channel with a
    // topic string it still considers active, which is what threw "cannot
    // add postgres_changes callbacks after subscribe()" even after the
    // user?.id dependency fix. A genuinely unique topic per run sidesteps
    // the collision entirely regardless of what re-triggers the effect.
    const channelId = `messages:${coachId}:${clientId}:${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          // Invalidate on new message — triggers refetch
          qc.invalidateQueries({ queryKey: coachKeys.messages(coachId, clientId) });
          const uid = userIdRef.current;
          if (uid) {
            qc.invalidateQueries({ queryKey: coachKeys.inbox(uid) });
            qc.invalidateQueries({ queryKey: coachKeys.unreadCount(uid) });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coachId, clientId]);

  return useQuery({
    queryKey: coachKeys.messages(coachId, clientId),
    enabled: !!coachId && !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
        `)
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      // Sign attachment URLs (1h) so bubbles can render images directly.
      return Promise.all((data ?? []).map(async (m: any) => {
        if (!m.attachment_path) return m;
        const { data: signed } = await supabase.storage
          .from('chat-attachments')
          .createSignedUrl(m.attachment_path, 3600);
        return { ...m, attachmentUrl: signed?.signedUrl ?? null };
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Upload a chat photo — path starts with the uploader's id (storage RLS
// grants read to the other side of the assigned coach<->client pair).
// ---------------------------------------------------------------------------
export async function uploadChatAttachment(userId: string, uri: string): Promise<string> {
  const path = `${userId}/${Date.now()}.jpg`;
  const formData = new FormData();
  formData.append('file', { uri, name: 'chat.jpg', type: 'image/jpeg' } as any);

  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/chat-attachments/${path}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}`, 'x-upsert': 'true' },
      body: formData,
    }
  );
  if (!res.ok) throw new Error(`Attachment upload failed: ${await res.text()}`);
  return path;
}

// ---------------------------------------------------------------------------
// Mark messages as read
// ---------------------------------------------------------------------------
export function useMarkMessagesRead() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ coachId, clientId }: { coachId: string; clientId: string }) => {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('coach_id', coachId)
        .eq('client_id', clientId)
        .eq('receiver_id', user!.id)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: coachKeys.messages(vars.coachId, vars.clientId) });
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
      coachId, clientId, receiverId, body, attachmentPath,
    }: {
      coachId: string; clientId: string; receiverId: string; body: string; attachmentPath?: string;
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          coach_id:    coachId,
          client_id:   clientId,
          sender_id:   user!.id,
          receiver_id: receiverId,
          body:        body.trim(),
          attachment_path: attachmentPath ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: coachKeys.messages(vars.coachId, vars.clientId) });
      if (user?.id) {
        qc.invalidateQueries({ queryKey: coachKeys.inbox(user.id) });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Client: get their assigned coach for messaging
// ---------------------------------------------------------------------------
export function useClientCoachInfo() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client', user?.id ?? '', 'coach_info'],
    enabled: !!user?.id,
    // Overrides the global 1-min staleTime — this gates Messages/Fitness
    // Assessment visibility, and coach assignment happens from a coach or
    // admin's own session, which this client has no way to be pushed a
    // notification about. Always worth a fresh, cheap single-row check
    // rather than risk showing a stale "no coach" state.
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      // Two plain selects instead of one embedded-join select. PostgREST's
      // schema cache can go stale on the self-referencing FK relationship
      // (profiles.assigned_coach_id -> profiles.id) independently of any
      // app-side caching -- confirmed via direct REST calls returning
      // PGRST200 "Could not find a relationship between 'profiles' and
      // 'profiles' in the schema cache" even though the constraint exists
      // in the database. A `NOTIFY pgrst, 'reload schema'` should normally
      // fix that, but didn't take effect here, so this avoids depending on
      // PostgREST's relationship detection for this query at all.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('assigned_coach_id')
        .eq('id', user!.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.assigned_coach_id) return null;

      const { data: coach, error: coachError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', profile.assigned_coach_id)
        .maybeSingle();

      if (coachError) throw coachError;

      return { coachId: profile.assigned_coach_id, coach };
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
