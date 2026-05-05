import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWorkoutPlan, getFocusEmoji } from '@/hooks/useWorkout';
import { THEME } from '@/constants/theme';

const SECTION_TYPE_LABEL: Record<string, string> = {
  warmup:   'Warmup',
  stretch:  'Stretching',
  main:     'Main Workout',
  cooldown: 'Cool Down',
};

export default function WorkoutPlanScreen() {
  const router = useRouter();
  const { data: plan, isLoading } = useWorkoutPlan();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={THEME.colors.teal} size="large" />
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }} edges={['top']}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🏋️</Text>
        <Text style={{ fontSize: 20, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
          No workout plan yet
        </Text>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
          Your coach will assign a customised workout plan for you soon.
        </Text>
      </SafeAreaView>
    );
  }

  const totalCompleted = plan.days.reduce((sum: number, d: any) => sum + (d.total_completions ?? 0), 0);
  const daysCompletedToday = plan.days.filter((d: any) => d.is_completed_today).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Your Workout Plan
          </Text>
          <Text style={{ fontSize: 26, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 4 }}>
            {plan.title}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 20 }}>
            {plan.goal}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginTop: 16, marginBottom: 24 }}>
          {[
            { label: 'Weeks', value: String(plan.duration_weeks), color: THEME.colors.teal },
            { label: 'Total done', value: String(totalCompleted), color: THEME.colors.amber },
            { label: 'Today', value: daysCompletedToday > 0 ? '✓ Done' : 'Pending', color: daysCompletedToday > 0 ? '#34D399' : THEME.colors.textMuted },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Day cards */}
        <View style={{ paddingHorizontal: 24, gap: 14 }}>
          {plan.days.map((day: any) => {
            const isDone = day.is_completed_today;
            const emoji  = getFocusEmoji(day.focus);

            return (
              <TouchableOpacity
                key={day.id}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/(client)/workout-detail', params: { dayId: day.id, dayTitle: day.title, dayColor: day.color } })}
                style={{
                  backgroundColor: THEME.colors.surface2,
                  borderRadius: 18,
                  overflow: 'hidden',
                  borderWidth: isDone ? 1.5 : 0.5,
                  borderColor: isDone ? '#34D399' : THEME.colors.border,
                }}
              >
                {/* Color accent bar */}
                <View style={{ height: 4, backgroundColor: day.color }} />

                <View style={{ padding: 18 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                    {/* Day number + emoji */}
                    <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: `${day.color}20`, borderWidth: 1, borderColor: `${day.color}30`, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{emoji}</Text>
                      <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sansMedium, color: day.color, marginTop: 2 }}>Day {day.day_number}</Text>
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, flex: 1 }}>
                          {day.title}
                        </Text>
                        {isDone && (
                          <View style={{ backgroundColor: '#34D39920', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 0.5, borderColor: '#34D39940' }}>
                            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: '#34D399' }}>✓ Done today</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 18, marginBottom: 10 }}>
                        {day.subtitle}
                      </Text>

                      {/* Meta row */}
                      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                          ⏱ {day.estimated_mins} min
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                          🏆 {day.total_completions ?? 0} completed
                        </Text>
                        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: day.color, textTransform: 'capitalize' }}>
                          {day.focus?.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Start button */}
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/(client)/workout-player', params: { dayId: day.id, dayTitle: day.title, dayColor: day.color } })}
                    style={{ marginTop: 14, backgroundColor: isDone ? `${day.color}20` : day.color, borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: isDone ? 1 : 0, borderColor: isDone ? `${day.color}40` : 'transparent' }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: isDone ? day.color : '#0A0A0B' }}>
                      {isDone ? '▶ Do Again' : '▶ Start Workout'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Plan description */}
        <View style={{ marginHorizontal: 24, marginTop: 24, backgroundColor: `${THEME.colors.teal}08`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.teal}20` }}>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            About this plan
          </Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 22 }}>
            {plan.description}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
