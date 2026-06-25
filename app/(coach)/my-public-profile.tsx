import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCoachProfile } from '@/hooks/useCoachDirectory';
import { CoachProfileView } from '@/components/coach/CoachProfileView';
import { THEME } from '@/constants/theme';

// Lets a coach preview their own resume exactly as a client sees it on
// (client)/coach-detail — kept in the (coach) route group since the global
// auth guard bounces coaches out of the (client) group.
export default function MyPublicProfileScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: coach, isLoading } = useCoachProfile(profile?.id ?? '');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 20 }}>My Public Profile</Text>
      </View>

      {isLoading || !coach ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <CoachProfileView coach={coach} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
