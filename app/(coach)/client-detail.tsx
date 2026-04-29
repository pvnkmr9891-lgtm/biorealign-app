import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClientDetail } from '@/hooks/useCoach';
import { LineChart } from '@/components/ui/LineChart';
import { THEME } from '@/constants/theme';

export default function ClientDetailScreen() {
  const router = useRouter();
  const { clientId, enrollmentId, clientName } = useLocalSearchParams<{
    clientId: string;
    enrollmentId: string;
    clientName: string;
  }>();

  const { data, isLoading } = useClientDetail(clientId, enrollmentId);

  const latest   = data?.metrics?.[0] ?? null;
  const previous = data?.metrics?.[1] ?? null;

  const SCORES = [
    { label: 'Fitness',   key: 'fitness_score',   color: THEME.scoreColors.fitness },
    { label: 'Recovery',  key: 'recovery_score',  color: THEME.scoreColors.recovery },
    { label: 'Longevity', key: 'longevity_score', color: THEME.scoreColors.longevity },
  ];

  const chartSeries = SCORES.map((s) => ({
    key:   s.key,
    label: s.label,
    color: s.color,
    data:  (data?.metrics ?? []).slice().reverse().map((m: any) => m[s.key] ?? 0),
  }));

  const chartLabels = (data?.metrics ?? []).slice().reverse().map((m: any) =>
    new Date(m.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={THEME.colors.amber} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 26 }}>
              {clientName}
            </Text>
            <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
              Client profile
            </Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(coach)/messaging', params: { enrollmentId, clientId, clientName } })}
            style={{ flex: 1, backgroundColor: THEME.colors.tealMuted, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}
          >
            <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>💬 Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
          >
            <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>📅 Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Score cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 20 }}>
          {SCORES.map((s) => {
            const val  = latest?.[s.key]   ?? null;
            const prev = previous?.[s.key] ?? null;
            const delta = val != null && prev != null ? val - prev : null;
            return (
              <View key={s.key} style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: s.color }} />
                  <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 10 }}>{s.label}</Text>
                </View>
                <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 24 }}>
                  {val ?? '–'}
                </Text>
                {delta != null && (
                  <Text style={{ color: delta >= 0 ? THEME.colors.success : THEME.colors.error, fontFamily: THEME.fonts.sans, fontSize: 11, marginTop: 3 }}>
                    {delta >= 0 ? '+' : ''}{delta}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Score trend chart */}
        {(data?.metrics?.length ?? 0) >= 2 && (
          <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 20 }}>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>
              Score trend
            </Text>
            <LineChart series={chartSeries} labels={chartLabels} height={160} showDots />
          </View>
        )}

        {/* Recent check-ins */}
        <View style={{ marginHorizontal: 24, marginBottom: 20 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
            Recent check-ins
          </Text>
          {(data?.checkins?.length ?? 0) === 0 ? (
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>No check-ins yet</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {data?.checkins?.map((c: any) => (
                <View key={c.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>
                      {new Date(c.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={{ color: c.pain_level >= 7 ? THEME.colors.error : c.pain_level >= 4 ? THEME.colors.amber : THEME.colors.success, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>
                      Pain: {c.pain_level}/10
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    {[['Mood', c.mood], ['Energy', c.energy], ['Sleep', `${c.sleep_hrs}h`]].map(([l, v]) => (
                      <View key={String(l)}>
                        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11 }}>{l}</Text>
                        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14 }}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  {c.notes && (
                    <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
                      "{c.notes}"
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Session history */}
        <View style={{ marginHorizontal: 24 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
            Session history
          </Text>
          {(data?.sessions?.length ?? 0) === 0 ? (
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 13 }}>No sessions yet</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {data?.sessions?.map((s: any) => (
                <TouchableOpacity
                  key={s.id}
                  activeOpacity={0.8}
                  onPress={() => router.push({ pathname: '/(coach)/session-notes', params: { sessionId: s.id, clientName } })}
                  style={{ backgroundColor: THEME.colors.surface2, borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <View>
                    <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>
                      {new Date(s.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
                      {s.type} · {s.duration_min} min
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: s.status === 'completed' ? `${THEME.colors.success}20` : THEME.colors.surface3 }}>
                      <Text style={{ color: s.status === 'completed' ? THEME.colors.success : THEME.colors.textMuted, fontFamily: THEME.fonts.sansMedium, fontSize: 11 }}>
                        {s.status}
                      </Text>
                    </View>
                    <Text style={{ color: THEME.colors.textMuted }}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
