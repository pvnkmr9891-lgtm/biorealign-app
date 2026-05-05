import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClientDetail } from '@/hooks/useCoach';
import { useClientAssessment } from '@/hooks/useClientAssessment';
import { LineChart } from '@/components/ui/LineChart';
import { PlanSection } from '@/components/coach/PlanSection';
import { THEME } from '@/constants/theme';

// ── Assessment helpers ────────────────────────────────────────────────────────
function formatTag(val: string) {
  return val?.replace(/_/g, ' ') ?? '—';
}

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 12 }}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, letterSpacing: 1.5, textTransform: 'uppercase' }}>
        {title}
      </Text>
    </View>
  );
}

function DataRow({ label, value }: { label: string; value: any }) {
  const display = Array.isArray(value)
    ? value.length > 0 ? value.map(formatTag).join(', ') : '—'
    : value != null && value !== '' ? String(value) : '—';

  return (
    <View style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: THEME.colors.border }}>
      <Text style={{ flex: 1, fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{label}</Text>
      <Text style={{ flex: 1.5, fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, textAlign: 'right', textTransform: 'capitalize' }}>
        {formatTag(display)}
      </Text>
    </View>
  );
}

function EnergyBar({ label, value }: { label: string; value: number | null }) {
  if (!value) return null;
  const color = value >= 7 ? THEME.colors.success : value >= 5 ? THEME.colors.amber : THEME.colors.error;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color }}>{value}/10</Text>
      </View>
      <View style={{ height: 5, backgroundColor: THEME.colors.surface2, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${(value / 10) * 100}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

function TagList({ items, color }: { items: string[]; color: string }) {
  if (!items?.length || items[0] === 'none') {
    return <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>None</Text>;
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {items.map(item => (
        <View key={item} style={{ backgroundColor: `${color}15`, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: `${color}30` }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color, textTransform: 'capitalize' }}>
            {formatTag(item)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Assessment tab ────────────────────────────────────────────────────────────
function AssessmentTab({ clientId }: { clientId: string }) {
  const { data: assessment, isLoading } = useClientAssessment(clientId);

  if (isLoading) {
    return (
      <View style={{ paddingTop: 60, alignItems: 'center' }}>
        <ActivityIndicator color={THEME.colors.teal} />
      </View>
    );
  }

  if (!assessment) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 36, marginBottom: 16 }}>📋</Text>
        <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
          No assessment yet
        </Text>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
          This client hasn't submitted their onboarding assessment yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

      {/* Submitted badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: `${THEME.colors.teal}10`, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: `${THEME.colors.teal}25`, marginTop: 16, marginBottom: 4 }}>
        <Text style={{ fontSize: 14 }}>✅</Text>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
          Submitted {new Date(assessment.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* ── Stage 1 ── */}
      <SectionHeader title="Personal Foundation" emoji="🧬" />
      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
        <DataRow label="Occupation"        value={assessment.occupation_type} />
        <DataRow label="Work hours/day"    value={assessment.work_hours_daily ? `${assessment.work_hours_daily} hrs` : null} />
        <DataRow label="Activity level"    value={assessment.daily_activity_level} />
        <DataRow label="Available time"    value={assessment.available_minutes_per_day ? `${assessment.available_minutes_per_day} min/day` : null} />
        <DataRow label="Primary stressor"  value={assessment.primary_stressor} />
        <DataRow label="Previous coaching" value={assessment.previous_coaching} />
      </View>

      {/* ── Stage 2 ── */}
      <SectionHeader title="Body & Health" emoji="🩺" />
      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
        <DataRow label="Height"      value={assessment.height_cm ? `${assessment.height_cm} cm` : null} />
        <DataRow label="Weight"      value={assessment.weight_kg ? `${assessment.weight_kg} kg` : null} />
        <DataRow label="Breathing"   value={assessment.breathing_quality} />
        <DataRow label="Medications" value={assessment.medications} />
      </View>

      {assessment.complaints?.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Complaints</Text>
          <TagList items={assessment.complaints} color="#F87171" />
        </View>
      )}

      {assessment.conditions?.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Medical conditions</Text>
          <TagList items={assessment.conditions} color={THEME.colors.amber} />
        </View>
      )}

      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 12 }}>Energy pattern</Text>
        <EnergyBar label="Morning"   value={assessment.energy_morning} />
        <EnergyBar label="Afternoon" value={assessment.energy_afternoon} />
        <EnergyBar label="Evening"   value={assessment.energy_evening} />
      </View>

      {/* ── Stage 3 ── */}
      <SectionHeader title="Movement & Fitness" emoji="🏋️" />
      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
        <DataRow label="Last exercised"   value={assessment.last_exercise_period} />
        <DataRow label="Weekly frequency" value={assessment.weekly_frequency ? `${assessment.weekly_frequency}x/week` : null} />
        <DataRow label="Environment"      value={assessment.workout_environment} />
        <DataRow label="Flexibility"      value={assessment.flexibility_score ? `${assessment.flexibility_score}/10` : null} />
        <DataRow label="Balance"          value={assessment.balance_score ? `${assessment.balance_score}/10` : null} />
      </View>

      {assessment.posture_issues?.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Posture issues</Text>
          <TagList items={assessment.posture_issues} color="#C4B5FD" />
        </View>
      )}

      {assessment.pain_during_movement?.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Pain during movement</Text>
          <TagList items={assessment.pain_during_movement} color="#F87171" />
        </View>
      )}

      {assessment.available_equipment?.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Equipment</Text>
          <TagList items={assessment.available_equipment} color={THEME.colors.teal} />
        </View>
      )}

      {/* ── Stage 4 ── */}
      <SectionHeader title="Nutrition & Recovery" emoji="🥗" />
      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
        <DataRow label="Diet type"     value={assessment.diet_type} />
        <DataRow label="Meals per day" value={assessment.meals_per_day} />
        <DataRow label="Hydration"     value={assessment.hydration_glasses ? `${assessment.hydration_glasses} glasses/day` : null} />
        <DataRow label="Avg sleep"     value={assessment.sleep_hours_avg ? `${assessment.sleep_hours_avg} hrs` : null} />
        <DataRow label="Caffeine"      value={assessment.caffeine_cups ? `${assessment.caffeine_cups} cups/day` : null} />
        <DataRow label="Alcohol"       value={assessment.alcohol_frequency} />
      </View>

      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
        <EnergyBar label="Sleep quality" value={assessment.sleep_quality_avg} />
        <EnergyBar label="Stress level"  value={assessment.stress_level} />
      </View>

      {assessment.recovery_tools?.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Recovery tools</Text>
          <TagList items={assessment.recovery_tools} color="#A78BFA" />
        </View>
      )}

      {/* ── Stage 5 ── */}
      <SectionHeader title="Goals & Mindset" emoji="🎯" />
      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
        <DataRow label="Primary goal"     value={assessment.primary_goal} />
        <DataRow label="Timeline"         value={assessment.timeline} />
        <DataRow label="Daily commitment" value={assessment.commitment_level ? `${assessment.commitment_level} min/day` : null} />
      </View>

      {assessment.secondary_goals?.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Secondary goals</Text>
          <TagList items={assessment.secondary_goals} color={THEME.colors.teal} />
        </View>
      )}

      {assessment.past_blockers?.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Past blockers</Text>
          <TagList items={assessment.past_blockers} color="#F87171" />
        </View>
      )}

      {assessment.ideal_outcome && (
        <View style={{ backgroundColor: `${THEME.colors.amber}10`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.amber}25`, marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            In their own words
          </Text>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, lineHeight: 22, fontStyle: 'italic' }}>
            "{assessment.ideal_outcome}"
          </Text>
        </View>
      )}

      {assessment.coach_notes_from_client && (
        <View style={{ backgroundColor: `${THEME.colors.teal}10`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.teal}25`, marginBottom: 24 }}>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Note to you
          </Text>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, lineHeight: 22 }}>
            {assessment.coach_notes_from_client}
          </Text>
        </View>
      )}

    </ScrollView>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function OverviewTab({ data, clientId, clientName, enrollmentId }: {
  data: any; clientId: string; clientName: string; enrollmentId: string;
}) {
  const router = useRouter();

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

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

      {/* Quick actions */}
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 24, marginTop: 16, marginBottom: 24 }}>
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
          const val   = latest?.[s.key]   ?? null;
          const prev  = previous?.[s.key] ?? null;
          const delta = val != null && prev != null ? val - prev : null;
          return (
            <View key={s.key} style={{ flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: s.color }} />
                <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 10 }}>{s.label}</Text>
              </View>
              <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 24 }}>{val ?? '–'}</Text>
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
      <View style={{ marginHorizontal: 24, marginBottom: 20 }}>
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
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: s.status === 'completed' ? `${THEME.colors.success}20` : THEME.colors.surface2 }}>
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

      {/* Plan section */}
      <PlanSection clientId={clientId} clientName={clientName ?? ''} />

    </ScrollView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ClientDetailScreen() {
  const router = useRouter();
  const { clientId, enrollmentId, clientName } = useLocalSearchParams<{
    clientId: string;
    enrollmentId: string;
    clientName: string;
  }>();

  const { data, isLoading } = useClientDetail(clientId, enrollmentId);
  const [activeTab, setActiveTab] = useState<'overview' | 'assessment'>('overview');

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={THEME.colors.amber} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>

      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
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

      {/* Tab bar */}
      <View style={{ flexDirection: 'row', marginHorizontal: 24, marginBottom: 4, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}>
        {[
          { key: 'overview',    label: 'Overview' },
          { key: 'assessment',  label: 'Assessment' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            activeOpacity={0.8}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: activeTab === tab.key ? THEME.colors.amber : 'transparent' }}
          >
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: activeTab === tab.key ? THEME.colors.background : THEME.colors.textMuted }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'overview' && (
          <OverviewTab
            data={data}
            clientId={clientId}
            clientName={clientName ?? ''}
            enrollmentId={enrollmentId}
          />
        )}
        {activeTab === 'assessment' && (
          <AssessmentTab clientId={clientId} />
        )}
      </View>

    </SafeAreaView>
  );
}
