import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCoachDirectory, useMyCoachStatus } from '@/hooks/useCoachDirectory';
import { THEME } from '@/constants/theme';
import { TAB_BAR_CLEARANCE } from '@/components/ui/SlidingTabBar';

export default function CoachListScreen() {
  const router = useRouter();
  const { data: coaches = [], isLoading } = useCoachDirectory();
  const { data: status } = useMyCoachStatus();

  return (
    <SafeAreaView testID="coach-list-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 26, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Need a Coach?</Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
            Pick a coach to guide your plan
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : coaches.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🧑‍🏫</Text>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center' }}>
            No coaches available right now
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: TAB_BAR_CLEARANCE, gap: 14 }} showsVerticalScrollIndicator={false}>
          {coaches.map((coach) => {
            const isAssigned = status?.state === 'assigned' && status.coachId === coach.id;
            const isPending  = status?.state === 'pending'  && status.request.coach_id === coach.id;

            return (
            <TouchableOpacity
              key={coach.id}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(client)/coach-detail', params: { coachId: coach.id } })}
              style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, borderWidth: isAssigned ? 1 : 0.5, borderColor: isAssigned ? `${THEME.colors.success ?? '#4CC986'}50` : THEME.colors.border }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: `${THEME.colors.teal}20`, borderWidth: 1, borderColor: `${THEME.colors.teal}30`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.teal }}>
                    {coach.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                    {coach.full_name}
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                    {coach.years_experience ?? '—'} yrs experience · {coach.clients_served} client{coach.clients_served === 1 ? '' : 's'} served
                  </Text>
                </View>
                {isAssigned ? (
                  <View style={{ backgroundColor: `${THEME.colors.success ?? '#4CC986'}20`, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.success ?? '#4CC986' }}>Assigned to you</Text>
                  </View>
                ) : isPending ? (
                  <View style={{ backgroundColor: `${THEME.colors.amber}20`, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>Pending</Text>
                  </View>
                ) : (
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 18 }}>›</Text>
                )}
              </View>

              {!!coach.specialties?.length && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {coach.specialties.map((s) => (
                    <View key={s} style={{ backgroundColor: `${THEME.colors.amber}15`, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
