import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {PROGRAM_CATALOGUE, getTrackLabel,useClientEnrollments, useEnrollmentRequests, useRequestEnrollment,
} from '@/hooks/usePrograms';
import { THEME } from '@/constants/theme';

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner:     '#34D399',
  Intermediate: THEME.colors.amber,
  Advanced:     '#F87171',
};

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
  const [filter, setFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');

  const { data: enrollment }        = useClientEnrollments();
  const { data: requests = [] }     = useEnrollmentRequests();
  const { mutateAsync: requestEnrollment, isPending } = useRequestEnrollment();

  const { data: enrollments = [] } = useClientEnrollments();
const enrolledSlugs = new Set((enrollments as any[]).map((e: any) => e.program?.slug));
  const requestedSlugs = new Set((requests as any[]).filter(r => r.status === 'pending').map((r: any) => r.program?.slug));

  const filtered = PROGRAM_CATALOGUE.filter(p =>
    filter === 'all' ? true : p.difficulty.toLowerCase() === filter
  );

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

        {/* Active enrollment banner */}
        {enrollment && (
          <View style={{ marginHorizontal: 24, marginTop: 16, backgroundColor: `${THEME.colors.teal}12`, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: `${THEME.colors.teal}25`, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 24 }}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>Currently enrolled</Text>
              <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginTop: 2 }}>
                {(enrollment as any).program?.name}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
                Week {(enrollment as any).current_week} of {(enrollment as any).program?.duration_weeks}
              </Text>
            </View>
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

        {/* Filter pills */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginTop: 20, marginBottom: 16 }}>
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(f => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: filter === f ? THEME.colors.teal : THEME.colors.surface2, borderWidth: 0.5, borderColor: filter === f ? THEME.colors.teal : THEME.colors.border }}>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: filter === f ? THEME.colors.background : THEME.colors.textMuted, textTransform: 'capitalize' }}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Program cards */}
        <View style={{ paddingHorizontal: 24, gap: 12 }}>
          {filtered.map(program => {
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
        isEnrolled={selectedProgram ? enrolledSlugs.has(selectedProgram.slug) : false}
        hasRequested={selectedProgram ? requestedSlugs.has(selectedProgram.slug) : false}
        onRequest={handleRequest}
      />
    </SafeAreaView>
  );
}
