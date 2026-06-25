import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface RehabPackage {
  id: string;
  key: 'one_time' | 'weekly' | 'three_x_week' | 'monthly';
  label: string;
  description: string | null;
  sessions_per_term: number;
  display_order: number;
  active: boolean;
}

export interface RehabRequest {
  id: string;
  client_id: string;
  issue_description: string;
  duration_text: string | null;
  package_id: string;
  package?: RehabPackage;
  linked_document_id: string | null;
  status: 'pending' | 'accepted' | 'declined';
  quoted_price: number | null;
  decline_reason: string | null;
  payment_status: 'pending' | 'paid';
  created_at: string;
  responded_at: string | null;
}

export interface RehabAvailabilityWindow {
  id: string;
  day_of_week: number; // 0 = Sunday
  start_time: string;  // 'HH:MM:SS'
  end_time: string;
  slot_minutes: number;
  active: boolean;
}

export interface RehabAppointment {
  id: string;
  rehab_request_id: string;
  client_id: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  recurrence_group_id: string;
}

export const rehabKeys = {
  packages:      ['rehab', 'packages'] as const,
  myRequests:    (clientId: string) => ['rehab', clientId, 'requests'] as const,
  windows:       ['rehab', 'windows'] as const,
  appointments:  (requestId: string) => ['rehab', 'appointments', requestId] as const,
};

// ── Packages (lookup table, not a hardcoded enum) ──────────────────────────
export function useRehabPackages() {
  return useQuery({
    queryKey: rehabKeys.packages,
    queryFn: async () => {
      const { data, error } = await supabase.from('rehab_packages').select('*').eq('active', true).order('display_order');
      if (error) throw error;
      return (data ?? []) as RehabPackage[];
    },
  });
}

// ── Client's own requests, most recent first ───────────────────────────────
export function useMyRehabRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: rehabKeys.myRequests(user?.id ?? ''),
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehab_requests')
        .select('*, package:rehab_packages(*)')
        .eq('client_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RehabRequest[];
    },
  });
}

export function useSubmitRehabRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { issueDescription: string; durationText: string; packageId: string; linkedDocumentId?: string | null }) => {
      const { data, error } = await supabase
        .from('rehab_requests')
        .insert({
          client_id: user!.id,
          issue_description: input.issueDescription,
          duration_text: input.durationText || null,
          package_id: input.packageId,
          linked_document_id: input.linkedDocumentId ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;

      // Fire-and-forget — a notify failure shouldn't fail the request submission.
      supabase.functions.invoke('rehab-request-notify', { body: { requestId: data.id } })
        .catch((e) => console.warn('[useSubmitRehabRequest] notify failed', e?.message));

      return data;
    },
    onSuccess: () => {
      if (user?.id) qc.invalidateQueries({ queryKey: rehabKeys.myRequests(user.id) });
    },
  });
}

// ── Availability windows (read-only for clients; admin manages them) ──────
export function useRehabAvailabilityWindows() {
  return useQuery({
    queryKey: rehabKeys.windows,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehab_availability_windows')
        .select('*')
        .eq('active', true)
        .order('day_of_week')
        .order('start_time');
      if (error) throw error;
      return (data ?? []) as RehabAvailabilityWindow[];
    },
  });
}

export function useRehabAppointments(requestId: string) {
  return useQuery({
    queryKey: rehabKeys.appointments(requestId),
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rehab_appointments')
        .select('*')
        .eq('rehab_request_id', requestId)
        .order('scheduled_at');
      if (error) throw error;
      return (data ?? []) as RehabAppointment[];
    },
  });
}

// Builds the full appointment list for a Step-4 confirmation, given the
// client's chosen slot(s) and the package's cadence.
// - one_time: the single chosen slot.
// - weekly: chosen slot repeated weekly, sessions_per_term times.
// - three_x_week: 3 chosen slots (one per weekday), each repeated weekly for sessions_per_term/3 weeks.
// - monthly: chosen slot repeated on the same calendar date each month, sessions_per_term times.
export function buildRecurringAppointments(packageKey: RehabPackage['key'], sessionsPerTerm: number, chosenSlots: Date[]): Date[] {
  if (packageKey === 'one_time') return [chosenSlots[0]];

  if (packageKey === 'weekly') {
    return Array.from({ length: sessionsPerTerm }, (_, i) => {
      const d = new Date(chosenSlots[0]);
      d.setDate(d.getDate() + i * 7);
      return d;
    });
  }

  if (packageKey === 'three_x_week') {
    const weeks = Math.ceil(sessionsPerTerm / chosenSlots.length);
    const out: Date[] = [];
    for (const slot of chosenSlots) {
      for (let i = 0; i < weeks; i++) {
        const d = new Date(slot);
        d.setDate(d.getDate() + i * 7);
        out.push(d);
      }
    }
    return out.sort((a, b) => a.getTime() - b.getTime());
  }

  // monthly
  return Array.from({ length: sessionsPerTerm }, (_, i) => {
    const d = new Date(chosenSlots[0]);
    d.setMonth(d.getMonth() + i);
    return d;
  });
}

export function useConfirmRehabSlots() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, packageKey, sessionsPerTerm, chosenSlots }: {
      requestId: string; packageKey: RehabPackage['key']; sessionsPerTerm: number; chosenSlots: Date[];
    }) => {
      const recurrenceGroupId = crypto.randomUUID();
      const appointments = buildRecurringAppointments(packageKey, sessionsPerTerm, chosenSlots);
      const { error } = await supabase.from('rehab_appointments').insert(
        appointments.map((d) => ({
          rehab_request_id: requestId,
          client_id: user!.id,
          scheduled_at: d.toISOString(),
          recurrence_group_id: recurrenceGroupId,
        }))
      );
      if (error) throw error;

      // In-app notification so it reflects for Eshwar immediately, not just
      // on his next query refresh, plus the same WhatsApp/email pattern used
      // for the original request.
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
      if (admins?.length) {
        await supabase.from('notifications').insert(
          admins.map((a) => ({
            user_id: a.id,
            title: 'Recovery session confirmed',
            body: `A client confirmed their session time(s). Reference: ${requestId}`,
            type: 'alert',
            action_url: '/(admin)/users',
          }))
        );
      }
      supabase.functions.invoke('rehab-slots-confirmed-notify', { body: { requestId } })
        .catch((e) => console.warn('[useConfirmRehabSlots] notify failed', e?.message));
    },
    onSuccess: (_d, { requestId }) => {
      qc.invalidateQueries({ queryKey: rehabKeys.appointments(requestId) });
    },
  });
}
