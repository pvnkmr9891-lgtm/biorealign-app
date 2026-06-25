import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { PROGRAM_CATALOGUE, getTrackLabel, useClientEnrollments, useEnrollmentRequests, useRequestEnrollment } from '@/hooks/usePrograms';
import { useMyAssessment } from '@/hooks/useClientAssessment';
import { useActiveEnrollment } from '@/hooks/useClient';
import { PROGRAMS } from '@/constants/programs';
import { INTENSITY_META, TYPE_META } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { THEME } from '@/constants/theme';

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner:     '#34D399',
  Intermediate: THEME.colors.amber,
  Advanced:     '#F87171',
};



// ── Recommendation engine ─────────────────────────────────────────────────────
const PROGRAM_AFFINITY: Record<string, Record<string, number>> = {
  // primary_goal → slug → score
  weight_loss:         { 'metabolic-reversal-system': 3, 'future-body-reset': 1, 'longevity-vitality-engine': 1 },
  build_muscle:        { 'peak-performance-lab': 3, 'future-body-reset': 1, 'longevity-vitality-engine': 1 },
  fix_posture:         { 'posture-recode-protocol': 3, 'corporate-performance-reset': 1 },
  reduce_pain:         { 'rebuild-rehab-system': 3, 'posture-recode-protocol': 2 },
  improve_energy:      { 'corporate-performance-reset': 3, 'longevity-vitality-engine': 2, 'metabolic-reversal-system': 1 },
  improve_performance: { 'peak-performance-lab': 3, 'corporate-performance-reset': 2 },
  longevity:           { 'longevity-vitality-engine': 3, 'peak-performance-lab': 1 },
  hormonal_balance:    { 'metabolic-reversal-system': 2, 'longevity-vitality-engine': 2 },
  lose_fat:            { 'metabolic-reversal-system': 3, 'future-body-reset': 1 },
  gain_muscle:         { 'peak-performance-lab': 3, 'future-body-reset': 1 },
};

const COMPLAINT_AFFINITY: Record<string, Record<string, number>> = {
  back_pain:     { 'posture-recode-protocol': 2, 'rebuild-rehab-system': 2 },
  neck_pain:     { 'posture-recode-protocol': 2, 'rebuild-rehab-system': 1 },
  joint_pain:    { 'rebuild-rehab-system': 2, 'posture-recode-protocol': 1 },
  shoulders:     { 'posture-recode-protocol': 2, 'rebuild-rehab-system': 1 },
  weight:        { 'metabolic-reversal-system': 2, 'future-body-reset': 1 },
  fatigue:       { 'corporate-performance-reset': 2, 'longevity-vitality-engine': 1 },
  stress:        { 'corporate-performance-reset': 2, 'longevity-vitality-engine': 1 },
  injury:        { 'rebuild-rehab-system': 3 },
  hormones:      { 'metabolic-reversal-system': 2, 'longevity-vitality-engine': 1 },
  diabetes:      { 'metabolic-reversal-system': 3 },
  hypertension:  { 'corporate-performance-reset': 2, 'longevity-vitality-engine': 2 },
};

// After completing current program, which slug makes the most sense next?
const PROGRESSION_MAP: Record<string, string> = {
  'posture-recode-protocol':     'future-body-reset',
  'rebuild-rehab-system':        'posture-recode-protocol',
  'future-body-reset':           'peak-performance-lab',
  'corporate-performance-reset': 'peak-performance-lab',
  'metabolic-reversal-system':   'longevity-vitality-engine',
  'peak-performance-lab':        'longevity-vitality-engine',
  'longevity-vitality-engine':   'peak-performance-lab',
};

interface RecommendationResult {
  program: typeof PROGRAM_CATALOGUE[0];
  reasons: { icon: string; title: string; body: string }[];
  matchScore: number;
}

function computeRecommendation(
  assessment: Record<string, any> | null,
  currentSlug: string | null,
): RecommendationResult | null {
  const candidates = PROGRAM_CATALOGUE.filter(p => p.slug !== currentSlug);
  if (!candidates.length) return null;

  // Score each candidate
  const scores: Record<string, number> = {};
  candidates.forEach(p => { scores[p.slug] = 0; });

  const primaryGoal  = assessment?.primary_goal ?? '';
  const secondaryGoals: string[] = assessment?.secondary_goals ?? [];
  const complaints:     string[] = [...(assessment?.complaints ?? []), ...(assessment?.conditions ?? [])];
  const postureIssues:  string[] = assessment?.posture_issues ?? [];
  const pastBlockers:   string[] = assessment?.past_blockers ?? [];
  const stressLevel:    number   = assessment?.stress_level ?? 5;
  const sleepHours:     number   = assessment?.sleep_hours_avg ?? 7;

  // Primary goal affinity
  const pgAffinity = PROGRAM_AFFINITY[primaryGoal] ?? {};
  candidates.forEach(p => { scores[p.slug] += (pgAffinity[p.slug] ?? 0) * 2; });

  // Secondary goals
  secondaryGoals.forEach(g => {
    const aff = PROGRAM_AFFINITY[g] ?? {};
    candidates.forEach(p => { scores[p.slug] += (aff[p.slug] ?? 0); });
  });

  // Complaints & conditions
  complaints.forEach(c => {
    const aff = COMPLAINT_AFFINITY[c] ?? {};
    candidates.forEach(p => { scores[p.slug] += (aff[p.slug] ?? 0); });
  });
  postureIssues.forEach(() => {
    scores['posture-recode-protocol'] = (scores['posture-recode-protocol'] ?? 0) + 1;
  });

  // Lifestyle signals
  if (stressLevel >= 7)  scores['corporate-performance-reset'] = (scores['corporate-performance-reset'] ?? 0) + 2;
  if (sleepHours  <= 6)  scores['corporate-performance-reset'] = (scores['corporate-performance-reset'] ?? 0) + 1;

  // Natural progression bias
  const naturalNext = currentSlug ? PROGRESSION_MAP[currentSlug] : null;
  if (naturalNext && scores[naturalNext] !== undefined) {
    scores[naturalNext] = (scores[naturalNext] ?? 0) + 2;
  }

  // Pick highest score
  const best = candidates.reduce((a, b) => (scores[a.slug] ?? 0) >= (scores[b.slug] ?? 0) ? a : b);
  const matchScore = Math.min(100, Math.round(((scores[best.slug] ?? 0) / 12) * 100));

  // Build personalised reasons
  const reasons: RecommendationResult['reasons'] = [];

  if (primaryGoal && pgAffinity[best.slug]) {
    const goalLabel: Record<string, string> = {
      weight_loss: 'losing weight', build_muscle: 'building muscle', fix_posture: 'fixing your posture',
      reduce_pain: 'reducing pain', improve_energy: 'boosting energy', improve_performance: 'peak performance',
      longevity: 'long-term vitality', lose_fat: 'fat loss', gain_muscle: 'gaining muscle',
    };
    reasons.push({
      icon: '🎯',
      title: 'Matches your primary goal',
      body: `You said your biggest goal is ${goalLabel[primaryGoal] ?? primaryGoal}. This program is purpose-built around exactly that — every phase accelerates you toward it.`,
    });
  }

  const matchedComplaints = complaints.filter(c => (COMPLAINT_AFFINITY[c] ?? {})[best.slug]);
  if (matchedComplaints.length) {
    const labelMap: Record<string, string> = {
      back_pain: 'back pain', neck_pain: 'neck pain', joint_pain: 'joint pain',
      shoulders: 'shoulder issues', weight: 'weight management challenges', fatigue: 'chronic fatigue',
      stress: 'high stress levels', injury: 'injury history', hormones: 'hormonal imbalances',
      diabetes: 'blood sugar management', hypertension: 'blood pressure concerns',
    };
    const named = matchedComplaints.slice(0, 2).map(c => labelMap[c] ?? c).join(' and ');
    reasons.push({
      icon: '🩺',
      title: 'Directly addresses your challenges',
      body: `Your assessment flagged ${named}. This program has a dedicated track to systematically resolve these — not work around them.`,
    });
  }

  if (postureIssues.length && best.slug === 'posture-recode-protocol') {
    reasons.push({
      icon: '🧍',
      title: 'Your posture profile demands it',
      body: `You reported ${postureIssues.length} postural dysfunctions. Left unaddressed, they compound into chronic pain and injury. This program corrects them at the root.`,
    });
  }

  if (stressLevel >= 7 && best.slug === 'corporate-performance-reset') {
    reasons.push({
      icon: '⚡',
      title: 'High stress — high urgency',
      body: `A stress score of ${stressLevel}/10 is a warning signal. This program was designed specifically for people in your situation — high demand, limited recovery, and a body that's paying the price.`,
    });
  }

  if (naturalNext === best.slug && currentSlug) {
    reasons.push({
      icon: '📈',
      title: 'The natural next step',
      body: `Completing your current program successfully sets the perfect physical and mental foundation for this one. The gains you're building right now are exactly what this program builds upon.`,
    });
  }

  if (pastBlockers.length) {
    const blockerLabel: Record<string, string> = {
      motivation: 'motivation dips', time: 'lack of time', consistency: 'inconsistency',
      knowledge: 'not knowing what to do', injury: 'injury setbacks', diet: 'diet struggles',
    };
    const named = pastBlockers.slice(0, 2).map(b => blockerLabel[b] ?? b).join(' and ');
    reasons.push({
      icon: '🧱',
      title: 'Built to break your old patterns',
      body: `You mentioned ${named} have stopped you before. This program is structured to remove those exact friction points with clear daily direction and progressive milestones.`,
    });
  }

  // Ensure at least 2 reasons
  if (reasons.length < 2) {
    reasons.push({
      icon: '🚀',
      title: 'The logical progression',
      body: `Based on the trajectory of your current program and your overall goals, this is the most effective path to compound your results and reach a new level of physical capability.`,
    });
  }

  return { program: best, reasons, matchScore };
}

// ── Recommendation Modal ───────────────────────────────────────────────────────
function RecommendationModal({
  result, visible, onClose, hasRequested, onRequest,
}: {
  result: RecommendationResult | null;
  visible: boolean;
  onClose: () => void;
  hasRequested: boolean;
  onRequest: (slug: string, message: string) => void;
}) {
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [message, setMessage] = useState('');
  if (!result) return null;
  const { program, reasons, matchScore } = result;

  const handleSubmit = () => {
    onRequest(program.slug, message);
    setShowMessageInput(false);
    setMessage('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

          {/* Close */}
          <View style={{ paddingHorizontal: 24, paddingTop: 20, marginBottom: 4 }}>
            <TouchableOpacity onPress={onClose} style={{ alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Hero banner */}
          <View style={{ marginHorizontal: 24, marginTop: 16, marginBottom: 24, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: `${program.color}40` }}>
            <View style={{ height: 4, backgroundColor: program.color }} />
            <View style={{ backgroundColor: `${program.color}12`, padding: 20 }}>
              <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: program.color, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 12 }}>
                ✦ Your Recommended Next Program
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: `${program.color}25`, borderWidth: 1.5, borderColor: `${program.color}50`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 30 }}>{program.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 22, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 4 }}>{program.name}</Text>
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{program.weeks} weeks · {program.difficulty}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 22 }}>{program.tagline}</Text>

              {/* Match score pill */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
                <View style={{ flex: 1, height: 4, backgroundColor: `${program.color}25`, borderRadius: 2 }}>
                  <View style={{ width: `${matchScore}%`, height: 4, backgroundColor: program.color, borderRadius: 2 }} />
                </View>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: program.color }}>{matchScore}% match</Text>
              </View>
            </View>
          </View>

          {/* Why we chose this */}
          <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 }}>
              Why this program — for you
            </Text>
            <View style={{ gap: 12 }}>
              {reasons.map((r, i) => (
                <View key={i} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${program.color}15`, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: `${program.color}30` }}>
                    <Text style={{ fontSize: 18 }}>{r.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 4 }}>{r.title}</Text>
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 18 }}>{r.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* What you unlock */}
          <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
              What you'll unlock
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {program.outcomes.map((o, i) => (
                <View key={i} style={{ backgroundColor: `${program.color}10`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.5, borderColor: `${program.color}25` }}>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: program.color }}>✓ {o}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Phase preview */}
          <View style={{ marginHorizontal: 24, marginBottom: 28 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
              Phase breakdown
            </Text>
            <View style={{ gap: 8 }}>
              {program.phases.map((phase, i) => (
                <View key={i} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${program.color}20`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${program.color}30` }}>
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: program.color }}>P{phase.number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{phase.name}</Text>
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Wk {phase.weeks}</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 18 }}>{phase.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Note: this is for after current program */}
          <View style={{ marginHorizontal: 24, marginBottom: 24, backgroundColor: `${THEME.colors.amber}10`, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: `${THEME.colors.amber}25`, flexDirection: 'row', gap: 10 }}>
            <Text style={{ fontSize: 16 }}>⏳</Text>
            <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.amber, flex: 1, lineHeight: 18 }}>
              This program is recommended for after you complete your current enrollment. You can request it now and your coach will schedule it accordingly.
            </Text>
          </View>

          {/* Message input */}
          {showMessageInput && (
            <View style={{ marginHorizontal: 24, marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 10 }}>Add a note to your coach (optional)</Text>
              <TextInput
                style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.teal, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }}
                placeholder="e.g. I want to start this after my current program ends in 6 weeks..."
                placeholderTextColor={THEME.colors.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={handleSubmit}
                  style={{ flex: 1, backgroundColor: program.color, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Send request</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowMessageInput(false)}
                  style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* CTA */}
          {!showMessageInput && (
            <View style={{ marginHorizontal: 24 }}>
              {hasRequested ? (
                <View style={{ backgroundColor: `${THEME.colors.amber}15`, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: `${THEME.colors.amber}30` }}>
                  <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>⏳ Request sent — awaiting coach</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setShowMessageInput(true)}
                  style={{ backgroundColor: program.color, borderRadius: 14, paddingVertical: 18, alignItems: 'center', shadowColor: program.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 5 }}>
                  <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Request this as my next program →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Program Detail Modal ──────────────────────────────────────────────────────
function ProgramDetailModal({
  program, visible, onClose, isEnrolled, hasRequested, onRequest,
}: {
  program: typeof PROGRAM_CATALOGUE[0] | null;
  visible: boolean;
  onClose: () => void;
  isEnrolled: boolean;
  hasRequested: boolean;
  onRequest: (slug: string, message: string) => void;
}) {
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [message, setMessage] = useState('');

  if (!program) return null;

  const handleRequestPress = () => {
    if (isEnrolled || hasRequested) return;
    setShowMessageInput(true);
  };

  const handleSubmitRequest = () => {
    onRequest(program.slug, message);
    setShowMessageInput(false);
    setMessage('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 }}>
            <TouchableOpacity onPress={onClose} style={{ marginBottom: 20, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>✕ Close</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
              <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: `${program.color}20`, borderWidth: 1, borderColor: `${program.color}30`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 28 }}>{program.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: `${program.color}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: program.color }}>{program.tag}</Text>
                  </View>
                  <View style={{ backgroundColor: `${DIFFICULTY_COLOR[program.difficulty]}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: DIFFICULTY_COLOR[program.difficulty] }}>{program.difficulty}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 22, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 4 }}>{program.name}</Text>
                <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{program.weeks} weeks · {program.tracks.length} tracks</Text>
              </View>
            </View>

            <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 24 }}>
              {program.overview}
            </Text>
          </View>

          {/* Who it's for */}
          <View style={{ marginHorizontal: 24, backgroundColor: `${program.color}10`, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${program.color}25`, marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: program.color, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
              Best for
            </Text>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, lineHeight: 22 }}>
              {program.for_who}
            </Text>
          </View>

          {/* What you get */}
          <View style={{ marginHorizontal: 24, marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
              What's included
            </Text>
            <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, gap: 10 }}>
              {program.what_you_get.map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: program.color, marginTop: 6 }} />
                  <Text style={{ flex: 1, fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, lineHeight: 22 }}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tracks */}
          <View style={{ marginHorizontal: 24, marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
              Program tracks
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {program.tracks.map(track => (
                <View key={track} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>{getTrackLabel(track)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Phases */}
          <View style={{ marginHorizontal: 24, marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
              Phase breakdown
            </Text>
            <View style={{ gap: 10 }}>
              {program.phases.map((phase, i) => (
                <View key={i} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', gap: 14 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${program.color}20`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${program.color}30` }}>
                    <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: program.color }}>P{phase.number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{phase.name}</Text>
                      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Wk {phase.weeks}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 20 }}>{phase.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Outcomes */}
          <View style={{ marginHorizontal: 24, marginBottom: 28 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
              You will achieve
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {program.outcomes.map((outcome, i) => (
                <View key={i} style={{ backgroundColor: `${program.color}10`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.5, borderColor: `${program.color}25` }}>
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: program.color }}>✓ {outcome}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Message input */}
          {showMessageInput && (
            <View style={{ marginHorizontal: 24, marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary, marginBottom: 10 }}>
                Add a note to your coach (optional)
              </Text>
              <TextInput
                style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.teal, color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sans, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }}
                placeholder="e.g. I've been dealing with lower back pain for 2 years and really want to fix my posture..."
                placeholderTextColor={THEME.colors.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={handleSubmitRequest}
                  style={{ flex: 1, backgroundColor: THEME.colors.teal, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Send request</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowMessageInput(false)}
                  style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 0.5, borderColor: THEME.colors.border }}>
                  <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* CTA */}
          {!showMessageInput && (
            <View style={{ marginHorizontal: 24 }}>
              {isEnrolled ? (
                <View style={{ backgroundColor: `${THEME.colors.teal}15`, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: `${THEME.colors.teal}30` }}>
                  <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>✓ You're enrolled in this program</Text>
                </View>
              ) : hasRequested ? (
                <View style={{ backgroundColor: `${THEME.colors.amber}15`, borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: `${THEME.colors.amber}30` }}>
                  <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>⏳ Request sent — awaiting coach approval</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={handleRequestPress}
                  style={{ backgroundColor: THEME.colors.teal, borderRadius: 14, paddingVertical: 18, alignItems: 'center', shadowColor: THEME.colors.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 }}>
                  <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>Request this program →</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Main Programs Screen ───────────────────────────────────────────────────────
export default function ProgramsScreen() {
  const [selectedProgram, setSelectedProgram] = useState<typeof PROGRAM_CATALOGUE[0] | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const { openProgramId } = useLocalSearchParams<{ openProgramId?: string }>();

  const profile = useAuthStore(s => s.profile);
  const { data: assessment } = useMyAssessment();
  const { data: activeEnrollment } = useActiveEnrollment();

  // Auto-open detail modal when navigated from home programme pill
  useEffect(() => {
    if (!openProgramId) return;
    const normalizedOpen = openProgramId === '3-PRP' ? 'postural_realignment' : openProgramId;
    // PROGRAMS uses ids like 'total_transformation'; PROGRAM_CATALOGUE uses slugs like 'future-body-reset'
    // Match by name (both reference the same programme names)
    const prog = PROGRAMS.find(p => p.id === normalizedOpen);
    if (!prog) return;
    const match = PROGRAM_CATALOGUE.find(p => p.name === prog.name);
    if (match) setSelectedProgram(match);
  }, [openProgramId]);

  const { data: enrollment }    = useClientEnrollments();
  const { data: requests = [] } = useEnrollmentRequests();
  const { mutateAsync: requestEnrollment } = useRequestEnrollment();

  const { data: enrollments = [] } = useClientEnrollments();
  const enrolledSlugs  = new Set((enrollments as any[]).map((e: any) => e.program?.slug));
  const requestedSlugs = new Set((requests as any[]).filter(r => r.status === 'pending').map((r: any) => r.program?.slug));

  // Resolve enrolled programme details from profile
  // (block continues below — currentSlug resolved after enrolledProgram)
  const rawProgramId    = profile?.workout_program_id ?? '';
  const normalizedId    = rawProgramId === '3-PRP' ? 'postural_realignment' : rawProgramId;
  const enrolledProgram = PROGRAMS.find(p => p.id === normalizedId);
  const intensityKey    = (profile?.workout_intensity ?? '') as keyof typeof INTENSITY_META;
  const trainingKey     = (profile?.workout_training_type ?? '') as keyof typeof TYPE_META;
  const intensityMeta   = INTENSITY_META[intensityKey];
  const trainingMeta    = TYPE_META[trainingKey];

  // Map enrolled program to PROGRAM_CATALOGUE slug for recommendation engine
  const currentCatalogueSlug = enrolledProgram
    ? (PROGRAM_CATALOGUE.find(p => p.name === enrolledProgram.name)?.slug ?? null)
    : null;
  const recommendation = computeRecommendation(assessment ?? null, currentCatalogueSlug);
  const recommendedSlug = recommendation?.program.slug ?? null;

  const handleRequest = async (slug: string, message: string) => {
    try {
      await requestEnrollment({ programSlug: slug, message });
      Alert.alert('Request sent! 🎉', 'Your coach will review your request and get back to you soon.');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to send request. Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>
          <Text style={{ fontSize: 32, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginBottom: 4 }}>
            Programs
          </Text>
          <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
            7 precision protocols by BioRealign
          </Text>
        </View>

        {/* ── Currently enrolled card ── */}
        {enrolledProgram ? (
          <View style={{
            marginHorizontal: 24, marginTop: 16,
            backgroundColor: `${enrolledProgram.color}10`,
            borderRadius: 16, borderWidth: 1,
            borderColor: `${enrolledProgram.color}30`,
            overflow: 'hidden',
          }}>
            {/* Top accent stripe */}
            <View style={{ height: 3, backgroundColor: enrolledProgram.color }} />

            <View style={{ padding: 16 }}>
              {/* Label */}
              <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: enrolledProgram.color, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>
                ✦ Currently enrolled
              </Text>

              {/* Programme name row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${enrolledProgram.color}20`, borderWidth: 1, borderColor: `${enrolledProgram.color}40`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 22 }}>{enrolledProgram.icon}</Text>
                </View>
                <Text style={{ fontSize: 17, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, flex: 1 }}>
                  {enrolledProgram.name}
                </Text>
              </View>

              {/* Details row: intensity · environment · weeks */}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {intensityMeta && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${intensityMeta.color}15`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: `${intensityMeta.color}40` }}>
                    <Text style={{ fontSize: 13 }}>{intensityMeta.icon}</Text>
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: intensityMeta.color }}>
                      {intensityMeta.label}
                    </Text>
                  </View>
                )}
                {trainingMeta && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)' }}>
                    <Text style={{ fontSize: 13 }}>{trainingMeta.icon}</Text>
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>
                      {trainingMeta.label}
                    </Text>
                  </View>
                )}
                {intensityMeta && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)' }}>
                    <Text style={{ fontSize: 13 }}>📅</Text>
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textSecondary }}>
                      {intensityMeta.weeks} weeks
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : enrollment ? (
          /* Fallback: show DB enrollment name if profile program not set */
          <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: `${THEME.colors.teal}12`, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: `${THEME.colors.teal}25`, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 24 }}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Currently enrolled</Text>
              <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginTop: 2 }}>
                {(enrollment as any).program?.name}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── Recommendation card ── */}
        {recommendation && (enrolledProgram || enrollment) && (
          <View style={{ marginHorizontal: 24, marginTop: 16 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
              Your Next Program
            </Text>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setShowRecommendation(true)}
              style={{ borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: `${recommendation.program.color}35` }}
            >
              {/* Gradient-like top stripe */}
              <View style={{ height: 3, backgroundColor: recommendation.program.color }} />
              <View style={{ backgroundColor: `${recommendation.program.color}0E`, padding: 16 }}>
                {/* Label row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: recommendation.program.color }} />
                    <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: recommendation.program.color, letterSpacing: 1.5, textTransform: 'uppercase' }}>AI Recommended</Text>
                  </View>
                  <View style={{ backgroundColor: `${recommendation.program.color}20`, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: recommendation.program.color }}>{recommendation.matchScore}% match</Text>
                  </View>
                </View>

                {/* Program row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 15, backgroundColor: `${recommendation.program.color}20`, borderWidth: 1, borderColor: `${recommendation.program.color}40`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 24 }}>{recommendation.program.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 3 }}>{recommendation.program.name}</Text>
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{recommendation.program.tagline}</Text>
                  </View>
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 18 }}>›</Text>
                </View>

                {/* Top reason preview */}
                {recommendation.reasons[0] && (
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 10, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 14 }}>{recommendation.reasons[0].icon}</Text>
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, flex: 1, lineHeight: 17 }}>
                      <Text style={{ fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{recommendation.reasons[0].title} — </Text>
                      {recommendation.reasons[0].body.slice(0, 90)}{recommendation.reasons[0].body.length > 90 ? '…' : ''}
                    </Text>
                  </View>
                )}

                {/* Outcomes preview */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {recommendation.program.outcomes.slice(0, 3).map((o, i) => (
                    <View key={i} style={{ backgroundColor: `${recommendation.program.color}15`, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: `${recommendation.program.color}30` }}>
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: recommendation.program.color }}>✓ {o}</Text>
                    </View>
                  ))}
                </View>

                {/* Tap CTA */}
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 12, textAlign: 'right' }}>Tap to see why this was chosen for you →</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Pending requests */}
        {(requests as any[]).filter(r => r.status === 'pending').length > 0 && (
          <View style={{ marginHorizontal: 24, marginTop: 12, backgroundColor: `${THEME.colors.amber}10`, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: `${THEME.colors.amber}25`, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 16 }}>⏳</Text>
            <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber, flex: 1 }}>
              {(requests as any[]).filter(r => r.status === 'pending').length} enrollment request pending coach review
            </Text>
          </View>
        )}

        {/* ── Intensity legend (replaces filter pills) ── */}
        <View style={{ marginHorizontal: 24, marginTop: 20, marginBottom: 4 }}>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
            Intensity &amp; duration
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(Object.entries(INTENSITY_META) as [string, typeof INTENSITY_META[keyof typeof INTENSITY_META]][]).map(([key, meta]) => (
              <View key={key} style={{ flex: 1, backgroundColor: `${meta.color}10`, borderRadius: 12, padding: 10, borderWidth: 0.5, borderColor: `${meta.color}30`, alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
                <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: meta.color }}>{meta.label}</Text>
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{meta.weeks} wks</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section label for programme list */}
        <View style={{ paddingHorizontal: 24, marginTop: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            All programmes
          </Text>
        </View>

        {/* Program cards */}
        <View style={{ paddingHorizontal: 24, gap: 12 }}>
          {PROGRAM_CATALOGUE.map(program => {
            const isEnrolled = enrolledSlugs.has(program.slug);
            const hasRequested = requestedSlugs.has(program.slug);

            return (
              <TouchableOpacity
                key={program.slug}
                activeOpacity={0.85}
                onPress={() => setSelectedProgram(program)}
                style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, borderWidth: isEnrolled ? 1.5 : 0.5, borderColor: isEnrolled ? THEME.colors.teal : THEME.colors.border }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                  {/* Icon */}
                  <View style={{ width: 50, height: 50, borderRadius: 14, backgroundColor: `${program.color}20`, borderWidth: 1, borderColor: `${program.color}30`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{program.icon}</Text>
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: `${program.color}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: program.color }}>{program.tag}</Text>
                      </View>
                      <View style={{ backgroundColor: `${DIFFICULTY_COLOR[program.difficulty]}15`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: DIFFICULTY_COLOR[program.difficulty] }}>{program.difficulty}</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 4 }}>
                      {program.name}
                    </Text>
                    <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 18, marginBottom: 10 }}>
                      {program.tagline}
                    </Text>

                    {/* Stats row */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                        📅 {program.weeks} weeks
                      </Text>
                      <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                        📋 {program.tracks.length} tracks
                      </Text>
                    </View>
                  </View>

                  {/* Status indicator */}
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    {isEnrolled ? (
                      <View style={{ backgroundColor: `${THEME.colors.teal}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Active</Text>
                      </View>
                    ) : hasRequested ? (
                      <View style={{ backgroundColor: `${THEME.colors.amber}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.amber }}>Pending</Text>
                      </View>
                    ) : (
                      <Text style={{ color: THEME.colors.textMuted, fontSize: 16 }}>›</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* Program detail modal */}
      <ProgramDetailModal
        program={selectedProgram}
        visible={!!selectedProgram}
        onClose={() => setSelectedProgram(null)}
        isEnrolled={selectedProgram ? (enrolledSlugs.has(selectedProgram.slug) || selectedProgram.name === enrolledProgram?.name) : false}
        hasRequested={selectedProgram ? requestedSlugs.has(selectedProgram.slug) : false}
        onRequest={handleRequest}
      />

      {/* Recommendation modal */}
      <RecommendationModal
        result={recommendation ?? null}
        visible={showRecommendation}
        onClose={() => setShowRecommendation(false)}
        hasRequested={recommendedSlug ? requestedSlugs.has(recommendedSlug) : false}
        onRequest={handleRequest}
      />
    </SafeAreaView>
  );
}
