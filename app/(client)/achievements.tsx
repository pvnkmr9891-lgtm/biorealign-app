import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAchievements, Achievement } from '@/hooks/useAchievements';
import { THEME } from '@/constants/theme';

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const KIND_LABEL: Record<Achievement['kind'], string> = {
  streak: 'Streak',
  tier: 'Tier',
  perfect_week: 'Perfect Week',
};

export default function AchievementsScreen() {
  const router = useRouter();
  const { data: achievements = [], isLoading } = useAchievements();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 28 }}>Your Milestones</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={THEME.colors.teal} />
        </View>
      ) : achievements.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🏆</Text>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
            No milestones yet
          </Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
            Streak milestones, tier-ups, and perfect weeks will show up here as you earn them.
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginBottom: 12 }}>
            {achievements.length} earned
          </Text>
          <View style={{ gap: 10 }}>
            {achievements.map((a) => (
              <View
                key={a.id}
                style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${THEME.colors.amber}18`, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: `${THEME.colors.amber}30` }}>
                  <Text style={{ fontSize: 20 }}>{a.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>{a.label}</Text>
                  <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11.5, marginTop: 2 }}>
                    {KIND_LABEL[a.kind]} · {formatDate(a.achieved_on)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
