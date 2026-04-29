import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { THEME } from '@/constants/theme';

const PILLAR_LABELS: Record<string, string> = {
  activation_mind:       'Activation & Mind',
  body_awareness:        'Body Awareness',
  training_architecture: 'Training Architecture',
  performance_recovery:  'Performance & Recovery',
  nutrition_lifestyle:   'Nutrition & Lifestyle',
  goal_progression:      'Goal & Progression',
};

const TYPE_ICONS: Record<string, string> = {
  exercise:   '🏋️',
  video:      '▶️',
  assessment: '📋',
  article:    '📖',
  audio:      '🎧',
};

const TYPE_COLORS: Record<string, string> = {
  exercise:   THEME.scoreColors.fitness,
  video:      THEME.scoreColors.recovery,
  assessment: THEME.colors.amber,
  article:    THEME.colors.textSecondary,
  audio:      '#C4B5FD',
};

// Instruction sets per content type
const INSTRUCTIONS: Record<string, string[]> = {
  exercise: [
    'Find a clear space with enough room to move freely',
    'Start with a 2-minute warm-up — gentle joint rotations',
    'Follow the movement cues exactly as described',
    'Focus on form over speed — quality reps only',
    'Rest for 60 seconds between sets',
    'Note any discomfort and adjust range of motion accordingly',
  ],
  assessment: [
    'You will need a phone or camera for photos',
    'Stand against a plain wall for reference lines',
    'Take photos from front, side (left), and back',
    'Record your measurements in a notebook or notes app',
    'Share results with your coach after completion',
  ],
  article: [
    'Read through completely before applying any advice',
    'Take notes on key points that apply to your situation',
    'Discuss questions with your coach at your next session',
  ],
  video: [
    'Watch the full video before attempting the movement',
    'Pause and rewatch complex sections as needed',
    'Follow along at 50% speed on your first attempt',
  ],
  audio: [
    'Find a quiet, comfortable space',
    'Use headphones for best experience',
    'Do not listen while driving or operating machinery',
  ],
};

export default function ContentPlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    description: string;
    type: string;
    pillar: string;
    duration_min: string;
    is_required: string;
    week_num: string;
    day_num: string;
  }>();

  const icon     = TYPE_ICONS[params.type]   ?? '📄';
  const color    = TYPE_COLORS[params.type]  ?? THEME.colors.teal;
  const pillar   = PILLAR_LABELS[params.pillar] ?? params.pillar;
  const steps    = INSTRUCTIONS[params.type] ?? INSTRUCTIONS.article;
  const required = params.is_required === 'true';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 13 }}>
            Week {params.week_num}{params.day_num ? ` · Day ${params.day_num}` : ''}
          </Text>
        </View>

        {/* Hero card */}
        <View style={{ marginHorizontal: 24, marginTop: 20, backgroundColor: THEME.colors.surface2, borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: THEME.colors.border }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: `${color}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 0.5, borderColor: `${color}30` }}>
            <Text style={{ fontSize: 26 }}>{icon}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: `${color}18`, borderWidth: 0.5, borderColor: `${color}30` }}>
              <Text style={{ color, fontFamily: THEME.fonts.sansMedium, fontSize: 12, textTransform: 'capitalize' }}>
                {params.type}
              </Text>
            </View>
            {required && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: `${THEME.colors.amber}18`, borderWidth: 0.5, borderColor: `${THEME.colors.amber}30` }}>
                <Text style={{ color: THEME.colors.amber, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>
                  Required
                </Text>
              </View>
            )}
          </View>

          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 26, lineHeight: 34, marginBottom: 12 }}>
            {params.title}
          </Text>

          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 15, lineHeight: 24 }}>
            {params.description}
          </Text>

          {/* Meta row */}
          <View style={{ flexDirection: 'row', gap: 24, marginTop: 20, paddingTop: 20, borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
            {params.duration_min && (
              <View>
                <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11 }}>Duration</Text>
                <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 16, marginTop: 2 }}>
                  {params.duration_min} min
                </Text>
              </View>
            )}
            <View>
              <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11 }}>Pillar</Text>
              <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14, marginTop: 2 }}>
                {pillar}
              </Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={{ marginHorizontal: 24, marginTop: 24 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16 }}>
            How to complete
          </Text>
          <View style={{ gap: 12 }}>
            {steps.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: `${color}18`, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: `${color}30`, flexShrink: 0, marginTop: 1 }}>
                  <Text style={{ color, fontFamily: THEME.fonts.sansMedium, fontSize: 12 }}>{i + 1}</Text>
                </View>
                <Text style={{ flex: 1, color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sans, fontSize: 14, lineHeight: 22 }}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Coach note */}
        <View style={{ marginHorizontal: 24, marginTop: 24, backgroundColor: THEME.colors.tealMuted, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: `${THEME.colors.teal}30` }}>
          <Text style={{ color: THEME.colors.teal, fontFamily: THEME.fonts.sansMedium, fontSize: 13, marginBottom: 6 }}>
            Coach's note
          </Text>
          <Text style={{ color: `${THEME.colors.teal}CC`, fontFamily: THEME.fonts.sans, fontSize: 13, lineHeight: 20 }}>
            This is part of your precision protocol designed by Eswar Reddy. Consistency is the protocol — even 80% effort done daily beats 100% effort done occasionally.
          </Text>
        </View>

        {/* Mark complete button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.back()}
          style={{ marginHorizontal: 24, marginTop: 28, backgroundColor: color, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
        >
          <Text style={{ color: THEME.colors.background, fontFamily: THEME.fonts.sansMedium, fontSize: 16 }}>
            Mark as complete ✓
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
