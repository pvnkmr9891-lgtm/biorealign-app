import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdminRehabAvailabilityWindows, useSetRehabAvailabilityWindowActive } from '@/hooks/useAdmin';
import { REHAB_SLOT_OPTIONS } from '@/constants/rehabSlots';
import { THEME } from '@/constants/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RehabAvailabilityScreen() {
  const router = useRouter();
  const { data: windows = [], isLoading } = useAdminRehabAvailabilityWindows();
  const { mutate: setActive, isPending } = useSetRehabAvailabilityWindowActive();

  const findWindow = (dayOfWeek: number, startTime: string) =>
    windows.find((w: any) => w.day_of_week === dayOfWeek && w.start_time === startTime);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 24 }}>Recovery Availability</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 18, lineHeight: 19 }}>
          These 6 daily time slots are the only bookable Recovery times for now. Tap a cell to turn
          that slot on or off for a given day — clients can only pick slots that are on.
        </Text>

        {isLoading ? (
          <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ gap: 14 }}>
            {DAYS.map((dayLabel, dayOfWeek) => (
              <View key={dayLabel} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 10 }}>{dayLabel}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {REHAB_SLOT_OPTIONS.map((slot) => {
                    const w = findWindow(dayOfWeek, slot.startTime);
                    const on = !!w?.active;
                    return (
                      <TouchableOpacity
                        key={slot.label}
                        disabled={!w || isPending}
                        onPress={() => w && setActive({ windowId: w.id, active: !w.active })}
                        style={{
                          paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10,
                          backgroundColor: on ? `${THEME.colors.amber}20` : THEME.colors.surface3,
                          borderWidth: 1, borderColor: on ? THEME.colors.amber : THEME.colors.border,
                        }}
                      >
                        <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: on ? THEME.colors.amber : THEME.colors.textMuted }}>
                          {on ? '✓ ' : ''}{slot.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
