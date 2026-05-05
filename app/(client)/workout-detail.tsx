import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useWorkoutDay, getSectionEmoji, getFocusEmoji } from '@/hooks/useWorkout';
import { THEME } from '@/constants/theme';

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { dayId, dayTitle, dayColor } = useLocalSearchParams<{
    dayId: string; dayTitle: string; dayColor: string;
  }>();

  const { data: day, isLoading } = useWorkoutDay(dayId);
  const color = dayColor ?? THEME.colors.teal;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={color} size="large" />
      </SafeAreaView>
    );
  }

  if (!day) return null;

  const totalExercises = (day.sections ?? []).reduce((sum, s) => sum + (s.exercises?.length ?? 0), 0);

  // Detect jog+walk interval warmup section
  const isIntervalSection = (section: any) =>
    section.type === 'warmup' &&
    section.exercises?.some((ex: any) =>
      ex.name?.toLowerCase().includes('jog') || ex.name?.toLowerCase().includes('walk')
    );

  const startSection = (sectionIndex: number) => {
    const section = day.sections?.[sectionIndex];
    // Route warmup jog/walk to visual interval screen
    if (section && isIntervalSection(section)) {
      router.push({ pathname: '/(client)/workout-interval' });
      return;
    }
    router.push({
      pathname: '/(client)/workout-player',
      params: { dayId, dayTitle, dayColor, startSectionIndex: String(sectionIndex) },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 }}>
          <TouchableOpacity
  onPress={() => router.replace({ pathname: '/(client)/workout-plan' })}
  style={{ marginBottom: 20, alignSelf: 'flex-start' }}
>
  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>← Back</Text>
</TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: `${color}20`, borderWidth: 1.5, borderColor: `${color}40`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 26 }}>{getFocusEmoji(day.focus)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
                Day {day.day_number}
              </Text>
              <Text style={{ fontSize: 22, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>
                {day.title}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 22, marginBottom: 16 }}>
            {day.subtitle}
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Duration', value: `${day.estimated_mins} min` },
              { label: 'Exercises', value: String(totalExercises) },
              { label: 'Sections', value: String(day.sections?.length ?? 0) },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color }}>{s.value}</Text>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sections */}
        <View style={{ paddingHorizontal: 24, gap: 24 }}>
          {(day.sections ?? []).map((section, sIdx) => {
            const isInterval = isIntervalSection(section);
            return (
              <View key={section.id}>

                {/* Section header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                    <Text style={{ fontSize: 18 }}>{getSectionEmoji(section.type)}</Text>
                    <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase' }}>
                      {section.title}
                    </Text>
                    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                      <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>
                        {section.exercises?.length ?? 0}
                      </Text>
                    </View>
                    {isInterval && (
                      <View style={{ backgroundColor: `${THEME.colors.teal}20`, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 0.5, borderColor: `${THEME.colors.teal}40` }}>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>🎯 Visual</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => startSection(sIdx)}
                    style={{ backgroundColor: isInterval ? THEME.colors.teal : `${color}20`, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: isInterval ? THEME.colors.teal : `${color}40`, marginLeft: 8 }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: isInterval ? '#0A0A0B' : color }}>
                      {isInterval ? '▶ Visual' : '▶ Start'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Exercises */}
                <View style={{ gap: 8 }}>
                  {(section.exercises ?? []).map((ex, exIdx) => (
                    <View key={ex.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${color}20`, borderWidth: 0.5, borderColor: `${color}30`, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color }}>{exIdx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 6 }}>
                            {ex.name}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            {ex.sets && (
                              <View style={{ backgroundColor: `${color}15`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color }}>{ex.sets} sets</Text>
                              </View>
                            )}
                            {ex.reps && (
                              <View style={{ backgroundColor: `${color}15`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color }}>{ex.reps}</Text>
                              </View>
                            )}
                            {ex.duration_seconds && (
                              <View style={{ backgroundColor: `${color}15`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color }}>
                                  {ex.duration_seconds >= 60 ? `${Math.floor(ex.duration_seconds / 60)} min` : `${ex.duration_seconds} sec`}
                                </Text>
                              </View>
                            )}
                            {ex.rest_seconds > 0 && (
                              <View style={{ backgroundColor: '#1A1A1E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Rest: {ex.rest_seconds}s</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 20 }}>
                            {ex.instructions}
                          </Text>
                          {ex.coach_tip && (
                            <View style={{ marginTop: 10, backgroundColor: `${THEME.colors.amber}10`, borderRadius: 8, padding: 10, borderLeftWidth: 2, borderLeftColor: THEME.colors.amber }}>
                              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber, marginBottom: 3 }}>💬 Coach tip</Text>
                              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.amber, lineHeight: 18 }}>{ex.coach_tip}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom buttons */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: THEME.colors.background, borderTopWidth: 0.5, borderTopColor: THEME.colors.border, padding: 20, paddingBottom: 36, gap: 10 }}>
        <TouchableOpacity
          onPress={() => startSection(0)}
          style={{ backgroundColor: color, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: '#0A0A0B' }}>▶ Start Full Workout</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(day.sections ?? []).map((section, idx) => {
            const isInterval = isIntervalSection(section);
            return (
              <TouchableOpacity
                key={section.id}
                onPress={() => startSection(idx)}
                style={{ flex: 1, backgroundColor: isInterval ? `${THEME.colors.teal}15` : THEME.colors.surface2, borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: isInterval ? `${THEME.colors.teal}50` : `${color}30` }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16 }}>{isInterval ? '🎯' : getSectionEmoji(section.type)}</Text>
                <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sansMedium, color: isInterval ? THEME.colors.teal : color, marginTop: 3, textAlign: 'center' }}>
                  {section.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
