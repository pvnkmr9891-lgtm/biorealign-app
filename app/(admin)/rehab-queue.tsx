import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  useAdminRehabQueue, useRespondToRehabRequest,
  useAdminRehabCalendar, useMarkRehabAppointmentStatus,
  useAdminRehabAvailabilityWindows, useSetRehabAvailabilityWindowActive,
} from '@/hooks/useAdmin';
import { REHAB_SLOT_OPTIONS } from '@/constants/rehabSlots';
import { THEME } from '@/constants/theme';

const SUCCESS = '#34D399';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type QueueView = 'queue' | 'upcoming' | 'availability';

// Sunday-start week containing `today + weekOffset*7 days`, as a [start, end) range.
function getWeekRange(weekOffset: number) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - start.getDay() + weekOffset * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(0, 0, 0, -1); // 23:59:59.999 of the 6th day
  return { start, end };
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // toDateString()
  const [availWeekOffset, setAvailWeekOffset] = useState(0);

  const { data: queue = [], isLoading: queueLoading, refetch: refetchQueue } = useAdminRehabQueue();
  const { mutateAsync: respond, isPending: responding } = useRespondToRehabRequest();

  const { start: weekStart, end: weekEnd } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const { data: appointments = [], isLoading: apptsLoading, refetch: refetchCalendar } = useAdminRehabCalendar({
    startDate: weekStart.toISOString(), endDate: weekEnd.toISOString(),
  });
  const { mutateAsync: markStatus } = useMarkRehabAppointmentStatus();

  const { data: windows = [], isLoading: windowsLoading, refetch: refetchWindows } = useAdminRehabAvailabilityWindows();
  const { mutate: setActive, isPending: settingActive } = useSetRehabAvailabilityWindowActive();
  const findWindow = (dayOfWeek: number, startTime: string) =>
    windows.find((w: any) => w.day_of_week === dayOfWeek && w.start_time === startTime);

  const { start: availWeekStart, end: availWeekEnd } = useMemo(() => getWeekRange(availWeekOffset), [availWeekOffset]);
  const { data: availAppointments = [], isLoading: availApptsLoading, refetch: refetchAvailAppts } = useAdminRehabCalendar({
    startDate: availWeekStart.toISOString(), endDate: availWeekEnd.toISOString(),
  });
  const availWeekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(availWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [availWeekStart]);
  // A slot is "booked" for a specific date if there's a scheduled appointment
  // at that exact date+time — distinct from the window being merely active,
  // which is just the recurring weekly template.
  // Compare by timestamp, not raw string — Postgres' timestamptz round-trips
  // through PostgREST differently formatted than JS's toISOString().
  const bookedDateTimes = useMemo(
    () => new Set(availAppointments.filter((a: any) => a.status === 'scheduled').map((a: any) => new Date(a.scheduled_at).getTime())),
    [availAppointments]
  );

  // Refetch when this screen comes into focus — the appointment list is
  // updated by clients on their own devices, so a stale React Query cache
  // would otherwise sit there until something else triggers a refetch.
  useFocusEffect(
    useCallback(() => {
      refetchQueue();
      refetchCalendar();
      refetchWindows();
      refetchAvailAppts();
    }, [refetchQueue, refetchCalendar, refetchWindows, refetchAvailAppts])
  );

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const countsByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach((a: any) => {
      const key = new Date(a.scheduled_at).toDateString();
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [appointments]);

  const visibleAppointments = useMemo(
    () => selectedDay ? appointments.filter((a: any) => new Date(a.scheduled_at).toDateString() === selectedDay) : appointments,
    [appointments, selectedDay]
  );

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

  const grouped = groupByDay(visibleAppointments);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 24 }}>Recovery</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 24, marginBottom: 16 }}>
        {([['queue', `Pending (${queue.length})`], ['upcoming', 'Upcoming'], ['availability', 'Availability']] as const).map(([v, label]) => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: view === v ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: view === v ? THEME.colors.teal : THEME.colors.border }}
          >
            <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: view === v ? THEME.colors.background : THEME.colors.textSecondary }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { refetchQueue(); refetchCalendar(); }}
            tintColor={THEME.colors.teal}
          />
        }
      >
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
          <View>
            {/* Weekly calendar widget */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <TouchableOpacity onPress={() => { setWeekOffset((w) => w - 1); setSelectedDay(null); }} style={{ padding: 6 }}>
                <Text style={{ fontSize: 18, color: THEME.colors.textSecondary }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                {weekOffset === 0 ? 'This week' : weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' – ' + weekEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
              <TouchableOpacity onPress={() => { setWeekOffset((w) => w + 1); setSelectedDay(null); }} style={{ padding: 6 }}>
                <Text style={{ fontSize: 18, color: THEME.colors.textSecondary }}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 18 }}>
              {weekDays.map((d) => {
                const key = d.toDateString();
                const count = countsByDay[key] ?? 0;
                const isSelected = selectedDay === key;
                const isToday = key === new Date().toDateString();
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setSelectedDay(isSelected ? null : key)}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                      backgroundColor: isSelected ? THEME.colors.teal : THEME.colors.surface2,
                      borderWidth: isToday && !isSelected ? 1 : 0.5,
                      borderColor: isSelected ? THEME.colors.teal : isToday ? THEME.colors.amber : THEME.colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: isSelected ? THEME.colors.background : THEME.colors.textMuted }}>
                      {DAYS[d.getDay()]}
                    </Text>
                    <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: isSelected ? THEME.colors.background : THEME.colors.textPrimary, marginTop: 2 }}>
                      {d.getDate()}
                    </Text>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, marginTop: 4, backgroundColor: count > 0 ? (isSelected ? THEME.colors.background : THEME.colors.amber) : 'transparent' }} />
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedDay && (
              <TouchableOpacity onPress={() => setSelectedDay(null)} style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Show full week ×</Text>
              </TouchableOpacity>
            )}

            {apptsLoading ? <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 20 }} /> :
            Object.keys(grouped).length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🗓️</Text>
              <Text style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>No sessions {selectedDay ? 'on this day' : 'this week'}</Text>
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
                              <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color, textTransform: 'capitalize' }}>
                                {a.status === 'scheduled' ? '✓ Booked by client' : a.status.replace('_', ' ')}
                              </Text>
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
          )}
          </View>
        )}

        {view === 'availability' && (
          <View>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 14, lineHeight: 19 }}>
              These 6 daily time slots are the only bookable Recovery times. Tap a slot to turn it on or
              off for that weekday going forward — a slot already booked by a client on a specific date
              shows as Booked and can't be toggled here.
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <TouchableOpacity onPress={() => setAvailWeekOffset((w) => w - 1)} style={{ padding: 6 }}>
                <Text style={{ fontSize: 18, color: THEME.colors.textSecondary }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                {availWeekOffset === 0 ? 'This week' : availWeekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' – ' + availWeekEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
              <TouchableOpacity onPress={() => setAvailWeekOffset((w) => w + 1)} style={{ padding: 6 }}>
                <Text style={{ fontSize: 18, color: THEME.colors.textSecondary }}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16, marginTop: 10 }}>
              {[['Available', THEME.colors.teal], ['Off', THEME.colors.textMuted], ['Booked', '#F87171']].map(([label, color]) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color as string }} />
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{label}</Text>
                </View>
              ))}
            </View>

            {windowsLoading || availApptsLoading ? (
              <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
            ) : (
              <View style={{ gap: 14 }}>
                {availWeekDays.map((d) => {
                  const dayOfWeek = d.getDay();
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <View key={d.toISOString()} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: isToday ? THEME.colors.amber : THEME.colors.border }}>
                      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 10 }}>
                        {DAYS[dayOfWeek]} {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{isToday ? ' · Today' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {REHAB_SLOT_OPTIONS.map((slot) => {
                          const w = findWindow(dayOfWeek, slot.startTime);
                          const isOn = !!w?.active;
                          const [h, m] = slot.startTime.split(':').map(Number);
                          const slotDateTime = new Date(d);
                          slotDateTime.setHours(h, m, 0, 0);
                          const isBooked = isOn && bookedDateTimes.has(slotDateTime.getTime());
                          const color = isBooked ? '#F87171' : isOn ? THEME.colors.teal : THEME.colors.textMuted;
                          return (
                            <TouchableOpacity
                              key={slot.label}
                              disabled={!w || settingActive || isBooked}
                              onPress={() => w && setActive({ windowId: w.id, active: !w.active })}
                              style={{
                                paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10,
                                backgroundColor: `${color}18`,
                                borderWidth: 1, borderColor: color,
                              }}
                            >
                              <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color }}>
                                {isBooked ? '● ' : isOn ? '✓ ' : ''}{slot.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
