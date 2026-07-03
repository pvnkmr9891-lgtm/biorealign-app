import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMyFitnessAssessments, FitnessDomain } from '@/hooks/useFitnessAssessment';
import { MetricTrendChart } from '@/components/ui/MetricTrendChart';
import { THEME } from '@/constants/theme';
import { TAB_BAR_CLEARANCE } from '@/components/ui/SlidingTabBar';

const DOMAIN_META: Record<FitnessDomain, { label: string; icon: string; color: string }> = {
  strength:    { label: 'Strength',    icon: '💪', color: '#8b78e8' },
  flexibility: { label: 'Flexibility', icon: '🤸', color: THEME.colors.amber },
  endurance:   { label: 'Endurance',   icon: '🫁', color: '#60A5FA' },
  agility:     { label: 'Agility',     icon: '🏃', color: THEME.colors.success ?? '#4CC986' },
};
const IN_SCOPE_DOMAINS: FitnessDomain[] = ['strength', 'flexibility', 'endurance', 'agility'];

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 14, borderLeftWidth: accent ? 3 : 0.5, borderLeftColor: accent ?? THEME.colors.border }}>
      {children}
    </View>
  );
}

function EmptyState() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 30 }}>🏋️</Text>
      </View>
      <Text style={{ fontSize: 17, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center' }}>No assessments yet</Text>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
        Your coach will run a fitness assessment with you and your scores will appear here.
      </Text>
    </View>
  );
}

export default function ClientFitnessAssessmentScreen() {
  const { data: assessments = [], isLoading } = useMyFitnessAssessments();
  const [selectedDomain, setSelectedDomain] = useState<FitnessDomain>('strength');

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (assessments.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: TAB_BAR_CLEARANCE }}>
          <Text style={{ fontSize: 26, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginTop: 20, marginBottom: 16 }}>Fitness Assessment</Text>
          <EmptyState />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Most recent first (already ordered by the hook); reverse for chronological trend.
  const chronological = [...assessments].reverse();
  const latest = assessments[0];

  // Build per-domain trend points (only "scored" rows contribute a numeric point).
  const trendForDomain = (domain: FitnessDomain) =>
    chronological
      .map((a) => {
        const r = a.results.find((res) => res.domain === domain);
        return r && r.score_status === 'scored' && r.domain_score != null
          ? { date: a.assessment_date, value: Math.round(r.domain_score) }
          : null;
      })
      .filter((p): p is { date: string; value: number } => p != null);

  const latestResultFor = (domain: FitnessDomain) => latest.results.find((r) => r.domain === domain);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: TAB_BAR_CLEARANCE }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 26, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginTop: 20, marginBottom: 4 }}>Fitness Assessment</Text>
        <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 18 }}>
          Last assessed {new Date(latest.assessment_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>

        {/* Current scores */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
          {IN_SCOPE_DOMAINS.map((domain) => {
            const result = latestResultFor(domain);
            const meta = DOMAIN_META[domain];
            const outOfRange = result?.score_status === 'age_out_of_range';
            return (
              <View key={domain} style={{ width: '47%', backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border, alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
                {result == null ? (
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center' }}>Not tested yet</Text>
                ) : outOfRange ? (
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center' }}>Not yet available for your age</Text>
                ) : (
                  <Text style={{ fontSize: 22, fontFamily: THEME.fonts.sansMedium, color: meta.color }}>{Math.round(result.domain_score!)}</Text>
                )}
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>{meta.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Trend chart */}
        <Card accent={DOMAIN_META[selectedDomain].color}>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 10 }}>Trend</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6 }}>
            {IN_SCOPE_DOMAINS.map((domain) => {
              const meta = DOMAIN_META[domain];
              const active = selectedDomain === domain;
              return (
                <TouchableOpacity
                  key={domain}
                  onPress={() => setSelectedDomain(domain)}
                  style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, backgroundColor: active ? meta.color : THEME.colors.surface3 }}
                >
                  <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: active ? THEME.colors.background : THEME.colors.textSecondary }}>{meta.icon} {meta.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {(() => {
            const points = trendForDomain(selectedDomain);
            if (points.length === 0) {
              return (
                <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', paddingVertical: 20 }}>
                  No scored results yet for this domain — either it hasn't been tested, or your age isn't yet covered by available reference data.
                </Text>
              );
            }
            return <MetricTrendChart points={points} color={DOMAIN_META[selectedDomain].color} unit="" />;
          })()}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
