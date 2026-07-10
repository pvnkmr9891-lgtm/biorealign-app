import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useClientCoachInfo } from '@/hooks/useCoach';
import { THEME } from '@/constants/theme';

export default function MyCoachScreen() {
  const router = useRouter();
  const { data: coachInfo, isLoading } = useClientCoachInfo();
  const coach = (coachInfo as any)?.coach;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>My Coach</Text>
      </View>

      {!isLoading && !coach ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🧑‍🏫</Text>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
            No coach assigned yet
          </Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            Once a coach is assigned to you, their details and a way to message them will show up here.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(client)/coach-list')}
            activeOpacity={0.85}
            style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 }}
          >
            <Text style={{ color: '#000', fontSize: 14, fontFamily: THEME.fonts.sansMedium }}>Browse coaches</Text>
          </TouchableOpacity>
        </View>
      ) : coach ? (
        <View style={{ paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 18, padding: 22, borderWidth: 1, borderColor: `${THEME.colors.success ?? '#4CC986'}40`, alignItems: 'center' }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: `${THEME.colors.teal}20`, borderWidth: 1, borderColor: `${THEME.colors.teal}35`, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 26, fontFamily: THEME.fonts.serif, color: THEME.colors.teal }}>
                {coach.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
              </Text>
            </View>
            <Text style={{ fontSize: 19, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
              {coach.full_name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${THEME.colors.success ?? '#4CC986'}18`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: THEME.colors.success ?? '#4CC986' }} />
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.success ?? '#4CC986' }}>Assigned to you</Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(client)/messages')}
              activeOpacity={0.85}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 14, alignSelf: 'stretch', marginTop: 20 }}
            >
              <Text style={{ fontSize: 16 }}>💬</Text>
              <Text style={{ color: '#000', fontSize: 14, fontFamily: THEME.fonts.sansMedium }}>Message {coach.full_name?.split(' ')[0]}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
