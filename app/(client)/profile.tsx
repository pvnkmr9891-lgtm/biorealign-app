import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { File as FSFile } from 'expo-file-system';
import { useAuth } from '@/hooks/useAuth';
import { useClientAssessment } from '@/hooks/useClientAssessment';
import { useUpdateProfile } from '@/hooks/useClient';
import { useClientEnrollments, PROGRAM_CATALOGUE } from '@/hooks/usePrograms';
import { PROGRAMS } from '@/constants/programs';
import { PROGRAMS_ENABLED, COACH_REQUEST_ENABLED } from '@/constants/featureFlags';
import { useMyCoachStatus, useCoachProfile } from '@/hooks/useCoachDirectory';
import { useMyDetailedAssessment, useSaveAssessmentStage, AssessmentStageKey } from '@/hooks/useDetailedAssessment';
import { DETAILED_ASSESSMENT_STAGES } from '@/constants/detailedAssessmentQuestions';
import { INTENSITY_META, TYPE_META } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { THEME } from '@/constants/theme';
import {
  DetailedStageEditor, ProfileOverviewCard,
} from '@/components/profile/ClientProfileView';

// ── Assessment completion % helper ────────────────────────────────────────────
// Helper: read a value from new answers JSONB or fall back to old flat columns
function aVal(a: any, newKey: string, oldKey?: string) {
  return a?.answers?.[newKey] ?? (oldKey ? a?.[oldKey] : undefined);
}

function assessmentCompletionPct(a: any): number {
  if (!a) return 0;
  // New flat-answers format: check key core questions answered
  if (a.answers && typeof a.answers === 'object') {
    const coreKeys = ['CORE-Q3', 'CORE-Q4', 'CORE-Q5', 'CORE-Q9', 'CORE-Q12', 'CORE-Q13'];
    const filled = coreKeys.filter(k => {
      const v = a.answers[k];
      return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
    });
    // Bonus points for any program-specific answers
    const programKeys = Object.keys(a.answers).filter(k => !k.startsWith('CORE-'));
    const total = coreKeys.length + Math.min(programKeys.length, 4);
    return Math.round(((filled.length + Math.min(programKeys.length, 4)) / total) * 100);
  }
  // Legacy: old stage columns
  const checks = [
    !!a.occupation_type,
    a.height_cm > 0,
    !!a.last_exercise_period,
    !!a.diet_type,
    !!a.primary_goal,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// ── Baseline Photos Card ──────────────────────────────────────────────────────
function BaselinePhotosCard({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { data: photosRaw = [], isLoading } = useQuery({
    queryKey: ['baseline_photos', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('client_id', clientId)
        .eq('week_number', 0);
      if (error) throw error;
      return data ?? [];
    },
  });

  const photos: Record<string, string> = {};
  for (const row of photosRaw as any[]) {
    if (row.storage_path) {
      const { data } = supabase.storage.from('progress-photos').getPublicUrl(row.storage_path);
      photos[row.photo_type] = data.publicUrl;
    }
  }

  const slots = ['front', 'side', 'back'];
  const hasAny = slots.some(s => photos[s]);

  if (isLoading) return null;

  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, marginTop: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
          📸 Baseline Photos
        </Text>
        <TouchableOpacity onPress={() => router.push('/onboarding/photos' as any)} activeOpacity={0.7}>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
            {hasAny ? 'Update' : 'Add photos'}
          </Text>
        </TouchableOpacity>
      </View>

      {hasAny ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {slots.map(slot => (
            <View key={slot} style={{ flex: 1, aspectRatio: 0.75, borderRadius: 10, backgroundColor: '#1A1A1E', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              {photos[slot] ? (
                <Image source={{ uri: photos[slot] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 20 }}>{slot === 'front' ? '🧍' : slot === 'side' ? '🚶' : '🪞'}</Text>
              )}
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: '#fff', textAlign: 'center', textTransform: 'capitalize' }}>{slot}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ backgroundColor: `${THEME.colors.amber}10`, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: `${THEME.colors.amber}25` }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber, marginBottom: 6 }}>
            No baseline photos yet
          </Text>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 18, marginBottom: 12 }}>
            Adding front, side, and back photos helps your coach track your progress over time.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/onboarding/photos' as any)}
            style={{ backgroundColor: THEME.colors.teal, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: '#000' }}>Add Baseline Photos →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Assessment Summary Card ───────────────────────────────────────────────────
function AssessmentSummaryCard({ clientId }: { clientId: string }) {
  const { data: assessment, isLoading } = useClientAssessment(clientId);
  const router = useRouter();

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 12 }} />;

  const pct = assessmentCompletionPct(assessment);

  if (!assessment) {
    return (
      <View style={{ gap: 12 }}>
        <View style={{ backgroundColor: `${THEME.colors.amber}10`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.amber}25` }}>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber, marginBottom: 4 }}>
            📋 Assessment not started
          </Text>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 20, marginBottom: 12 }}>
            Complete your onboarding assessment so your coach can build a personalised plan for you.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/onboarding/assessment' as any)}
            style={{ backgroundColor: THEME.colors.teal, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: '#000' }}>Start Assessment →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {/* Completion banner if not fully done */}
      {pct < 100 && (
        <View style={{ backgroundColor: `${THEME.colors.amber}10`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.amber}25` }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>
              Assessment {pct}% complete
            </Text>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
              Finish to unlock full coaching
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
            <View style={{ height: '100%', width: `${pct}%`, backgroundColor: THEME.colors.amber, borderRadius: 2 }} />
          </View>
          <TouchableOpacity
            onPress={() => router.push('/onboarding/assessment' as any)}
            style={{ backgroundColor: THEME.colors.amber, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: '#000' }}>Continue Assessment →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Summary card */}
      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Assessment Summary</Text>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
            {new Date(assessment.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {(() => {
            const energy = aVal(assessment, 'CORE-Q12', 'energy_morning');
            const sleep  = aVal(assessment, 'CORE-Q13', 'sleep_hours_avg');
            const stress = aVal(assessment, 'MRS-P2-Q7', 'stress_level');
            return [
              { label: 'Energy', value: energy ? `${energy}/10` : '—', color: '#34D399' },
              { label: 'Sleep',  value: sleep  ? `${sleep}h`   : '—', color: THEME.colors.teal },
              { label: 'Stress', value: stress ? `${stress}/10`: '—', color: Number(stress) >= 7 ? '#F87171' : THEME.colors.amber },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: '#1A1A1E', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: s.color }}>{s.value}</Text>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{s.label}</Text>
              </View>
            ));
          })()}
        </View>

        {(() => {
          // New: program-specific goals; Old: primary_goal column
          const goals = aVal(assessment, 'PRP-P3-Q1') ?? aVal(assessment, 'MRS-P3-Q3') ??
                        aVal(assessment, 'CPR-P3-Q1') ?? aVal(assessment, 'PPL-P3-Q3') ??
                        aVal(assessment, 'LVE-P3-Q1') ?? aVal(assessment, 'RRS-P3-Q1') ??
                        assessment?.primary_goal;
          if (!goals) return null;
          const goalArr = Array.isArray(goals) ? goals : [goals];
          return (
            <View style={{ backgroundColor: `${THEME.colors.teal}10`, borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 0.5, borderColor: `${THEME.colors.teal}20` }}>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, marginBottom: 6 }}>Goals</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {goalArr.map((g: string) => (
                  <Text key={g} style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, textTransform: 'capitalize' }}>
                    • {g.replace(/_/g, ' ')}
                  </Text>
                ))}
              </View>
            </View>
          );
        })()}

        {(() => {
          // New: pain locations from PRP/RRS; Old: complaints array
          const pain = aVal(assessment, 'PRP-P1-Q1') ?? aVal(assessment, 'RRS-P2-Q1') ?? assessment?.complaints;
          const items: string[] = Array.isArray(pain) ? pain : pain ? [pain] : [];
          if (items.length === 0) return null;
          return (
            <View>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Reported concerns</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {items.map((c: string) => (
                  <View key={c} style={{ backgroundColor: '#F8717115', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 0.5, borderColor: '#F8717130' }}>
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: '#F87171', textTransform: 'capitalize' }}>{c.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}
      </View>
    </View>
  );
}

// ── Small local display primitives (mirrors ClientProfileView's Row,
// kept local here since it isn't exported — it's a trivial wrapper). ──
function PRow({ label, value }: { label: string; value: any }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, textTransform: 'capitalize', textAlign: 'right', flex: 1 }}>{value ?? '—'}</Text>
    </View>
  );
}

function PFieldValue({ label, value, color }: { label: string; value: any; color: string }) {
  const v = value == null || value === '' ? null : Array.isArray(value) ? (value.length ? value : null) : value;
  if (v == null) return <PRow label={label} value={null} />;
  if (Array.isArray(v)) {
    return (
      <View style={{ paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 6 }}>{label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {v.map((item: string) => (
            <View key={item} style={{ backgroundColor: `${color}18`, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
              <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color }}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  return <PRow label={label} value={v} />;
}

function PEmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 56, paddingHorizontal: 8 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 30 }}>{icon}</Text>
      </View>
      <Text style={{ fontSize: 17, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, textAlign: 'center' }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>{subtitle}</Text>}
    </View>
  );
}

// ── My Detailed Assessment tab — self-scoped adaptation of ClientProfileView's
// AssessmentTab. No "Mark as Reviewed" (coach/admin-only action). Uses the
// client's own self-service save mutation (useSaveAssessmentStage) rather than
// the coach-scoped useUpdateDetailedAssessmentStage, and preserves the row's
// existing current_stage so editing an already-submitted assessment doesn't
// reset/advance the client's onboarding stage pointer.
function MyDetailedAssessmentTab({ profile }: { profile: any }) {
  const { data: assessment, isLoading } = useMyDetailedAssessment();
  const { mutateAsync: saveStage, isPending: isSavingStage } = useSaveAssessmentStage();
  const [openStage, setOpenStage] = useState<string | null>(DETAILED_ASSESSMENT_STAGES[0]?.key ?? null);
  const [editingStage, setEditingStage] = useState<string | null>(null);

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 40 }} />;

  if (!assessment) {
    return (
      <PEmptyState
        icon="📝"
        title="No Detailed Assessment yet"
        subtitle="Once you request a coach and they approve you, your Detailed Assessment will appear here."
      />
    );
  }

  if (assessment.status === 'in_progress') {
    return (
      <PEmptyState
        icon="📝"
        title="Not submitted yet"
        subtitle={`You haven't finished your Detailed Assessment yet (currently on stage ${assessment.current_stage ?? 1}).`}
      />
    );
  }

  const isReviewed = assessment.status === 'reviewed';
  const isAthlete = !!(assessment as any).is_athlete;
  const stages = DETAILED_ASSESSMENT_STAGES.filter((s) => !s.athleteOnly || isAthlete);

  const handleSaveStage = async (stageKey: AssessmentStageKey, data: Record<string, any>) => {
    // Preserve the assessment's own current_stage unchanged — this is an edit
    // of an already-submitted assessment, not onboarding progression.
    await saveStage({ stageKey, data, nextStage: assessment.current_stage ?? DETAILED_ASSESSMENT_STAGES.length });
  };

  return (
    <View>
      <View style={{ backgroundColor: isReviewed ? `${THEME.colors.success ?? '#4CC986'}15` : `${THEME.colors.amber}15`, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: isReviewed ? `${THEME.colors.success ?? '#4CC986'}30` : `${THEME.colors.amber}30`, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 20 }}>{isReviewed ? '✅' : '🔔'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: isReviewed ? (THEME.colors.success ?? '#4CC986') : THEME.colors.amber }}>
            {isReviewed ? 'Reviewed by your coach' : 'Submitted — awaiting review'}
          </Text>
          {assessment.submitted_at && (
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
              {new Date(assessment.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          )}
        </View>
      </View>

      {stages.map((stage, i) => {
        const data = (assessment as any)[stage.key] ?? {};
        const isOpen = openStage === stage.key;
        const isEditingThis = editingStage === stage.key;
        const stageColors = ['#00C4B4', '#F59E0B', '#60A5FA', '#C084FC', '#4CC986'];
        const color = stageColors[i % stageColors.length];

        return (
          <View key={stage.key} style={{ marginBottom: 10, backgroundColor: THEME.colors.surface2, borderRadius: 14, borderWidth: 0.5, borderColor: THEME.colors.border, overflow: 'hidden' }}>
            <TouchableOpacity
              onPress={() => setOpenStage(isOpen ? null : stage.key)}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 15 }}>{stage.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{stage.title}</Text>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{stage.subtitle}</Text>
              </View>
              <Text style={{ color: THEME.colors.textMuted, fontSize: 16, transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>›</Text>
            </TouchableOpacity>

            {isOpen && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
                {isEditingThis ? (
                  <DetailedStageEditor
                    stage={stage}
                    data={data}
                    color={color}
                    onDone={() => setEditingStage(null)}
                    onSave={handleSaveStage}
                    saving={isSavingStage}
                  />
                ) : (
                  <>
                    {stage.fields.map((field) => {
                      const value = field.crossTableProfileDiet
                        ? (profile?.diet_type === 'veg' ? 'Veg' : profile?.diet_type === 'non_veg' ? 'Non-Veg' : null)
                        : data[field.key];
                      return <PFieldValue key={field.key} label={field.label} value={value} color={color} />;
                    })}
                    <TouchableOpacity
                      onPress={() => setEditingStage(stage.key)}
                      style={{ alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: `${color}18` }}
                    >
                      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color }}>✏️ Edit</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function calcChildAge(dob: string | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const hadBday = today.getMonth() > d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() >= d.getDate());
  if (!hadBday) age--;
  return age;
}

// ── Coach Status Card ──────────────────────────────────────────────────────
function CoachStatusCard() {
  const router = useRouter();
  const { data: status, isLoading } = useMyCoachStatus();
  const coachId = status?.state === 'assigned' ? status.coachId : status?.state === 'pending' ? status.request.coach_id : null;
  const { data: coach } = useCoachProfile(coachId ?? '');
  const { data: assessment } = useMyDetailedAssessment();

  if (isLoading) return null;

  if (!status || status.state === 'none') {
    return (
      <TouchableOpacity
        onPress={() => router.push('/(client)/coach-list' as any)}
        activeOpacity={0.85}
        style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}
      >
        <Text style={{ fontSize: 24 }}>🧑‍🏫</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Need a Coach?</Text>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
            Get a real coach to guide your plan
          </Text>
        </View>
        <Text style={{ color: THEME.colors.textMuted, fontSize: 18 }}>›</Text>
      </TouchableOpacity>
    );
  }

  if (status.state === 'pending') {
    return (
      <View style={{ backgroundColor: `${THEME.colors.amber}10`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.amber}30`, marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>⏳ Waiting for {coach?.full_name ?? 'coach'} to approve</Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4 }}>
          You requested this coach on {new Date(status.request.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.
        </Text>
      </View>
    );
  }

  // assigned
  const assessmentCta = !assessment || assessment.status === 'in_progress'
    ? { label: assessment?.current_stage && assessment.current_stage > 1 ? 'Continue Detailed Assessment' : 'Start Detailed Assessment', enabled: true }
    : assessment.status === 'submitted'
    ? { label: 'Assessment submitted — awaiting review', enabled: false }
    : { label: 'Assessment reviewed by your coach', enabled: false };

  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${THEME.colors.teal}20`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
            {coach?.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{coach?.full_name}</Text>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>Your coach</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => assessmentCta.enabled && router.push('/(client)/detailed-assessment' as any)}
        disabled={!assessmentCta.enabled}
        activeOpacity={0.85}
        style={{ backgroundColor: assessmentCta.enabled ? THEME.colors.teal : THEME.colors.surface3, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
      >
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: assessmentCta.enabled ? THEME.colors.background : THEME.colors.textMuted }}>
          {assessmentCta.label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Enrollment Card ───────────────────────────────────────────────────────────
function EnrollmentCard() {
  const { data: enrollments = [], isLoading } = useClientEnrollments();
  const profile = useAuthStore(s => s.profile);
  const userId = useAuthStore(s => s.user)?.id ?? '';
  const { data: assessment } = useClientAssessment(userId);
  const isFBR = (profile as any)?.workout_program_id === 'total_transformation' || (profile as any)?.workout_program_id === 'FBR';
  const childDob: string | undefined = isFBR ? assessment?.answers?.['FBR-P1-Q4'] : undefined;
  const childAge = calcChildAge(childDob);

  if (isLoading) return <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 16 }} />;

  // If there are formal enrollments in the DB, show them
  if ((enrollments as any[]).length > 0) {
    return (
      <View style={{ gap: 10 }}>
        {(enrollments as any[]).map((enroll: any) => {
          const cat = PROGRAM_CATALOGUE.find(p => p.name === enroll.program?.name);
          const color = cat?.color ?? THEME.colors.teal;
          const totalWeeks = enroll.program?.duration_weeks ?? cat?.weeks ?? 1;
          const pct = Math.round((enroll.current_week / totalWeeks) * 100);
          return (
            <View key={enroll.id} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <View style={{ height: 3, backgroundColor: color }} />
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${color}20`, borderWidth: 1, borderColor: `${color}30`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{cat?.icon ?? '📋'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{enroll.program?.name}</Text>
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{cat?.tagline ?? ''}</Text>
                  </View>
                  <View style={{ backgroundColor: `${THEME.colors.teal}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Active</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 20, marginBottom: 12 }}>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Week</Text>
                    <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: color, marginTop: 2 }}>{enroll.current_week}<Text style={{ fontSize: 12, color: THEME.colors.textMuted }}> / {totalWeeks}</Text></Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Started</Text>
                    <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, marginTop: 2 }}>
                      {new Date(enroll.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Progress</Text>
                    <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: color, marginTop: 2 }}>{pct}%</Text>
                  </View>
                </View>
                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 2 }} />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // Fallback: read directly from profile.workout_program_id (set during onboarding)
  const rawId     = profile?.workout_program_id ?? '';
  const normId    = rawId === '3-PRP' ? 'postural_realignment' : rawId;
  const prog      = PROGRAMS.find(p => p.id === normId);
  const cat       = prog ? PROGRAM_CATALOGUE.find(p => p.name === prog.name) : null;
  const color     = cat?.color ?? prog?.color ?? THEME.colors.teal;

  const intensityKey = (profile?.workout_intensity ?? '') as keyof typeof INTENSITY_META;
  const trainingKey  = (profile?.workout_training_type ?? '') as keyof typeof TYPE_META;
  const intensityMeta = INTENSITY_META[intensityKey];
  const trainingMeta  = TYPE_META[trainingKey];

  if (!prog) {
    return (
      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 24 }}>📋</Text>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, textAlign: 'center' }}>
          No program assigned yet
        </Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
          Complete your onboarding or contact your coach to get enrolled.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {/* Program card */}
      <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5, borderColor: THEME.colors.border }}>
        <View style={{ height: 3, backgroundColor: color }} />
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 }}>
            ✦ Currently enrolled
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: `${color}20`, borderWidth: 1, borderColor: `${color}30`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 26 }}>{cat?.icon ?? prog.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{prog.name}</Text>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>{cat?.tagline ?? prog.tagline}</Text>
            </View>
          </View>

          {/* Intensity / environment pills */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {intensityMeta && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${intensityMeta.color}15`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: `${intensityMeta.color}40` }}>
                <Text style={{ fontSize: 13 }}>{intensityMeta.icon}</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: intensityMeta.color }}>{intensityMeta.label}</Text>
              </View>
            )}
            {trainingMeta && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)' }}>
                <Text style={{ fontSize: 13 }}>{trainingMeta.icon}</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>{trainingMeta.label}</Text>
              </View>
            )}
            {intensityMeta && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)' }}>
                <Text style={{ fontSize: 13 }}>📅</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>{intensityMeta.weeks} weeks</Text>
              </View>
            )}
            {childAge !== null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#A78BFA18', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: '#A78BFA40' }}>
                <Text style={{ fontSize: 13 }}>🎂</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: '#A78BFA' }}>Age {childAge}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Outcomes */}
      {cat?.outcomes?.length ? (
        <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>What you'll achieve</Text>
          <View style={{ gap: 8 }}>
            {cat.outcomes.map((o, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginTop: 6 }} />
                <Text style={{ flex: 1, fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, lineHeight: 20 }}>{o}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Benefits from PROGRAMS constant */}
      {prog.benefits?.length ? (
        <View style={{ backgroundColor: `${color}10`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${color}25` }}>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Key benefits</Text>
          <View style={{ gap: 8 }}>
            {prog.benefits.map((b, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text style={{ color, fontSize: 12, marginTop: 1 }}>✓</Text>
                <Text style={{ flex: 1, fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, lineHeight: 20 }}>{b}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── Mood Status Modal ─────────────────────────────────────────────────────────
const MOOD_SUGGESTIONS = [
  '😊 Feeling great',
  '💪 Crushing it today',
  '😴 Resting up',
  '🎯 Locked in & focused',
  '🤕 Recovering',
  '🌱 New week, new me',
];

function MoodStatusModal({ visible, initialValue, onClose, onSave, saving }: {
  visible: boolean; initialValue: string; onClose: () => void;
  onSave: (text: string) => void; saving: boolean;
}) {
  const [text, setText] = useState(initialValue);

  useEffect(() => {
    if (visible) setText(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: THEME.colors.surface2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
          <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 6 }}>Set your status</Text>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 16 }}>
            Visible to your coach — a quick way to share how you're feeling.
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="What's on your mind?"
            placeholderTextColor={THEME.colors.textMuted}
            maxLength={60}
            style={{ backgroundColor: THEME.colors.surface3 ?? '#1A1A1E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 14 }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
            {MOOD_SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setText(s)}
                activeOpacity={0.7}
                style={{ backgroundColor: `${THEME.colors.teal}15`, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}
              >
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {initialValue.length > 0 && (
              <TouchableOpacity
                onPress={() => onSave('')}
                disabled={saving}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: THEME.colors.surface3 ?? '#1A1A1E', borderWidth: 0.5, borderColor: THEME.colors.border }}
              >
                <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} disabled={saving} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: THEME.colors.surface3 ?? '#1A1A1E', borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSave(text.trim())} disabled={saving} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: THEME.colors.teal }}>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Info tile grid ───────────────────────────────────────────────────────
function InfoTile({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={{ width: '48%', backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border }}>
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 14 }}>{icon}</Text>
      </View>
      <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 3 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ── Main Profile Screen ───────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { profile, signOut, user } = useAuth();
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'detailedAssessment' | 'assessment' | 'enrollments'>('overview');

  const initials = profile?.full_name
    ?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';

  const { mutateAsync: updateProfile, isPending: isSavingMood } = useUpdateProfile();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleSaveMood = async (text: string) => {
    try {
      await updateProfile({ data: { mood_status: text || null, mood_status_updated_at: new Date().toISOString() } });
      setShowMoodModal(false);
    } catch {
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user?.id) return;
    setUploadingAvatar(true);
    try {
      // RN's fetch().blob() upload to Supabase Storage is unreliable on
      // Android (silently sends a malformed/truncated body → 400) — read
      // the local file's bytes directly via expo-file-system instead.
      const bytes = await new FSFile(uri).bytes();
      const ext = uri.split('.').pop()?.split('?')[0] ?? 'jpg';
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, bytes, { contentType: `image/${ext}` });
      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile({ data: { avatar_url: data.publicUrl } });
    } catch (err) {
      console.error('Avatar upload error:', err);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarPress = () => {
    const options: any[] = [
      {
        text: 'Take Photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert('Permission needed', 'Please allow camera access to take a photo.'); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
          if (!result.canceled) uploadAvatar(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert('Permission needed', 'Please allow photo access to choose a photo.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
          if (!result.canceled) uploadAvatar(result.assets[0].uri);
        },
      },
    ];
    if (profile?.avatar_url) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: () => updateProfile({ data: { avatar_url: null } }),
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Profile Photo', undefined, options);
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '—';
  const dobDisplay = profile?.dob
    ? new Date(profile.dob + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const genderDisplay = profile?.gender
    ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
    : '—';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24 }}>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85} disabled={uploadingAvatar} style={{ marginBottom: 14 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: `${THEME.colors.teal}20`, borderWidth: 2, borderColor: `${THEME.colors.teal}40`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {uploadingAvatar ? (
                <ActivityIndicator color={THEME.colors.teal} />
              ) : profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 30, fontFamily: THEME.fonts.serif, color: THEME.colors.teal }}>{initials}</Text>
              )}
            </View>
            <View style={{ position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: THEME.colors.teal, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: THEME.colors.background }}>
              <Text style={{ fontSize: 12 }}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={{ fontSize: 24, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 8 }}>
            {profile?.full_name}
          </Text>

          <TouchableOpacity
            onPress={() => setShowMoodModal(true)}
            activeOpacity={0.7}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${THEME.colors.teal}12`, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, maxWidth: '90%', borderWidth: 0.5, borderColor: `${THEME.colors.teal}25` }}
          >
            <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: profile?.mood_status ? THEME.colors.textSecondary : THEME.colors.teal }} numberOfLines={1}>
              {profile?.mood_status || '+ Add a status'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main info */}
        <View style={{ marginHorizontal: 24, marginBottom: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <InfoTile icon="📞" label="Phone" value={profile?.phone ?? '—'} color={THEME.colors.teal} />
          <InfoTile icon="⚧" label="Gender" value={genderDisplay} color="#A78BFA" />
          <InfoTile icon="🎂" label="Date of Birth" value={dobDisplay} color={THEME.colors.amber} />
          <InfoTile icon="✉️" label="Email" value={user?.email ?? '—'} color="#60A5FA" />
          <InfoTile icon="🗓️" label="Member Since" value={memberSince} color="#34D399" />
        </View>

        {/* Section tabs */}
        <View style={{ flexDirection: 'row', marginHorizontal: 24, marginBottom: 20, backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 4, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          {[
            { key: 'overview',           label: 'Overview' },
            { key: 'detailedAssessment', label: 'Detailed Assessment' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveSection(tab.key as any)}
              style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10, backgroundColor: activeSection === tab.key ? THEME.colors.teal : 'transparent' }}
            >
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: activeSection === tab.key ? THEME.colors.background : THEME.colors.textMuted }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <View style={{ paddingHorizontal: 24 }}>

          {/* Overview tab */}
          {activeSection === 'overview' && (
            <View style={{ gap: 12 }}>
              {COACH_REQUEST_ENABLED && <CoachStatusCard />}

              {user?.id && <ProfileOverviewCard clientId={user.id} profile={profile} color={THEME.colors.teal} />}
            </View>
          )}

          {/* Detailed Assessment tab */}
          {activeSection === 'detailedAssessment' && (
            <MyDetailedAssessmentTab profile={profile} />
          )}

          {/* Old gated Assessment tab — dead while PROGRAMS_ENABLED is false,
              no longer reachable from the tab bar above either way. */}
          {PROGRAMS_ENABLED && activeSection === 'assessment' && user?.id && (
            <>
              <AssessmentSummaryCard clientId={user.id} />
              <BaselinePhotosCard clientId={user.id} />
            </>
          )}

          {/* Old Enrollments/Programs tab — dead while PROGRAMS_ENABLED is
              false, no longer reachable from the tab bar above either way. */}
          {PROGRAMS_ENABLED && activeSection === 'enrollments' && (
            <EnrollmentCard />
          )}
        </View>

        {/* Sign out */}
        <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.85}
            style={{ backgroundColor: '#F8717115', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F8717130' }}
          >
            <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: '#F87171' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <MoodStatusModal
        visible={showMoodModal}
        initialValue={profile?.mood_status ?? ''}
        onClose={() => setShowMoodModal(false)}
        onSave={handleSaveMood}
        saving={isSavingMood}
      />
    </SafeAreaView>
  );
}
