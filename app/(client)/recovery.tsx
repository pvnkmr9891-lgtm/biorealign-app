import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useMyRehabRequests, useRehabAvailabilityWindows, useRehabAppointments,
  useConfirmRehabSlots, useConfirmCashPayment, useRehabBookedSlots,
} from '@/hooks/useRehab';
import { REHAB_SLOT_OPTIONS } from '@/constants/rehabSlots';
import { THEME } from '@/constants/theme';
import { TAB_BAR_CLEARANCE } from '@/components/ui/SlidingTabBar';

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

// ── Step 1: info screen ──────────────────────────────────────────────────
function InfoScreen({ onRequest }: { onRequest: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: TAB_BAR_CLEARANCE }}>
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

// ── Pending: waiting on Eshwar — shows a locked preview of what unlocks ──
function PendingScreen() {
  const previewDates = useMemo(() => nextDates(7), []);
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: TAB_BAR_CLEARANCE }}>
      <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 20 }}>
        <Text style={{ fontSize: 44, marginBottom: 16 }}>📨</Text>
        <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
          Your request has been sent
        </Text>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
          Eshwar will review and confirm pricing and availability shortly.
        </Text>
      </View>

      {/* Locked preview — the real calendar/slot picker unlocks once accepted */}
      <View style={{ opacity: 0.45 }} pointerEvents="none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
          {previewDates.map((d) => (
            <View key={d.toISOString()} style={{ width: 52, paddingVertical: 10, borderRadius: 12, backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</Text>
              <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginTop: 2 }}>{d.getDate()}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {REHAB_SLOT_OPTIONS.map((s) => (
            <View key={s.label} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ alignItems: 'center', marginTop: 16 }}>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>🔒 Unlocks once Eshwar sends a price quote</Text>
      </View>
    </ScrollView>
  );
}

// ── Declined ──────────────────────────────────────────────────────────────
function DeclinedScreen({ reason, onNewRequest }: { reason: string | null; onNewRequest: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <Text style={{ fontSize: 44, marginBottom: 16 }}>🙁</Text>
      <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
        Your request wasn't accepted this time
      </Text>
      {reason && (
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
          {reason}
        </Text>
      )}
      <TouchableOpacity
        onPress={onNewRequest}
        style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, borderWidth: 0.5, borderColor: THEME.colors.border }}
      >
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>Submit a new request</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Accepted, no slots picked yet: price + date-strip + fixed slot chips ──
function SlotPickerScreen({ request }: { request: any }) {
  const { data: windows = [], isLoading: windowsLoading } = useRehabAvailabilityWindows();
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
  // Global across all clients — a slot Eshwar is already booked for at that
  // time shouldn't be bookable or even visible to anyone else.
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
    }).filter((s) => !s.isBooked); // already taken by another client — not just disabled, fully hidden
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
      await confirmSlots({ requestId: request.id, packageKey, sessionsPerTerm, chosenSlots: chosen });
    } catch (e: any) {
      // Unique-index violation: someone else booked one of these times in
      // the moment between this screen loading and Confirm being pressed.
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

  const isPaid = request.payment_status === 'paid';

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: TAB_BAR_CLEARANCE }}>
      <View style={{ backgroundColor: `${THEME.colors.teal}15`, borderRadius: 14, padding: 16, marginBottom: 18, borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Request accepted ✓</Text>
        <Text style={{ fontSize: 22, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginTop: 4 }}>₹{request.quoted_price}</Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{request.package?.label}</Text>
      </View>

      {!isPaid ? (
        <View>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 6 }}>
            Confirm to unlock booking
          </Text>
          <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 19, marginBottom: 18 }}>
            Pay ₹{request.quoted_price} in cash at your session. Confirming below lets you pick your session time(s) now.
          </Text>

          {/* Locked preview of the booking section, same treatment as the pending state */}
          <View style={{ opacity: 0.4 }} pointerEvents="none">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {REHAB_SLOT_OPTIONS.map((s) => (
                <View key={s.label} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            onPress={onConfirmCash}
            disabled={isConfirmingCash}
            activeOpacity={0.85}
            style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            {isConfirmingCash ? <ActivityIndicator color={THEME.colors.background} /> : (
              <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Payment in cash</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
      <>
      <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 4 }}>
        {slotsNeeded === 3 ? 'Pick 3 weekly time slots' : 'Pick a time slot'}
      </Text>
      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 14 }}>
        {packageKey === 'one_time' && 'A single in-person session at this time.'}
        {packageKey === 'weekly' && `Repeats weekly for ${sessionsPerTerm} weeks.`}
        {packageKey === 'three_x_week' && `Each slot repeats weekly for ${Math.ceil(sessionsPerTerm / 3)} weeks — pick a different day for each.`}
        {packageKey === 'monthly' && `Repeats monthly for ${sessionsPerTerm} months.`}
      </Text>

      {windowsLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 20 }} />
      ) : (
        <>
          {/* Date strip */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
            {dates.map((d) => {
              const hasAnySlot = (activeByDay[d.getDay()]?.size ?? 0) > 0;
              const isSelected = d.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  key={d.toISOString()}
                  disabled={!hasAnySlot}
                  onPress={() => setSelectedDate(d)}
                  style={{
                    width: 52, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                    backgroundColor: isSelected ? THEME.colors.teal : THEME.colors.surface2,
                    borderWidth: 0.5, borderColor: isSelected ? THEME.colors.teal : THEME.colors.border,
                    opacity: hasAnySlot ? 1 : 0.35,
                  }}
                >
                  <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: isSelected ? THEME.colors.background : THEME.colors.textMuted }}>
                    {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </Text>
                  <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: isSelected ? THEME.colors.background : THEME.colors.textPrimary, marginTop: 2 }}>
                    {d.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Slot chips for the selected date */}
          {slotsForSelectedDate.length === 0 ? (
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 20 }}>
              No slots open on this day.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {slotsForSelectedDate.map((s) => {
                const selected = chosen.some((c) => c.getTime() === s.datetime.getTime());
                const disabled = s.isPast;
                return (
                  <TouchableOpacity
                    key={s.label}
                    disabled={disabled}
                    onPress={() => toggleSlot(s.datetime)}
                    style={{
                      paddingHorizontal: 13, paddingVertical: 11, borderRadius: 11,
                      backgroundColor: selected ? `${THEME.colors.teal}18` : THEME.colors.surface2,
                      borderWidth: 1, borderColor: selected ? THEME.colors.teal : THEME.colors.border,
                      opacity: disabled ? 0.35 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: selected ? THEME.colors.teal : THEME.colors.textPrimary }}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {chosen.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>SELECTED</Text>
              <View style={{ gap: 6 }}>
                {chosen.sort((a, b) => a.getTime() - b.getTime()).map((c) => (
                  <View key={c.toISOString()} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: `${THEME.colors.teal}10`, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }}>
                    <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
                      {c.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} · {c.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                    <TouchableOpacity onPress={() => toggleSlot(c)}><Text style={{ color: THEME.colors.teal, fontSize: 14 }}>×</Text></TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      <TouchableOpacity
        onPress={onConfirm}
        disabled={isPending || chosen.length < slotsNeeded}
        activeOpacity={0.85}
        style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 16, alignItems: 'center', opacity: chosen.length < slotsNeeded ? 0.5 : 1 }}
      >
        {isPending ? <ActivityIndicator color={THEME.colors.background} /> : (
          <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Confirm {slotsNeeded === 3 ? `Slots (${chosen.length}/3)` : 'Slot'}</Text>
        )}
      </TouchableOpacity>
      </>
      )}
    </ScrollView>
  );
}

// ── Accepted, slots already confirmed: show booked appointments ─────────
function BookedScreen({ request, appointments }: { request: any; appointments: any[] }) {
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: TAB_BAR_CLEARANCE }}>
      <View style={{ backgroundColor: `${THEME.colors.teal}15`, borderRadius: 14, padding: 16, marginBottom: 18, borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Booked ✓</Text>
        <Text style={{ fontSize: 22, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginTop: 4 }}>₹{request.quoted_price}</Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{request.package?.label}</Text>
      </View>

      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 10 }}>
        UPCOMING SESSIONS ({appointments.length})
      </Text>
      <View style={{ gap: 8 }}>
        {appointments.map((a) => (
          <View key={a.id} style={{ padding: 13, borderRadius: 12, backgroundColor: THEME.colors.surface2, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
              {new Date(a.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(a.scheduled_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: a.status === 'completed' ? THEME.colors.success ?? '#4CC986' : a.status === 'cancelled' ? '#F87171' : THEME.colors.textMuted, textTransform: 'capitalize' }}>
              {a.status}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function RecoveryScreen() {
  const router = useRouter();
  const { data: requests = [], isLoading } = useMyRehabRequests();
  const latest = requests[0];
  const { data: appointments = [], isLoading: appointmentsLoading } = useRehabAppointments(latest?.id ?? '');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Recovery</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 60 }} />
      ) : !latest || latest.status === 'declined' ? (
        latest?.status === 'declined'
          ? <DeclinedScreen reason={latest.decline_reason} onNewRequest={() => router.push('/(client)/recovery-request')} />
          : <InfoScreen onRequest={() => router.push('/(client)/recovery-request')} />
      ) : latest.status === 'pending' ? (
        <PendingScreen />
      ) : appointmentsLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 60 }} />
      ) : appointments.length === 0 ? (
        <SlotPickerScreen request={latest} />
      ) : (
        <BookedScreen request={latest} appointments={appointments} />
      )}
    </SafeAreaView>
  );
}
