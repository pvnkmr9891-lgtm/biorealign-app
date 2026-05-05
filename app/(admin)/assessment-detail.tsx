import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAssessmentDetail } from '@/hooks/useAdmin';
import { THEME } from '@/constants/theme';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTag(val: string) {
  return val?.replace(/_/g, ' ') ?? '—';
}

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28, marginBottom: 14 }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
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
  const color = value >= 7 ? '#34D399' : value >= 5 ? THEME.colors.amber : '#F87171';
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color }}>{value}/10</Text>
      </View>
      <View style={{ height: 6, backgroundColor: '#1A1A1E', borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${(value / 10) * 100}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

function TagList({ items, color = THEME.colors.teal }: { items: string[]; color?: string }) {
  if (!items?.length) return <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>None selected</Text>;
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

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AssessmentDetailScreen() {
  const router = useRouter();
  const { id, clientName } = useLocalSearchParams<{ id: string; clientName: string }>();
  const { data: assessment, isLoading } = useAssessmentDetail(id);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <ActivityIndicator color={THEME.colors.teal} />
      </SafeAreaView>
    );
  }

  if (!assessment) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background, alignItems: 'center', justifyContent: 'center' }} edges={['top']}>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans }}>Assessment not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingTop: 20, paddingBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>← Back</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Assessment
          </Text>
          <Text style={{ fontSize: 28, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 6 }}>
            {clientName}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: assessment.status === 'pending' ? `${THEME.colors.amber}20` : '#34D39920', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: assessment.status === 'pending' ? THEME.colors.amber : '#34D399', textTransform: 'capitalize' }}>
                {assessment.status}
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, alignSelf: 'center' }}>
              Submitted {new Date(assessment.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>

        {/* ── Stage 1: Personal ── */}
        <SectionHeader title="Personal Foundation" emoji="🧬" />
        <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <DataRow label="Occupation"        value={assessment.occupation_type} />
          <DataRow label="Work hours/day"    value={assessment.work_hours_daily ? `${assessment.work_hours_daily} hrs` : null} />
          <DataRow label="Activity level"    value={assessment.daily_activity_level} />
          <DataRow label="Available time"    value={assessment.available_minutes_per_day ? `${assessment.available_minutes_per_day} min/day` : null} />
          <DataRow label="Primary stressor"  value={assessment.primary_stressor} />
          <DataRow label="Previous coaching" value={assessment.previous_coaching} />
        </View>

        {/* ── Stage 2: Body & Health ── */}
        <SectionHeader title="Body & Health" emoji="🩺" />
        <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
          <DataRow label="Height"     value={assessment.height_cm ? `${assessment.height_cm} cm` : null} />
          <DataRow label="Weight"     value={assessment.weight_kg ? `${assessment.weight_kg} kg` : null} />
          <DataRow label="Breathing"  value={assessment.breathing_quality} />
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

        {/* Energy levels */}
        <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 12 }}>Daily energy pattern</Text>
          <EnergyBar label="Morning"   value={assessment.energy_morning} />
          <EnergyBar label="Afternoon" value={assessment.energy_afternoon} />
          <EnergyBar label="Evening"   value={assessment.energy_evening} />
        </View>

        {/* ── Stage 3: Movement ── */}
        <SectionHeader title="Movement & Fitness" emoji="🏋️" />
        <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
          <DataRow label="Last exercised"    value={assessment.last_exercise_period} />
          <DataRow label="Weekly frequency"  value={assessment.weekly_frequency ? `${assessment.weekly_frequency}x/week` : null} />
          <DataRow label="Environment"       value={assessment.workout_environment} />
          <DataRow label="Flexibility score" value={assessment.flexibility_score ? `${assessment.flexibility_score}/10` : null} />
          <DataRow label="Balance score"     value={assessment.balance_score ? `${assessment.balance_score}/10` : null} />
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
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Available equipment</Text>
            <TagList items={assessment.available_equipment} color={THEME.colors.teal} />
          </View>
        )}

        {/* ── Stage 4: Nutrition ── */}
        <SectionHeader title="Nutrition & Recovery" emoji="🥗" />
        <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
          <DataRow label="Diet type"     value={assessment.diet_type} />
          <DataRow label="Meals per day" value={assessment.meals_per_day} />
          <DataRow label="Meal timing"   value={assessment.meal_timing} />
          <DataRow label="Hydration"     value={assessment.hydration_glasses ? `${assessment.hydration_glasses} glasses/day` : null} />
          <DataRow label="Caffeine"      value={assessment.caffeine_cups ? `${assessment.caffeine_cups} cups/day` : null} />
          <DataRow label="Alcohol"       value={assessment.alcohol_frequency} />
          <DataRow label="Avg sleep"     value={assessment.sleep_hours_avg ? `${assessment.sleep_hours_avg} hrs` : null} />
        </View>

        {/* Sleep & stress */}
        <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
          <EnergyBar label="Sleep quality" value={assessment.sleep_quality_avg} />
          <EnergyBar label="Stress level"  value={assessment.stress_level} />
        </View>

        {assessment.food_allergies?.length > 0 && assessment.food_allergies[0] !== 'none' && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Food allergies</Text>
            <TagList items={assessment.food_allergies} color={THEME.colors.amber} />
          </View>
        )}

        {assessment.recovery_tools?.length > 0 && assessment.recovery_tools[0] !== 'none' && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 8 }}>Recovery tools used</Text>
            <TagList items={assessment.recovery_tools} color="#A78BFA" />
          </View>
        )}

        {/* ── Stage 5: Goals ── */}
        <SectionHeader title="Goals & Mindset" emoji="🎯" />
        <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
          <DataRow label="Primary goal"      value={assessment.primary_goal} />
          <DataRow label="Timeline"          value={assessment.timeline} />
          <DataRow label="Daily commitment"  value={assessment.commitment_level ? `${assessment.commitment_level} min/day` : null} />
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
              Ideal outcome (client's words)
            </Text>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.text, lineHeight: 22, fontStyle: 'italic' }}>
              "{assessment.ideal_outcome}"
            </Text>
          </View>
        )}

        {assessment.coach_notes_from_client && (
          <View style={{ backgroundColor: `${THEME.colors.teal}10`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.teal}25`, marginBottom: 24 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              Note to coach
            </Text>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.text, lineHeight: 22 }}>
              {assessment.coach_notes_from_client}
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
