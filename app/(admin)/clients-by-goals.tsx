import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdminGoalsBreakdown } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

const GOAL_COLORS = [THEME.colors.teal, '#93C5FD', '#FCA5A5', THEME.colors.amber, '#C4B5FD', '#FDE68A', '#6EE7B7', '#34D399'];

export default function ClientsByGoalsScreen() {
  const router = useRouter();
  const { data, isLoading } = useAdminGoalsBreakdown();
  const breakdown = data?.breakdown ?? [];
  const maxCount = Math.max(1, ...breakdown.map((g) => g.count));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 26 }}>Clients by Goals</Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12.5, marginTop: 1 }}>Tap a goal to see its clients</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 18, lineHeight: 19 }}>
            How many clients have selected each health goal (`profiles.health_goals`), now that content is
            organized around client-selected goals rather than the 7 fixed programs. A client can select
            multiple goals, so counts don't sum to the total client count.
          </Text>

          <View style={{ gap: 12 }}>
            {breakdown.map((g, i) => (
              <TouchableOpacity
                key={g.name}
                onPress={() => router.push({ pathname: '/(admin)/goal-clients', params: { goal: g.name } })}
                activeOpacity={0.85}
                style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{g.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: GOAL_COLORS[i % GOAL_COLORS.length] }}>{g.count}</Text>
                    <Text style={{ color: THEME.colors.textMuted, fontSize: 16 }}>›</Text>
                  </View>
                </View>
                <View style={{ height: 6, backgroundColor: THEME.colors.surface3, borderRadius: 3, overflow: 'hidden', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  <View style={{ height: '100%', width: `${(g.count / maxCount) * 100}%`, backgroundColor: GOAL_COLORS[i % GOAL_COLORS.length], borderRadius: 3 }} />
                </View>
              </TouchableOpacity>
            ))}

            {breakdown.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>📚</Text>
                <Text style={{ fontSize: 16, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>No goal data yet</Text>
              </View>
            )}

            {(data?.noGoals ?? 0) > 0 && (
              <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>No goals selected yet</Text>
                  <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>{data?.noGoals}</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
