import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdminContentOverview } from '@/hooks/useAdmin';
import { PROGRAMS } from '@/constants/programs';
import { THEME } from '@/constants/theme';

// The DB stores 'postural_realignment' under the alias '3-PRP' (see
// app/(auth)/intensity-select.tsx's programMap) — reverse it here so counts
// line up with the PROGRAMS catalog the rest of the app uses for labels.
const DB_ID_TO_PROGRAM_ID: Record<string, string> = { '3-PRP': 'postural_realignment' };

export default function ContentManager() {
  const router = useRouter();
  const { data: counts = {}, isLoading } = useAdminContentOverview();

  const rows = PROGRAMS.map((p) => {
    const dbKey = Object.entries(DB_ID_TO_PROGRAM_ID).find(([, v]) => v === p.id)?.[0] ?? p.id;
    return { ...p, count: counts[dbKey] ?? 0 };
  });

  const unsetCount = counts['unset'] ?? 0;
  const knownIds = new Set([...PROGRAMS.map((p) => p.id), ...Object.keys(DB_ID_TO_PROGRAM_ID), 'unset']);
  const otherCount = Object.entries(counts).filter(([k]) => !knownIds.has(k)).reduce((s, [, v]) => s + v, 0);

  const maxCount = Math.max(1, ...rows.map((r) => r.count));

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
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 26 }}>Content</Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12.5, marginTop: 1 }}>Read-only — program assignment overview</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 18, lineHeight: 19 }}>
            How many active clients are currently assigned to each program (by `profiles.workout_program_id`).
            This is a read-only summary — editing program content isn't part of this pass.
          </Text>

          <View style={{ gap: 12 }}>
            {rows.map((p) => (
              <View key={p.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>{p.icon}</Text>
                    <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{p.name}</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: p.color }}>{p.count}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: THEME.colors.surface3, borderRadius: 3, overflow: 'hidden', borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  <View style={{ height: '100%', width: `${(p.count / maxCount) * 100}%`, backgroundColor: p.color, borderRadius: 3 }} />
                </View>
              </View>
            ))}

            {(unsetCount > 0 || otherCount > 0) && (
              <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: THEME.colors.border, gap: 8 }}>
                {unsetCount > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>No program selected yet</Text>
                    <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>{unsetCount}</Text>
                  </View>
                )}
                {otherCount > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Other / legacy ids</Text>
                    <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>{otherCount}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
