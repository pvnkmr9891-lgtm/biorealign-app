// app/(auth)/intensity-select.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PROGRAMS } from '@/constants/programs';
import { useOnboardingStore, INTENSITY_META, TYPE_META, IntensityLevel, TrainingType } from '@/store/onboardingStore';
import { THEME } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {[1, 2, 3].map(i => (
        <View key={i} style={[pd.dot, i === step && pd.dotActive, i < step && pd.dotDone]} />
      ))}
    </View>
  );
}
const pd = StyleSheet.create({
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { width: 20, backgroundColor: THEME.colors.teal },
  dotDone:   { backgroundColor: `${THEME.colors.teal}50` },
});

export default function IntensitySelectScreen() {
  const router = useRouter();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const prog = PROGRAMS.find(p => p.id === programId) ?? PROGRAMS[0];

  const { setIntensity, setType } = useOnboardingStore();
  const [selIntensity, setSelIntensity] = useState<IntensityLevel | null>(null);
  const [selType,      setSelType]      = useState<TrainingType   | null>(null);

  const canProceed = !!selIntensity && !!selType;

  async function handleNext() {
    if (!canProceed) return;
    setIntensity(selIntensity!);
    setType(selType!);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const programMap: Record<string, string> = {
        postural_realignment: '3-PRP',
      };
      const dbProgramId = programMap[programId ?? ''] ?? programId;
      await supabase.from('profiles').update({
        workout_program_id:    dbProgramId,
        workout_training_type: selType,
        workout_intensity:     selIntensity,
      }).eq('id', user.id);
    }
    router.push('/onboarding' as any);
  }

  // ── Skip: update DB + local store, let AuthGuard route to /(client) ──
async function handleSkip() {
  // ← Move these TWO lines to the top, outside the if(user) block
  const programMap: Record<string, string> = { postural_realignment: '3-PRP' };
  const dbProgramId = programMap[programId ?? ''] ?? programId ?? '';

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('profiles')
      .update({
        onboarding_completed:  true,
        workout_program_id:    dbProgramId,
        workout_training_type: selType      ?? 'home',
        workout_intensity:     selIntensity ?? 'beginner',
      })
      .eq('id', user.id);
  }

  useAuthStore.setState(state => ({
    profile: state.profile
      ? {
          ...state.profile,
          onboarding_completed:  true,
          workout_program_id:    dbProgramId,   // ← now in scope
          workout_training_type: selType      ?? 'home',
          workout_intensity:     selIntensity ?? 'beginner',
        }
      : state.profile,
  }));
}

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
          <Text style={s.backLabel}>Back</Text>
        </TouchableOpacity>
        <ProgressDots step={2} />
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={[s.progReminder, { borderLeftColor: prog.color }]}>
          <Text style={s.progReminderIcon}>{prog.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.progReminderLabel}>Selected programme</Text>
            <Text style={s.progReminderName}>{prog.name}</Text>
          </View>
        </View>

        <Text style={s.stepLabel}>Step 2 of 3</Text>
        <Text style={s.title}>Personalise your plan</Text>
        <Text style={s.subtitle}>Choose your intensity and training environment so we can calibrate your exact programme.</Text>

        <Text style={s.sectionTitle}>Intensity Level</Text>
        <View style={s.intensityGrid}>
          {(Object.entries(INTENSITY_META) as [IntensityLevel, typeof INTENSITY_META[IntensityLevel]][]).map(([key, meta]) => {
            const isSelected = selIntensity === key;
            return (
              <TouchableOpacity
                key={key}
                style={[s.intensityCard, isSelected && { borderColor: meta.color, borderWidth: 1.5, backgroundColor: `${meta.color}0C` }]}
                onPress={() => setSelIntensity(key)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={s.intensityIcon}>{meta.icon}</Text>
                  <View style={[s.durationBadge, { backgroundColor: isSelected ? `${meta.color}25` : 'rgba(255,255,255,0.07)', borderColor: isSelected ? `${meta.color}40` : 'rgba(255,255,255,0.1)' }]}>
                    <Text style={[s.durationText, isSelected && { color: meta.color }]}>{meta.weeks} wks</Text>
                  </View>
                </View>
                <Text style={[s.intensityLabel, isSelected && { color: meta.color }]}>{meta.label}</Text>
                <Text style={s.intensityDesc} numberOfLines={2}>{meta.description}</Text>
                {isSelected && <View style={[s.intensityCheck, { backgroundColor: meta.color }]}><Text style={s.checkTick}>✓</Text></View>}
              </TouchableOpacity>
            );
          })}
        </View>

        {selIntensity && (
          <View style={[s.weeksExplainer, { borderColor: `${INTENSITY_META[selIntensity].color}30` }]}>
            <Text style={[s.weeksNum, { color: INTENSITY_META[selIntensity].color }]}>
              {INTENSITY_META[selIntensity].weeks} weeks
            </Text>
            <Text style={s.weeksExplainText}>
              {selIntensity === 'beginner' && "A gentle, sustainable pace — perfect if you're building new habits or returning after a break."}
              {selIntensity === 'medium'   && 'The sweet spot between challenge and recovery. Ideal for those with some fitness base.'}
              {selIntensity === 'hard'     && 'Maximum commitment required. Short, intense transformation for experienced individuals.'}
            </Text>
          </View>
        )}

        <Text style={[s.sectionTitle, { marginTop: 28 }]}>Training Environment</Text>
        <View style={s.typeGrid}>
          {(Object.entries(TYPE_META) as [TrainingType, typeof TYPE_META[TrainingType]][]).map(([key, meta]) => {
            const isSelected = selType === key;
            return (
              <TouchableOpacity
                key={key}
                style={[s.typeCard, isSelected && s.typeCardSelected]}
                onPress={() => setSelType(key)}
                activeOpacity={0.8}
              >
                <Text style={s.typeIcon}>{meta.icon}</Text>
                <Text style={[s.typeLabel, isSelected && { color: THEME.colors.teal }]}>{meta.label}</Text>
                <Text style={s.typeDesc}>{meta.description}</Text>
                {isSelected && <View style={s.typeCheck}><Text style={s.checkTick}>✓</Text></View>}
              </TouchableOpacity>
            );
          })}
        </View>

        {canProceed && (
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Your plan at a glance</Text>
            <View style={{ gap: 6 }}>
              {[
                { label: 'Programme', value: prog.name,                              color: prog.color },
                { label: 'Duration',  value: `${INTENSITY_META[selIntensity!].weeks} weeks`, color: INTENSITY_META[selIntensity!].color },
                { label: 'Intensity', value: INTENSITY_META[selIntensity!].label,    color: INTENSITY_META[selIntensity!].color },
                { label: 'Location',  value: TYPE_META[selType!].label,              color: THEME.colors.teal },
              ].map(row => (
                <View key={row.label} style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{row.label}</Text>
                  <Text style={[s.summaryValue, { color: row.color }]}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <View style={s.bottomWrap}>
        {!canProceed && (
          <Text style={s.hint}>Select an intensity level and training environment to continue</Text>
        )}
        <TouchableOpacity
          style={[s.nextBtn, !canProceed && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
          activeOpacity={0.85}
        >
          <Text style={[s.nextBtnText, !canProceed && { color: 'rgba(0,0,0,0.4)' }]}>
            Start health assessment  →
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSkip}
          activeOpacity={0.7}
          style={{ alignItems: 'center', paddingVertical: 12 }}
        >
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textDecorationLine: 'underline' }}>
            Skip assessment — go to dashboard
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: THEME.colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, width: 60 },
  backArrow:     { color: THEME.colors.teal, fontSize: 18 },
  backLabel:     { color: THEME.colors.teal, fontSize: 14, fontFamily: THEME.fonts.sans },
  scrollContent: { padding: 16, paddingTop: 8 },
  progReminder:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 20 },
  progReminderIcon:  { fontSize: 20 },
  progReminderLabel: { color: THEME.colors.textMuted, fontSize: 10, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  progReminderName:  { color: THEME.colors.textPrimary, fontSize: 13, fontFamily: THEME.fonts.sansMedium },
  stepLabel:    { color: THEME.colors.teal, fontSize: 11, fontFamily: THEME.fonts.sansMedium, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  title:        { color: THEME.colors.textPrimary, fontSize: 24, fontFamily: THEME.fonts.serif, marginBottom: 6 },
  subtitle:     { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans, lineHeight: 20, marginBottom: 24 },
  sectionTitle: { color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.5, marginBottom: 12 },
  intensityGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  intensityCard: { flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' },
  intensityIcon:  { fontSize: 22 },
  durationBadge:  { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1 },
  durationText:   { fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted },
  intensityLabel: { fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 5 },
  intensityDesc:  { fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 15 },
  intensityCheck: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  weeksExplainer:   { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  weeksNum:         { fontSize: 22, fontFamily: THEME.fonts.sansMedium, flexShrink: 0 },
  weeksExplainText: { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans, lineHeight: 18, flex: 1 },
  typeGrid: { flexDirection: 'row', gap: 10 },
  typeCard: { flex: 1, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', gap: 6, position: 'relative', overflow: 'hidden' },
  typeCardSelected: { borderColor: `${THEME.colors.teal}55`, borderWidth: 1.5, backgroundColor: `${THEME.colors.teal}08` },
  typeIcon:  { fontSize: 26, marginBottom: 2 },
  typeLabel: { fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary },
  typeDesc:  { fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 14 },
  typeCheck: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: THEME.colors.teal, alignItems: 'center', justifyContent: 'center' },
  checkTick: { color: '#000', fontSize: 11, fontFamily: THEME.fonts.sansMedium },
  summaryCard:  { marginTop: 20, backgroundColor: 'rgba(0,196,180,0.05)', borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: 'rgba(0,196,180,0.2)' },
  summaryTitle: { color: THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sansMedium, marginBottom: 12 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans },
  summaryValue: { fontSize: 12, fontFamily: THEME.fonts.sansMedium },
  bottomWrap:      { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  hint:            { color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sans, textAlign: 'center', marginBottom: 10, lineHeight: 16 },
  nextBtn:         { backgroundColor: THEME.colors.teal, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: THEME.colors.teal, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  nextBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.1)', shadowOpacity: 0, elevation: 0 },
  nextBtnText:     { color: '#000', fontSize: 15, fontFamily: THEME.fonts.sansMedium },
});
