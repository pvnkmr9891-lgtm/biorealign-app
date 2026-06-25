import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useAdminRehabQueue, useRespondToRehabRequest,
  useAdminRehabCalendar, useMarkRehabAppointmentStatus,
} from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

const SUCCESS = '#34D399';

type QueueView = 'queue' | 'upcoming';

function getWeekRangeIso(weeksAhead: number) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setDate(end.getDate() + 7 * weeksAhead);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function groupByDay(appointments: any[]) {
  const groups: Record<string, any[]> = {};
  appointments.forEach((a) => {
    const dayKey = new Date(a.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(a);
  });
  return groups;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: THEME.colors.amber,
  completed: SUCCESS,
  cancelled: THEME.colors.textMuted,
  no_show: '#F87171',
};

export default function RehabQueueScreen() {
  const router = useRouter();
  const [view, setView] = useState<QueueView>('queue');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const { data: queue = [], isLoading: queueLoading } = useAdminRehabQueue();
  const { mutateAsync: respond, isPending: responding } = useRespondToRehabRequest();

  const { startDate, endDate } = getWeekRangeIso(4);
  const { data: appointments = [], isLoading: apptsLoading } = useAdminRehabCalendar({ startDate, endDate });
  const { mutateAsync: markStatus } = useMarkRehabAppointmentStatus();

  const onAccept = (req: any) => {
    const price = Number(priceDrafts[req.id]);
    if (!price || price <= 0) { Alert.alert('Enter a price', 'Please enter a quoted price before accepting.'); return; }
    respond({ requestId: req.id, clientId: req.client_id, action: 'accept', quotedPrice: price });
  };

  const onDecline = (req: any) => {
    Alert.alert('Decline request', 'Add an optional note for the client?', [
      { text: 'Decline without note', onPress: () => respond({ requestId: req.id, clientId: req.client_id, action: 'decline' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onMarkAppointment = (appointmentId: string, status: 'completed' | 'no_show' | 'cancelled') => {
    markStatus({ appointmentId, status });
  };

  const grouped = groupByDay(appointments);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 24 }}>Recovery Queue</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 24, marginBottom: 16 }}>
        {([['queue', `Pending (${queue.length})`], ['upcoming', 'Upcoming']] as const).map(([v, label]) => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: view === v ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: view === v ? THEME.colors.teal : THEME.colors.border }}
          >
            <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: view === v ? THEME.colors.background : THEME.colors.textSecondary }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        {view === 'queue' && (
          queueLoading ? <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} /> :
          queue.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🩹</Text>
              <Text style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>No pending requests</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {queue.map((req: any) => (
                <View key={req.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.amber}40` }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{req.client?.full_name ?? 'Unknown client'}</Text>
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                      {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber, marginBottom: 4 }}>{req.package?.label}</Text>
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 19, marginBottom: 10 }}>{req.issue_description}</Text>

                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Quote a price (₹)</Text>
                  <TextInput
                    value={priceDrafts[req.id] ?? ''}
                    onChangeText={(v) => setPriceDrafts((d) => ({ ...d, [req.id]: v.replace(/[^0-9]/g, '') }))}
                    placeholder="e.g. 6000"
                    placeholderTextColor={THEME.colors.textMuted}
                    keyboardType="numeric"
                    style={{ backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity onPress={() => onAccept(req)} disabled={responding} style={{ flex: 1, backgroundColor: THEME.colors.teal, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onDecline(req)} disabled={responding} style={{ flex: 1, backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                      <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )
        )}

        {view === 'upcoming' && (
          apptsLoading ? <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} /> :
          Object.keys(grouped).length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🗓️</Text>
              <Text style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>No sessions in the next 4 weeks</Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {Object.entries(grouped).map(([day, appts]) => (
                <View key={day}>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>{day}</Text>
                  <View style={{ gap: 8 }}>
                    {appts.map((a) => {
                      const color = STATUS_COLORS[a.status] ?? THEME.colors.textMuted;
                      const isPast = new Date(a.scheduled_at) < new Date();
                      return (
                        <View key={a.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                              <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{a.client?.full_name ?? 'Unknown'}</Text>
                              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                                {new Date(a.scheduled_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                              </Text>
                            </View>
                            <View style={{ backgroundColor: `${color}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color, textTransform: 'capitalize' }}>{a.status.replace('_', ' ')}</Text>
                            </View>
                          </View>
                          {isPast && a.status === 'scheduled' && (
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                              <TouchableOpacity onPress={() => onMarkAppointment(a.id, 'completed')} style={{ flex: 1, backgroundColor: `${SUCCESS}18`, borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                                <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: SUCCESS }}>Mark Completed</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => onMarkAppointment(a.id, 'no_show')} style={{ flex: 1, backgroundColor: '#F8717118', borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                                <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>No-show</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
