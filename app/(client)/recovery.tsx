import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useMyRehabRequests, useRehabAvailabilityWindows, useMyRehabAppointments,
  useConfirmRehabSlots, useConfirmCashPayment, useRehabBookedSlots,
  RehabRequest, RehabAppointment,
} from '@/hooks/useRehab';
import { REHAB_SLOT_OPTIONS } from '@/constants/rehabSlots';
import { THEME } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { shareRehabReceipt } from '@/lib/rehabReceipt';

const DAYS_AHEAD = 21;

function nextDates(count: number): Date[] {
  const out: Date[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    out.push(d);
  }
  return out;
}

// ── First-timer info screen ──────────────────────────────────────────────
function InfoScreen({ onRequest }: { onRequest: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
      <Text style={{ fontSize: 44, marginBottom: 16, marginTop: 8 }}>🩹</Text>
      <Text style={{ fontSize: 26, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 10 }}>
        In-Person Recovery with Eshwar
      </Text>
      <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 22, marginBottom: 20 }}>
        For specific injuries or long-standing issues, you can request a hands-on, in-person session
        directly with Eshwar, BioRealign's founder. Sessions combine corrective exercise, movement
        therapy, and biomechanical assessment — the same approach behind the Posture Recode Protocol —
        applied one-on-one to your case.
      </Text>

      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 6 }}>What to expect</Text>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 20 }}>
          • Sessions are conducted in person, not over video.{'\n'}
          • Pricing varies by case and is confirmed by Eshwar after reviewing your request — there's
          no fixed price upfront.{'\n'}
          • You can request a single session or a recurring package (weekly, monthly, or 3x/week
          for a month).
        </Text>
      </View>

      <TouchableOpacity
        onPress={onRequest}
        activeOpacity={0.85}
        style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
      >
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Request Treatment</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Section header ────────────────────────────────────────────────────────
function SectionHeader({ icon, title, right }: { icon: string; title: string; right?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 15 }}>{icon}</Text>
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{title}</Text>
      </View>
      {right && <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{right}</Text>}
    </View>
  );
}

// ── Active request card — pending / needs-payment / pick-slots, per request
function ActiveRequestCard({
  request, windows, windowsLoading,
}: {
  request: RehabRequest;
  windows: any[];
  windowsLoading: boolean;
}) {
  const { mutateAsync: confirmSlots, isPending } = useConfirmRehabSlots();
  const { mutateAsync: confirmCash, isPending: isConfirmingCash } = useConfirmCashPayment();

  const packageKey = request.package?.key;
  const sessionsPerTerm = request.package?.sessions_per_term ?? 1;
  const slotsNeeded = packageKey === 'three_x_week' ? 3 : 1;

  const dates = useMemo(() => nextDates(DAYS_AHEAD), []);
  const rangeStart = useMemo(() => dates[0]?.toISOString(), [dates]);
  const rangeEnd = useMemo(() => {
    const d = new Date(dates[dates.length - 1]);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [dates]);
  const { data: bookedTimes = new Set<number>() } = useRehabBookedSlots({ startDate: rangeStart, endDate: rangeEnd });
  const activeByDay = useMemo(() => windows.filter((w: any) => w.active).reduce((acc: Record<number, Set<string>>, w: any) => {
    (acc[w.day_of_week] ??= new Set()).add(w.start_time);
    return acc;
  }, {} as Record<number, Set<string>>), [windows]);

  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [chosen, setChosen] = useState<Date[]>([]);

  const slotsForSelectedDate = useMemo(() => {
    const dow = selectedDate.getDay();
    const activeStarts = activeByDay[dow] ?? new Set<string>();
    return REHAB_SLOT_OPTIONS.filter((s) => activeStarts.has(s.startTime)).map((s) => {
      const [h, m] = s.startTime.split(':').map(Number);
      const dt = new Date(selectedDate);
      dt.setHours(h, m, 0, 0);
      return { ...s, datetime: dt, isPast: dt <= new Date(), isBooked: bookedTimes.has(dt.getTime()) };
    }).filter((s) => !s.isBooked);
  }, [selectedDate, activeByDay, bookedTimes]);

  const toggleSlot = (slot: Date) => {
    setChosen((prev) => {
      const exists = prev.some((s) => s.getTime() === slot.getTime());
      if (exists) return prev.filter((s) => s.getTime() !== slot.getTime());
      if (prev.length >= slotsNeeded) return slotsNeeded === 1 ? [slot] : prev;
      return [...prev, slot];
    });
  };

  const onConfirm = async () => {
    if (chosen.length < slotsNeeded) {
      Alert.alert('Pick a time', slotsNeeded === 3 ? 'Please choose 3 weekly slots (one per day).' : 'Please choose a time slot.');
      return;
    }
    try {
      await confirmSlots({ requestId: request.id, packageKey: packageKey!, sessionsPerTerm, chosenSlots: chosen });
    } catch (e: any) {
      const takenByRace = e?.code === '23505' || /duplicate key/i.test(e?.message ?? '');
      Alert.alert(
        'Could not confirm',
        takenByRace ? 'One of those times was just booked by someone else. Please pick another.' : (e.message ?? 'Please try again.')
      );
      setChosen([]);
    }
  };

  const onConfirmCash = async () => {
    try {
      await confirmCash({ requestId: request.id });
    } catch (e: any) {
      Alert.alert('Could not confirm', e.message ?? 'Please try again.');
    }
  };

  const cardStyle = { backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 };

  // Pending — waiting on Eshwar
  if (request.status === 'pending') {
    return (
      <View style={cardStyle}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>⏳ Waiting for Eshwar</Text>
        <Text numberOfLines={2} style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginTop: 6 }}>
          {request.issue_description}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4 }}>
          {request.package?.label} · Requested {new Date(request.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
    );
  }

  // Accepted, unpaid — needs cash confirmation
  if (request.payment_status !== 'paid') {
    return (
      <View style={cardStyle}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Accepted ✓ — needs payment</Text>
        <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginTop: 4 }}>₹{request.quoted_price}</Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2, marginBottom: 14 }}>{request.package?.label}</Text>
        <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 19, marginBottom: 14 }}>
          Pay ₹{request.quoted_price} in cash at your session. Confirming below lets you pick your session time(s) now.
        </Text>
        <TouchableOpacity
          onPress={onConfirmCash}
          disabled={isConfirmingCash}
          activeOpacity={0.85}
          style={{ backgroundColor: THEME.colors.teal, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
        >
          {isConfirmingCash ? <ActivityIndicator color={THEME.colors.background} /> : (
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Payment in cash</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Accepted, paid, no slots picked yet
  return (
    <View style={cardStyle}>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Paid ✓ — pick your time</Text>
      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2, marginBottom: 4 }}>{request.package?.label}</Text>
      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 14 }}>
        {packageKey === 'one_time' && 'A single in-person session at this time.'}
        {packageKey === 'weekly' && `Repeats weekly for ${sessionsPerTerm} weeks.`}
        {packageKey === 'three_x_week' && `Each slot repeats weekly for ${Math.ceil(sessionsPerTerm / 3)} weeks — pick a different day for each.`}
        {packageKey === 'monthly' && `Repeats monthly for ${sessionsPerTerm} months.`}
      </Text>

      {windowsLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginVertical: 20 }} />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
            {dates.map((d) => {
              const hasAnySlot = (activeByDay[d.getDay()]?.size ?? 0) > 0;
              const isSelected = d.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  key={d.toISOString()}
                  disabled={!hasAnySlot}
                  onPress={() => setSelectedDate(d)}
                  style={{
                    width: 50, paddingVertical: 9, borderRadius: 11, alignItems: 'center',
                    backgroundColor: isSelected ? THEME.colors.teal : THEME.colors.surface3,
                    borderWidth: 0.5, borderColor: isSelected ? THEME.colors.teal : THEME.colors.border,
                    opacity: hasAnySlot ? 1 : 0.35,
                  }}
                >
                  <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: isSelected ? THEME.colors.background : THEME.colors.textMuted }}>
                    {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </Text>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: isSelected ? THEME.colors.background : THEME.colors.textPrimary, marginTop: 2 }}>
                    {d.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {slotsForSelectedDate.length === 0 ? (
            <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 16 }}>
              No slots open on this day.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {slotsForSelectedDate.map((s) => {
                const selected = chosen.some((c) => c.getTime() === s.datetime.getTime());
                const disabled = s.isPast;
                return (
                  <TouchableOpacity
                    key={s.label}
                    disabled={disabled}
                    onPress={() => toggleSlot(s.datetime)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
                      backgroundColor: selected ? `${THEME.colors.teal}18` : THEME.colors.surface3,
                      borderWidth: 1, borderColor: selected ? THEME.colors.teal : THEME.colors.border,
                      opacity: disabled ? 0.35 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.teal : THEME.colors.textPrimary }}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {chosen.length > 0 && (
            <View style={{ marginBottom: 16, gap: 6 }}>
              {chosen.sort((a, b) => a.getTime() - b.getTime()).map((c) => (
                <View key={c.toISOString()} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: `${THEME.colors.teal}10`, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }}>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
                    {c.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {c.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                  <TouchableOpacity onPress={() => toggleSlot(c)}><Text style={{ color: THEME.colors.teal, fontSize: 14 }}>×</Text></TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <TouchableOpacity
        onPress={onConfirm}
        disabled={isPending || chosen.length < slotsNeeded}
        activeOpacity={0.85}
        style={{ backgroundColor: THEME.colors.teal, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: chosen.length < slotsNeeded ? 0.5 : 1 }}
      >
        {isPending ? <ActivityIndicator color={THEME.colors.background} /> : (
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Confirm {slotsNeeded === 3 ? `Slots (${chosen.length}/3)` : 'Slot'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Upcoming Sessions — scheduled appointments across every request ──────
function UpcomingSessionsSection({ appointments, requests }: { appointments: RehabAppointment[]; requests: RehabRequest[] }) {
  const requestById = useMemo(() => new Map(requests.map((r) => [r.id, r])), [requests]);
  const upcoming = appointments.filter((a) => a.status === 'scheduled' && new Date(a.scheduled_at) > new Date());
  if (upcoming.length === 0) return null;

  return (
    <>
      <SectionHeader icon="📅" title="Upcoming Sessions" right={`${upcoming.length}`} />
      <View style={{ gap: 8 }}>
        {upcoming.map((a) => {
          const req = requestById.get(a.rehab_request_id);
          return (
            <View key={a.id} style={{ padding: 13, borderRadius: 12, backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                  {new Date(a.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(a.scheduled_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                </Text>
                {req?.package?.label && (
                  <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{req.package.label}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
}

// ── Treatment History — resolved requests + total spent ──────────────────
function TreatmentHistorySection({ requests, clientName }: { requests: RehabRequest[]; clientName: string }) {
  const [sharingId, setSharingId] = useState<string | null>(null);
  if (requests.length === 0) return null;

  const totalSpent = requests.reduce((sum, r) => sum + (r.payment_status === 'paid' ? (r.quoted_price ?? 0) : 0), 0);

  const onShareReceipt = async (r: RehabRequest) => {
    setSharingId(r.id);
    try {
      await shareRehabReceipt(r, clientName);
    } catch (e: any) {
      Alert.alert('Could not create receipt', e?.message ?? 'Please try again.');
    } finally {
      setSharingId(null);
    }
  };

  return (
    <>
      <SectionHeader icon="🧾" title="Treatment History" />
      {totalSpent > 0 && (
        <View style={{ backgroundColor: `${THEME.colors.teal}12`, borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}>
          <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Total spent</Text>
          <Text style={{ fontSize: 17, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>₹{totalSpent}</Text>
        </View>
      )}
      <View style={{ gap: 8 }}>
        {requests.map((r) => {
          const isPaid = r.payment_status === 'paid';
          const isDeclined = r.status === 'declined';
          return (
            <View key={r.id} style={{ padding: 14, borderRadius: 12, backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                    {r.package?.label ?? 'Request'}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                    {r.issue_description}
                  </Text>
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4 }}>
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {r.quoted_price != null && (
                    <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>₹{r.quoted_price}</Text>
                  )}
                  <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color: isDeclined ? '#F87171' : isPaid ? (THEME.colors.success ?? '#4CC986') : THEME.colors.amber, marginTop: 3 }}>
                    {isDeclined ? 'Declined' : isPaid ? 'Paid' : 'Pending'}
                  </Text>
                </View>
              </View>
              {isDeclined && r.decline_reason && (
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 8, lineHeight: 17, fontStyle: 'italic' }}>
                  "{r.decline_reason}"
                </Text>
              )}
              {isPaid && (
                <TouchableOpacity
                  onPress={() => onShareReceipt(r)}
                  disabled={sharingId === r.id}
                  activeOpacity={0.7}
                  style={{ marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  {sharingId === r.id
                    ? <ActivityIndicator size="small" color={THEME.colors.teal} />
                    : <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>⬇ Download receipt</Text>}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </>
  );
}

export default function RecoveryScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: requests = [], isLoading } = useMyRehabRequests();
  const { data: appointments = [] } = useMyRehabAppointments();
  const { data: windows = [], isLoading: windowsLoading } = useRehabAvailabilityWindows();

  const appointmentCountByRequest = useMemo(() => {
    const m = new Map<string, number>();
    appointments.forEach((a) => m.set(a.rehab_request_id, (m.get(a.rehab_request_id) ?? 0) + 1));
    return m;
  }, [appointments]);

  // "Active" = still needs the client's attention: pending review, needs
  // payment, or paid but hasn't picked session times yet. Everything else
  // (declined, or accepted+paid+booked) is history.
  const activeRequests = requests.filter((r) =>
    r.status === 'pending' ||
    (r.status === 'accepted' && (r.payment_status !== 'paid' || (appointmentCountByRequest.get(r.id) ?? 0) === 0))
  );
  const historyRequests = requests.filter((r) => !activeRequests.includes(r));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
          >
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Recovery</Text>
        </View>
        {requests.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(client)/recovery-request')}
            activeOpacity={0.85}
            style={{ backgroundColor: THEME.colors.teal, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 }}
          >
            <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>+ Book Another</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 60 }} />
      ) : requests.length === 0 ? (
        <InfoScreen onRequest={() => router.push('/(client)/recovery-request')} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {activeRequests.length > 0 && (
            <>
              <SectionHeader icon="🔔" title="Needs Your Attention" right={`${activeRequests.length}`} />
              {activeRequests.map((r) => (
                <ActiveRequestCard key={r.id} request={r} windows={windows} windowsLoading={windowsLoading} />
              ))}
            </>
          )}

          <UpcomingSessionsSection appointments={appointments} requests={requests} />
          <TreatmentHistorySection requests={historyRequests} clientName={profile?.full_name ?? 'Client'} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
