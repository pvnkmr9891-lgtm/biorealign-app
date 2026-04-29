import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActiveEnrollment, useProgressHistory } from '@/hooks/useClient';
import { LineChart } from '@/components/ui/LineChart';
import { THEME } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Delta card
// ---------------------------------------------------------------------------
function DeltaCard({
  label, current, previous, color,
}: { label: string; current: number | null; previous: number | null; color: string }) {
  const val = current ?? 0;
  const prev = previous ?? val;
  const delta = val - prev;
  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 11 }}>{label}</Text>
      </View>
      <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 28 }}>{val}</Text>
      <Text style={{ fontFamily: THEME.fonts.sansMedium, fontSize: 12, marginTop: 4, color: delta > 0 ? THEME.colors.success : delta < 0 ? THEME.colors.error : THEME.colors.textMuted }}>
        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '—'} vs prev
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function ProgressScreen() {
  const { data: enrollment } = useActiveEnrollment();
  const { data: history = [], isLoading } = useProgressHistory(10);

  const latest   = history[history.length - 1] ?? null;
  const previous = history[history.length - 2] ?? null;

  // Build chart series from history
  const labels = history.map((m) =>
    new Date(m.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  );

  const SERIES = [
    { key: 'fitness_score',   label: 'Fitness',   color: THEME.scoreColors.fitness,   data: history.map((m) => m.fitness_score   ?? 0) },
    { key: 'recovery_score',  label: 'Recovery',  color: THEME.scoreColors.recovery,  data: history.map((m) => m.recovery_score  ?? 0) },
    { key: 'longevity_score', label: 'Longevity', color: THEME.scoreColors.longevity, data: history.map((m) => m.longevity_score ?? 0) },
  ];

  const weightSeries = [{ key: 'weight', label: 'Weight (kg)', color: THEME.colors.amber, data: [] as number[] }];
  const hasWeight = history.some((m) => m.weight_kg);
  if (hasWeight) {
    const maxW = Math.max(...history.map((m) => m.weight_kg ?? 0));
    const minW = Math.min(...history.filter((m) => m.weight_kg).map((m) => m.weight_kg!));
    const range = maxW - minW || 1;
    // Normalise weight to 0–100 for the chart
    weightSeries[0].data = history.map((m) =>
      m.weight_kg ? Math.round(((m.weight_kg - minW) / range) * 80 + 10) : 0
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 32 }}>Progress</Text>
          {enrollment && (
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 14, marginTop: 4 }}>
              {enrollment.program?.name} · Week {enrollment.current_week} of {enrollment.program?.duration_weeks}
            </Text>
          )}
        </View>

        {/* Delta cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 20 }}>
          <DeltaCard label="Fitness"   current={latest?.fitness_score   ?? null} previous={previous?.fitness_score   ?? null} color={THEME.scoreColors.fitness} />
          <DeltaCard label="Recovery"  current={latest?.recovery_score  ?? null} previous={previous?.recovery_score  ?? null} color={THEME.scoreColors.recovery} />
          <DeltaCard label="Longevity" current={latest?.longevity_score ?? null} previous={previous?.longevity_score ?? null} color={THEME.scoreColors.longevity} />
        </View>

        {/* Score trend chart */}
        <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>
            Score trend
          </Text>

          {isLoading || history.length < 2 ? (
            <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
                {isLoading ? 'Loading…' : 'Complete 2+ check-ins to see your trend'}
              </Text>
            </View>
          ) : (
            <LineChart
              series={SERIES}
              labels={labels}
              height={180}
              showDots={history.length <= 8}
            />
          )}

          {/* Legend */}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
            {SERIES.map((s) => (
              <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 16, height: 2.5, borderRadius: 1.5, backgroundColor: s.color }} />
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Weight chart */}
        {hasWeight && (
          <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Weight
              </Text>
              <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>
                {latest?.weight_kg ?? '—'} kg
              </Text>
            </View>
            <LineChart series={weightSeries} labels={labels} height={130} showDots />
          </View>
        )}

        {/* Posture score card */}
        {latest?.posture_score != null && (
          <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
              Posture score
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <Text style={{ color: '#C4B5FD', fontFamily: THEME.fonts.sansMedium, fontSize: 40 }}>
                {latest.posture_score}
              </Text>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 14, marginBottom: 6 }}>/ 100</Text>
              {previous?.posture_score != null && (
                <Text style={{ color: (latest.posture_score - previous.posture_score) >= 0 ? THEME.colors.success : THEME.colors.error, fontFamily: THEME.fonts.sansMedium, fontSize: 14, marginBottom: 6 }}>
                  {latest.posture_score - previous.posture_score >= 0 ? '+' : ''}{latest.posture_score - previous.posture_score} vs prev
                </Text>
              )}
            </View>
            {/* Simple bar */}
            <View style={{ height: 6, backgroundColor: THEME.colors.surface3, borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${latest.posture_score}%`, backgroundColor: '#C4B5FD', borderRadius: 3 }} />
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
