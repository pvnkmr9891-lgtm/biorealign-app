import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useClientProfile, useClientBodyMetrics } from '@/hooks/useCoachClientOverview';
import { useClientDetailedAssessment } from '@/hooks/useDetailedAssessment';
import { useAuth } from '@/hooks/useAuth';
import {
  useSubmitFitnessAssessment, useClientFitnessAssessments, EnduranceProtocol,
  calculateDomainScore, calculateTwoPartDomainScore, FitnessDomain, ScoreStatus,
} from '@/hooks/useFitnessAssessment';
import { useClientTrainingLoadScores } from '@/hooks/useTrainingLoad';
import { scoreBand } from '@/components/ui/DomainRadarChart';
import { DateField } from '@/components/ui/DateField';
import { THEME } from '@/constants/theme';
import { sanitizeInteger, sanitizeDecimal, sanitizeSignedDecimal, isWithinRange, NUMERIC_RANGES, MAX_LENGTHS } from '@/utils/validation';

// Recommended minimum gap between assessments — a soft floor, not a hard
// rule: real-world scheduling doesn't always land exactly on 4 weeks, so the
// coach sees a warning but can proceed regardless.
const MIN_ASSESSMENT_GAP_DAYS = 28;

const DOMAIN_META: Record<FitnessDomain, { label: string; icon: string; color: string }> = {
  strength:    { label: 'Strength',    icon: '💪', color: '#8b78e8' },
  flexibility: { label: 'Flexibility', icon: '🤸', color: THEME.colors.amber },
  endurance:   { label: 'Endurance',   icon: '🫁', color: '#60A5FA' },
  agility:     { label: 'Agility',     icon: '🏃', color: THEME.colors.success ?? '#4CC986' },
};

function daysAgoLabel(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days < 14) return `${days}d ago`;
  return `${Math.round(days / 7)}wk ago`;
}

// 30-day average of a self-relative training-load score (50 = typical day) —
// a rough "how active have they been" signal, not a clinical measure.
function avgRecentScore(scores: { date: string; strengthScore: number | null; cardioScore: number | null }[] | undefined, key: 'strengthScore' | 'cardioScore'): number | null {
  if (!scores?.length) return null;
  const recent = scores.slice(-30).map((s) => s[key]).filter((v): v is number => v != null);
  if (!recent.length) return null;
  return Math.round(recent.reduce((s, v) => s + v, 0) / recent.length);
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob + 'T00:00:00');
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear = now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age--;
  return age;
}

// Normalizes whatever free-text value lives in profiles.gender into the
// male/female constraint fitness_assessments.client_gender requires — the
// coach can override at entry time if it doesn't map cleanly.
function normalizeGender(g: string | null): 'male' | 'female' | null {
  if (!g) return null;
  const v = g.toLowerCase();
  if (v.startsWith('m')) return 'male';
  if (v.startsWith('f')) return 'female';
  return null;
}

function FieldLabel({ children }: { children: string }) {
  return <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>{children}</Text>;
}

function NumberInput({ value, onChangeText, placeholder, allowDecimal = true, allowNegative = false, testID }: {
  value: string; onChangeText: (v: string) => void; placeholder?: string; allowDecimal?: boolean; allowNegative?: boolean; testID?: string;
}) {
  const sanitize = allowNegative ? sanitizeSignedDecimal : allowDecimal ? sanitizeDecimal : sanitizeInteger;
  return (
    <TextInput
      testID={testID}
      value={value}
      onChangeText={(v) => onChangeText(sanitize(v))}
      placeholder={placeholder}
      placeholderTextColor={THEME.colors.textMuted}
      keyboardType={allowNegative ? 'numbers-and-punctuation' : 'numeric'}
      maxLength={7}
      style={{
        backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
        color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border,
      }}
    />
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 14, borderLeftWidth: accent ? 3 : 0.5, borderLeftColor: accent ?? THEME.colors.border }}>
      {children}
    </View>
  );
}

function SectionHeader({ icon, title, color }: { icon: string; title: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13 }}>{icon}</Text>
      </View>
      <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{title}</Text>
    </View>
  );
}

// Shows "▲2 vs 8wk ago" once the coach types a value, comparing against the
// client's own prior result — validation feedback, not a submitted value.
function DeltaLine({ current, last, ago, higherIsBetter = true }: { current: string; last: number | null | undefined; ago?: string; higherIsBetter?: boolean }) {
  const cur = parseFloat(current);
  if (last == null || isNaN(cur)) return null;
  const delta = Math.round((cur - last) * 10) / 10;
  if (delta === 0) return null;
  const isGood = higherIsBetter ? delta > 0 : delta < 0;
  return (
    <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color: isGood ? (THEME.colors.success ?? '#4CC986') : THEME.colors.amber, marginTop: 4 }}>
      {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} vs {ago ?? 'last time'}
    </Text>
  );
}

export default function FitnessAssessmentNewScreen() {
  const router = useRouter();
  const { clientId, clientName } = useLocalSearchParams<{ clientId: string; clientName: string }>();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useClientProfile(clientId);
  const { data: detailedAssessment } = useClientDetailedAssessment(clientId);
  const { data: pastAssessments } = useClientFitnessAssessments(clientId);
  const { data: bodyMetrics } = useClientBodyMetrics(clientId);
  const { data: trainingLoad } = useClientTrainingLoadScores(clientId);
  const { mutateAsync: submit, isPending } = useSubmitFitnessAssessment();

  // Most recent prior assessment — used to show "last time" reference
  // placeholders and validation deltas, never auto-submitted as new data.
  const lastAssessment = pastAssessments?.[0];
  const lastAgo = lastAssessment ? daysAgoLabel(lastAssessment.assessment_date) : null;
  const lastStrength   = lastAssessment?.results.find((r) => r.domain === 'strength');
  const lastFlexibility = lastAssessment?.results.find((r) => r.domain === 'flexibility');
  const lastEndurance  = lastAssessment?.results.find((r) => r.domain === 'endurance');
  const lastAgility    = lastAssessment?.results.find((r) => r.domain === 'agility');

  const latestWeight = bodyMetrics?.[0]?.weight_kg ?? null;
  const weightAgo = bodyMetrics?.[0] ? daysAgoLabel(bodyMetrics[0].recorded_date) : null;
  const avgCardio   = avgRecentScore(trainingLoad?.scores, 'cardioScore');
  const avgStrength = avgRecentScore(trainingLoad?.scores, 'strengthScore');

  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [genderTouched, setGenderTouched] = useState(false);

  const [chairStand, setChairStand] = useState('');
  const [armCurl, setArmCurl] = useState('');
  const [sitAndReach, setSitAndReach] = useState('');
  const [backScratch, setBackScratch] = useState('');
  const [pushUpReps, setPushUpReps] = useState('');
  const [sitAndReachCm, setSitAndReachCm] = useState('');
  const [enduranceProtocol, setEnduranceProtocol] = useState<EnduranceProtocol>('6-Minute Walk');
  const [enduranceProtocolTouched, setEnduranceProtocolTouched] = useState(false);
  const [enduranceValue, setEnduranceValue] = useState('');
  const [upAndGo, setUpAndGo] = useState('');
  const [notes, setNotes] = useState('');
  const [assessmentDate, setAssessmentDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Live, unsaved score preview — recomputed via the same normative-table
  // RPCs the save mutation itself calls, so what the coach reviews here is
  // exactly what gets stored, not a client-side approximation.
  const [preview, setPreview] = useState<Partial<Record<FitnessDomain, { score: number | null; status: ScoreStatus }>>>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  // Initialize age/gender from profile once loaded, without clobbering
  // anything the coach has already typed/overridden.
  const derivedAge = ageFromDob(profile?.dob ?? null);
  const derivedGender = normalizeGender(profile?.gender ?? null);
  if (!profileLoading && age === '' && derivedAge != null) setAge(String(derivedAge));
  if (!profileLoading && gender === null && !genderTouched && derivedGender != null) setGender(derivedGender);

  // Match the protocol used last time so the "last time" reference lines up
  // with the field the coach is about to fill — same don't-clobber pattern.
  if (!enduranceProtocolTouched && lastEndurance && enduranceProtocol !== lastEndurance.test_protocol_used) {
    setEnduranceProtocol(lastEndurance.test_protocol_used as EnduranceProtocol);
  }

  const isAthlete = detailedAssessment?.is_athlete ?? null;

  const daysSinceLast = lastAssessment
    ? Math.floor((new Date(assessmentDate + 'T00:00:00').getTime() - new Date(lastAssessment.assessment_date + 'T00:00:00').getTime()) / 86400000)
    : null;
  const tooSoon = daysSinceLast != null && daysSinceLast >= 0 && daysSinceLast < MIN_ASSESSMENT_GAP_DAYS;

  const ageNumForPreview = Number(age);
  const canPreview = !!gender && ageNumForPreview > 0;
  // Chair Stand/Arm Curl/Chair Sit-and-Reach/Back Scratch have no rigorous
  // published norms below 60 (verified via research) — under 60, Strength
  // and Flexibility switch to a genuinely different, separately-sourced
  // test (Push-Up Test; standard cm Sit-and-Reach). Endurance and Agility
  // stay senior-only for now — see the banner on those cards.
  const useAdultProtocol = ageNumForPreview > 0 && ageNumForPreview < 60;

  // Debounced live scoring — waits for a pause in typing, then re-scores
  // every domain that has enough raw input, in parallel. Matches the exact
  // RPC calls the save mutation makes (population left at its 'general'
  // default, same as the save path), so this is a true preview, not a guess.
  useEffect(() => {
    if (!canPreview) { setPreview({}); return; }
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const results = await Promise.all([
          useAdultProtocol
            ? (pushUpReps
                ? calculateDomainScore({
                    domain: 'strength', testProtocol: 'Push-Up Test', rawResult: Number(pushUpReps),
                    clientAge: ageNumForPreview, clientGender: gender!,
                  }).then((r) => ['strength', r] as const)
                : null)
            : (chairStand && armCurl
                ? calculateTwoPartDomainScore({
                    domain: 'strength', testProtocolPrimary: 'Chair Stand', rawResultPrimary: Number(chairStand),
                    testProtocolSecondary: 'Arm Curl', rawResultSecondary: Number(armCurl),
                    clientAge: ageNumForPreview, clientGender: gender!,
                  }).then((r) => ['strength', r] as const)
                : null),
          useAdultProtocol
            ? (sitAndReachCm
                ? calculateDomainScore({
                    domain: 'flexibility', testProtocol: 'Sit-and-Reach (Standard)', rawResult: Number(sitAndReachCm),
                    clientAge: ageNumForPreview, clientGender: gender!,
                  }).then((r) => ['flexibility', r] as const)
                : null)
            : (sitAndReach && backScratch
                ? calculateTwoPartDomainScore({
                    domain: 'flexibility', testProtocolPrimary: 'Chair Sit-and-Reach', rawResultPrimary: Number(sitAndReach),
                    testProtocolSecondary: 'Back Scratch', rawResultSecondary: Number(backScratch),
                    clientAge: ageNumForPreview, clientGender: gender!,
                  }).then((r) => ['flexibility', r] as const)
                : null),
          enduranceValue
            ? calculateDomainScore({
                domain: 'endurance', testProtocol: enduranceProtocol, rawResult: Number(enduranceValue),
                clientAge: ageNumForPreview, clientGender: gender!,
              }).then((r) => ['endurance', r] as const)
            : null,
          upAndGo
            ? calculateDomainScore({
                domain: 'agility', testProtocol: '8-Foot Up-and-Go', rawResult: Number(upAndGo),
                clientAge: ageNumForPreview, clientGender: gender!,
              }).then((r) => ['agility', r] as const)
            : null,
        ]);
        setPreview((prev) => {
          const next = { ...prev };
          for (const r of results) {
            if (!r) continue;
            const [domain, score] = r;
            next[domain] = { score: score.domainScore, status: score.scoreStatus };
          }
          return next;
        });
      } catch {
        // Non-fatal — this is a preview only; the save mutation independently
        // recomputes and will surface a real error if something's actually wrong.
      } finally {
        setPreviewLoading(false);
      }
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPreview, useAdultProtocol, ageNumForPreview, gender, chairStand, armCurl, sitAndReach, backScratch, pushUpReps, sitAndReachCm, enduranceProtocol, enduranceValue, upAndGo]);

  if (profileLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const ageNum = Number(age);
  const canSubmit = !!gender && ageNum > 0 && !isPending;

  const onSubmit = async () => {
    if (!gender || !ageNum) {
      Alert.alert('Missing info', 'Please confirm the client\'s age and gender before submitting.');
      return;
    }
    if (!isWithinRange(ageNum, NUMERIC_RANGES.age)) {
      Alert.alert('Invalid age', `Age must be between ${NUMERIC_RANGES.age.min} and ${NUMERIC_RANGES.age.max}.`);
      return;
    }
    const domains: Parameters<typeof submit>[0]['domains'] = {};

    if (useAdultProtocol) {
      if (pushUpReps) {
        domains.strength = { protocol: 'adult', pushUpReps: Number(pushUpReps) };
      }
      if (sitAndReachCm) {
        domains.flexibility = { protocol: 'adult', sitAndReachCm: Number(sitAndReachCm) };
      }
    } else {
      if (chairStand && armCurl) {
        domains.strength = { protocol: 'senior', chairStandReps: Number(chairStand), armCurlReps: Number(armCurl) };
      }
      if (sitAndReach && backScratch) {
        domains.flexibility = { protocol: 'senior', sitAndReachInches: Number(sitAndReach), backScratchInches: Number(backScratch) };
      }
    }
    if (enduranceValue) {
      domains.endurance = { protocol: enduranceProtocol, value: Number(enduranceValue) };
    }
    if (upAndGo) {
      domains.agility = { upAndGoSeconds: Number(upAndGo) };
    }

    if (Object.keys(domains).length === 0) {
      Alert.alert('Nothing to save', 'Enter results for at least one domain before submitting.');
      return;
    }

    try {
      await submit({
        clientId,
        coachId: user!.id,
        assessmentDate,
        clientAge: ageNum,
        clientGender: gender,
        isAthlete,
        notes: notes || null,
        domains,
      });
      Alert.alert('Saved', 'Fitness assessment recorded.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save assessment.');
    }
  };

  return (
    <SafeAreaView testID="fitness-assessment-new-screen" style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>New Fitness Assessment</Text>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{clientName}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Card accent="#8b78e8">
          <SectionHeader icon="🗓️" title="Timeline" color="#8b78e8" />
          <FieldLabel>Assessment date</FieldLabel>
          <DateField value={assessmentDate} onChange={setAssessmentDate} accentColor="#8b78e8" />
          {lastAssessment && (
            <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 8 }}>
              Last assessment: {new Date(lastAssessment.assessment_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ({lastAgo})
            </Text>
          )}
          {tooSoon && (
            <View style={{ marginTop: 10, backgroundColor: `${THEME.colors.amber}12`, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: `${THEME.colors.amber}35`, flexDirection: 'row', gap: 8 }}>
              <Text style={{ fontSize: 14 }}>⚠️</Text>
              <Text style={{ flex: 1, fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.amber, lineHeight: 17 }}>
                Only {daysSinceLast}d since the last assessment — {MIN_ASSESSMENT_GAP_DAYS}d (4 weeks) is the recommended minimum gap for meaningful change. You can continue if this is intentional.
              </Text>
            </View>
          )}
        </Card>

        <Card accent={THEME.colors.teal}>
          <SectionHeader icon="🧍" title="Client Info" color={THEME.colors.teal} />
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
            <View style={{ flex: 1 }}>
              <FieldLabel>Age</FieldLabel>
              <NumberInput testID="assessment-age-input" value={age} onChangeText={setAge} placeholder="e.g. 67" allowDecimal={false} />
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Gender</FieldLabel>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['male', 'female'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    testID={`assessment-gender-${g}`}
                    onPress={() => { setGender(g); setGenderTouched(true); }}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: gender === g ? THEME.colors.teal : THEME.colors.surface3, borderWidth: 0.5, borderColor: gender === g ? THEME.colors.teal : THEME.colors.border }}
                  >
                    <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: gender === g ? THEME.colors.background : THEME.colors.textSecondary, textTransform: 'capitalize' }}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 4 }}>
            Athlete status: {isAthlete == null ? 'Unknown (no detailed assessment on file)' : isAthlete ? 'Athlete' : 'General population'} — read from the client's existing assessment, not editable here.
          </Text>
        </Card>

        {/* Context — reference info only, never fed into the test fields below.
            These come from activity logs and can't substitute for a physically
            administered test, but help the coach sanity-check direction. */}
        {(latestWeight != null || avgCardio != null || avgStrength != null || lastAgo) && (
          <Card>
            <SectionHeader icon="📊" title="Context" color={THEME.colors.textMuted} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {latestWeight != null && (
                <View style={{ flexBasis: '47%' }}>
                  <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Current weight</Text>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{latestWeight}kg <Text style={{ fontSize: 10, color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans }}>({weightAgo})</Text></Text>
                </View>
              )}
              {avgCardio != null && (
                <View style={{ flexBasis: '47%' }}>
                  <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Cardio load (30d avg)</Text>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{avgCardio}<Text style={{ fontSize: 10, color: THEME.colors.textMuted }}>/100</Text></Text>
                </View>
              )}
              {avgStrength != null && (
                <View style={{ flexBasis: '47%' }}>
                  <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Strength load (30d avg)</Text>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{avgStrength}<Text style={{ fontSize: 10, color: THEME.colors.textMuted }}>/100</Text></Text>
                </View>
              )}
              {lastAgo && (
                <View style={{ flexBasis: '47%' }}>
                  <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Last assessment</Text>
                  <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{lastAgo}</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        <Card accent="#8b78e8">
          <SectionHeader icon="💪" title="Strength" color="#8b78e8" />
          {useAdultProtocol ? (
            <>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 10 }}>
                Push-Up Test (max reps, good form) — ACSM/NSCA adult norms, ages 20-59
              </Text>
              <FieldLabel>Push-ups (reps)</FieldLabel>
              <NumberInput
                testID="assessment-pushup-input"
                value={pushUpReps} onChangeText={setPushUpReps} allowDecimal={false}
                placeholder={lastStrength?.test_protocol_used === 'Push-Up Test' ? `last time: ${lastStrength.raw_result_primary}` : 'e.g. 20'}
              />
              {lastStrength?.test_protocol_used === 'Push-Up Test' && (
                <DeltaLine current={pushUpReps} last={lastStrength.raw_result_primary} ago={lastAgo ?? undefined} />
              )}
            </>
          ) : (
            <>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 10 }}>Chair Stand + Arm Curl (30-second reps each)</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Chair Stand (reps)</FieldLabel>
                  <NumberInput testID="assessment-chair-stand-input" value={chairStand} onChangeText={setChairStand} placeholder={lastStrength?.test_protocol_used === 'Chair Stand + Arm Curl' ? `last time: ${lastStrength.raw_result_primary}` : 'e.g. 14'} allowDecimal={false} />
                  {lastStrength?.test_protocol_used === 'Chair Stand + Arm Curl' && (
                    <DeltaLine current={chairStand} last={lastStrength.raw_result_primary} ago={lastAgo ?? undefined} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Arm Curl (reps)</FieldLabel>
                  <NumberInput testID="assessment-arm-curl-input" value={armCurl} onChangeText={setArmCurl} placeholder={lastStrength?.test_protocol_used === 'Chair Stand + Arm Curl' && lastStrength.raw_result_secondary != null ? `last time: ${lastStrength.raw_result_secondary}` : 'e.g. 16'} allowDecimal={false} />
                  {lastStrength?.test_protocol_used === 'Chair Stand + Arm Curl' && (
                    <DeltaLine current={armCurl} last={lastStrength.raw_result_secondary} ago={lastAgo ?? undefined} />
                  )}
                </View>
              </View>
            </>
          )}
        </Card>

        <Card accent={THEME.colors.amber}>
          <SectionHeader icon="🤸" title="Flexibility" color={THEME.colors.amber} />
          {useAdultProtocol ? (
            <>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 10 }}>
                Sit-and-Reach, standard box-and-ruler, in cm — Canadian Health Measures Survey norms, ages 20-59
              </Text>
              <FieldLabel>Sit-and-Reach (cm)</FieldLabel>
              <NumberInput
                value={sitAndReachCm} onChangeText={setSitAndReachCm}
                placeholder={lastFlexibility?.test_protocol_used === 'Sit-and-Reach (Standard)' ? `last time: ${lastFlexibility.raw_result_primary}` : 'e.g. 24'}
              />
              {lastFlexibility?.test_protocol_used === 'Sit-and-Reach (Standard)' && (
                <DeltaLine current={sitAndReachCm} last={lastFlexibility.raw_result_primary} ago={lastAgo ?? undefined} />
              )}
            </>
          ) : (
            <>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 10 }}>Chair Sit-and-Reach + Back Scratch, in inches (can be negative)</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Sit-and-Reach (in)</FieldLabel>
                  <NumberInput value={sitAndReach} onChangeText={setSitAndReach} placeholder={lastFlexibility?.test_protocol_used === 'Chair Sit-and-Reach + Back Scratch' ? `last time: ${lastFlexibility.raw_result_primary}` : 'e.g. -1.5'} allowNegative />
                  {lastFlexibility?.test_protocol_used === 'Chair Sit-and-Reach + Back Scratch' && (
                    <DeltaLine current={sitAndReach} last={lastFlexibility.raw_result_primary} ago={lastAgo ?? undefined} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <FieldLabel>Back Scratch (in)</FieldLabel>
                  <NumberInput value={backScratch} onChangeText={setBackScratch} placeholder={lastFlexibility?.test_protocol_used === 'Chair Sit-and-Reach + Back Scratch' && lastFlexibility.raw_result_secondary != null ? `last time: ${lastFlexibility.raw_result_secondary}` : 'e.g. -3.0'} allowNegative />
                  {lastFlexibility?.test_protocol_used === 'Chair Sit-and-Reach + Back Scratch' && (
                    <DeltaLine current={backScratch} last={lastFlexibility.raw_result_secondary} ago={lastAgo ?? undefined} />
                  )}
                </View>
              </View>
            </>
          )}
        </Card>

        <Card accent="#60A5FA">
          <SectionHeader icon="🫁" title="Endurance" color="#60A5FA" />
          {useAdultProtocol && (
            <View style={{ marginBottom: 10, backgroundColor: `${THEME.colors.amber}10`, borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: `${THEME.colors.amber}30` }}>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.amber, lineHeight: 16 }}>
                ℹ️ These protocols are only normed for ages 60+ — a result can still be recorded for your own tracking, but it won't get a percentile score for this client.
              </Text>
            </View>
          )}
          <FieldLabel>Protocol used</FieldLabel>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
            {(['6-Minute Walk', '2-Minute Step Test'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => { setEnduranceProtocol(p); setEnduranceProtocolTouched(true); }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: enduranceProtocol === p ? '#60A5FA' : THEME.colors.surface3, borderWidth: 0.5, borderColor: enduranceProtocol === p ? '#60A5FA' : THEME.colors.border }}
              >
                <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sansMedium, color: enduranceProtocol === p ? THEME.colors.background : THEME.colors.textSecondary, textAlign: 'center' }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FieldLabel>{enduranceProtocol === '6-Minute Walk' ? 'Distance (yards)' : 'Step count'}</FieldLabel>
          <NumberInput
            value={enduranceValue}
            onChangeText={setEnduranceValue}
            placeholder={lastEndurance && lastEndurance.test_protocol_used === enduranceProtocol ? `last time: ${lastEndurance.raw_result_primary}` : (enduranceProtocol === '6-Minute Walk' ? 'e.g. 540' : 'e.g. 95')}
          />
          <DeltaLine current={enduranceValue} last={lastEndurance?.test_protocol_used === enduranceProtocol ? lastEndurance.raw_result_primary : null} ago={lastAgo ?? undefined} />
        </Card>

        <Card accent={THEME.colors.success ?? '#4CC986'}>
          <SectionHeader icon="🏃" title="Agility" color={THEME.colors.success ?? '#4CC986'} />
          {useAdultProtocol && (
            <View style={{ marginBottom: 10, backgroundColor: `${THEME.colors.amber}10`, borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: `${THEME.colors.amber}30` }}>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.amber, lineHeight: 16 }}>
                ℹ️ This protocol is only normed for ages 60+ — a result can still be recorded for your own tracking, but it won't get a percentile score for this client.
              </Text>
            </View>
          )}
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginBottom: 10 }}>8-Foot Up-and-Go, in seconds (general population only)</Text>
          <FieldLabel>Time (seconds)</FieldLabel>
          <NumberInput value={upAndGo} onChangeText={setUpAndGo} placeholder={lastAgility ? `last time: ${lastAgility.raw_result_primary}` : 'e.g. 5.4'} />
          <DeltaLine current={upAndGo} last={lastAgility?.raw_result_primary} ago={lastAgo ?? undefined} higherIsBetter={false} />
        </Card>

        <Card accent={THEME.colors.teal}>
          <SectionHeader icon="📋" title="Report Preview" color={THEME.colors.teal} />
          {!canPreview ? (
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, fontStyle: 'italic' }}>
              Confirm age and gender above to see computed scores here.
            </Text>
          ) : Object.keys(preview).length === 0 ? (
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, fontStyle: 'italic' }}>
              {previewLoading ? 'Calculating…' : 'Enter results for a domain above to see its computed score here — this is exactly what gets saved.'}
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {(Object.keys(preview) as FitnessDomain[]).map((domain) => {
                const p = preview[domain];
                if (!p) return null;
                const meta = DOMAIN_META[domain];
                const lastResult =
                  domain === 'strength' ? lastStrength :
                  domain === 'flexibility' ? lastFlexibility :
                  domain === 'endurance' ? lastEndurance : lastAgility;
                const lastScore = lastResult?.score_status === 'scored' ? lastResult.domain_score : null;
                const delta = p.status === 'scored' && p.score != null && lastScore != null ? Math.round((p.score - lastScore) * 10) / 10 : null;
                return (
                  <View key={domain} style={{ backgroundColor: THEME.colors.surface3, borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{meta.icon} {meta.label}</Text>
                    {p.status === 'age_out_of_range' ? (
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>Age out of range</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {delta != null && delta !== 0 && (
                          <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color: delta > 0 ? (THEME.colors.success ?? '#4CC986') : THEME.colors.amber }}>
                            {delta > 0 ? '▲' : '▼'}{Math.abs(delta)}
                          </Text>
                        )}
                        {p.score != null && (
                          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: scoreBand(p.score).color }}>{scoreBand(p.score).label}</Text>
                        )}
                        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: meta.color }}>{p.score != null ? Math.round(p.score) : '—'}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              {previewLoading && (
                <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center' }}>Recalculating…</Text>
              )}
            </View>
          )}
        </Card>

        <Card>
          <SectionHeader icon="📝" title="Coach Notes" color={THEME.colors.textMuted} />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Coach-only notes (not shown to client)"
            placeholderTextColor={THEME.colors.textMuted}
            multiline
            maxLength={MAX_LENGTHS.note}
            style={{ backgroundColor: THEME.colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, borderWidth: 0.5, borderColor: THEME.colors.border, minHeight: 70, textAlignVertical: 'top' }}
          />
        </Card>

        <TouchableOpacity
          testID="save-assessment-button"
          onPress={onSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
          style={{ backgroundColor: canSubmit ? THEME.colors.teal : THEME.colors.surface3, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
        >
          {isPending ? (
            <ActivityIndicator color={THEME.colors.background} />
          ) : (
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: canSubmit ? THEME.colors.background : THEME.colors.textMuted }}>Save Assessment</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
