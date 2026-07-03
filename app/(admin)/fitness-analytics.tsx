import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAdminFitnessAnalytics } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

const DOMAIN_LABELS: Record<string, { label: string; icon: string }> = {
  strength:    { label: 'Strength',    icon: '💪' },
  flexibility: { label: 'Flexibility', icon: '🤸' },
  endurance:   { label: 'Endurance',   icon: '🫁' },
  agility:     { label: 'Agility',     icon: '🏃' },
};

function CompareBar({ label, valueA, colorA, valueB, colorB }: { label: string; valueA: number | null; colorA: string; valueB: number | null; colorB: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <View style={{ height: 8, backgroundColor: THEME.colors.surface3, borderRadius: 4, overflow: 'hidden', marginBottom: 3 }}>
            <View style={{ height: '100%', width: `${valueA ?? 0}%`, backgroundColor: colorA, borderRadius: 4 }} />
          </View>
          <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{valueA != null ? `${valueA}` : '—'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ height: 8, backgroundColor: THEME.colors.surface3, borderRadius: 4, overflow: 'hidden', marginBottom: 3 }}>
            <View style={{ height: '100%', width: `${valueB ?? 0}%`, backgroundColor: colorB, borderRadius: 4 }} />
          </View>
          <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{valueB != null ? `${valueB}` : '—'}</Text>
        </View>
      </View>
    </View>
  );
}

function Legend({ a, colorA, b, colorB }: { a: string; colorA: string; b: string; colorB: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorA }} />
        <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{a}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorB }} />
        <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{b}</Text>
      </View>
    </View>
  );
}

export default function AdminFitnessAnalyticsScreen() {
  const router = useRouter();
  const { data, isLoading } = useAdminFitnessAnalytics();

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
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 26 }}>Fitness Analytics</Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12.5, marginTop: 1 }}>Platform-wide aggregate scores</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <View style={{ width: '47%', backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginBottom: 8 }}>Clients assessed</Text>
              <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 30 }}>{data?.totalClientsAssessed ?? 0}</Text>
            </View>
            <View style={{ width: '47%', backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginBottom: 8 }}>≥60 / &lt;60 split</Text>
              <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sansMedium, fontSize: 22 }}>{data?.over60Count ?? 0} / {data?.under60Count ?? 0}</Text>
            </View>
          </View>

          <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>
              Avg domain score by athlete status
            </Text>
            <Legend a={`Athlete (${data?.athleteCount ?? 0})`} colorA="#34D399" b={`General (${data?.nonAthleteCount ?? 0})`} colorB="#60A5FA" />
            {(data?.byAthleteStatus ?? []).map((row) => (
              <CompareBar
                key={row.domain}
                label={`${DOMAIN_LABELS[row.domain]?.icon ?? ''} ${DOMAIN_LABELS[row.domain]?.label ?? row.domain}`}
                valueA={row.athlete} colorA="#34D399"
                valueB={row.nonAthlete} colorB="#60A5FA"
              />
            ))}
          </View>

          <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
            <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>
              Avg domain score by age band
            </Text>
            <Legend a={`≥60 (${data?.over60Count ?? 0})`} colorA={THEME.colors.teal} b={`&lt;60 (${data?.under60Count ?? 0})`} colorB={THEME.colors.amber} />
            {(data?.byAgeBand ?? []).map((row) => (
              <CompareBar
                key={row.domain}
                label={`${DOMAIN_LABELS[row.domain]?.icon ?? ''} ${DOMAIN_LABELS[row.domain]?.label ?? row.domain}`}
                valueA={row.over60} colorA={THEME.colors.teal}
                valueB={row.under60} colorB={THEME.colors.amber}
              />
            ))}
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 6, lineHeight: 16 }}>
              Clients under 60 only ever have raw results recorded — real normative scoring data only exists for ages 60-94, so their average will show "—" until they age into a scored band.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
