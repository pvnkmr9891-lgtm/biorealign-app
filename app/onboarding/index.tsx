import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/useAuth';

const BRAND = {
  teal: '#00C4B4',
  amber: '#E8A44A',
  bg: '#0A0A0B',
  surface: '#141416',
  border: '#2A2A2E',
  text: '#F0EEE8',
  textMuted: '#6B6B70',
};

const STEPS = [
  { emoji: '🧬', label: 'Personal baseline & lifestyle' },
  { emoji: '🩺', label: 'Body, health & pain assessment' },
  { emoji: '🏋️', label: 'Movement & fitness history' },
  { emoji: '🥗', label: 'Nutrition & recovery patterns' },
  { emoji: '🎯', label: 'Goals, mindset & commitment' },
];

export default function OnboardingWelcome() {
  const router = useRouter();
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand mark */}
        <Text
          style={{
            fontSize: 11,
            fontFamily: 'DMSans-Medium',
            color: BRAND.teal,
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 40,
          }}
        >
          BioRealign
        </Text>

        {/* Hero headline */}
        <Text
          style={{
            fontSize: 36,
            fontFamily: 'DMSerifDisplay-Regular',
            color: BRAND.text,
            lineHeight: 44,
            marginBottom: 16,
          }}
        >
          Welcome,{'\n'}
          <Text style={{ color: BRAND.teal }}>{firstName}.</Text>
        </Text>

        <Text
          style={{
            fontSize: 16,
            fontFamily: 'DMSans-Regular',
            color: BRAND.textMuted,
            lineHeight: 26,
            marginBottom: 40,
          }}
        >
          Before we build your personalised transformation plan, we need to understand your body, lifestyle, and goals — deeply.
        </Text>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: BRAND.border,
            marginBottom: 32,
          }}
        />

        {/* What to expect */}
        <Text
          style={{
            fontSize: 13,
            fontFamily: 'DMSans-Medium',
            color: BRAND.textMuted,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          What to expect
        </Text>

        {STEPS.map((step, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
              backgroundColor: BRAND.surface,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: BRAND.border,
            }}
          >
            <Text style={{ fontSize: 22, marginRight: 16 }}>{step.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'DMSans-Medium',
                  color: BRAND.textMuted,
                  letterSpacing: 0.5,
                }}
              >
                STEP {i + 1}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: 'DMSans-Regular',
                  color: BRAND.text,
                  marginTop: 2,
                }}
              >
                {step.label}
              </Text>
            </View>
          </View>
        ))}

        {/* Time notice */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: `${BRAND.amber}15`,
            borderRadius: 10,
            padding: 14,
            borderWidth: 1,
            borderColor: `${BRAND.amber}30`,
            marginTop: 8,
            marginBottom: 40,
          }}
        >
          <Text style={{ fontSize: 18, marginRight: 12 }}>⏱</Text>
          <Text
            style={{
              fontSize: 13,
              fontFamily: 'DMSans-Regular',
              color: BRAND.amber,
              flex: 1,
              lineHeight: 20,
            }}
          >
            Takes about 8–10 minutes. Your answers are saved as you go — you can pause and return anytime.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => router.push('/onboarding/stage-1')}
          activeOpacity={0.85}
          style={{
            backgroundColor: BRAND.teal,
            borderRadius: 14,
            paddingVertical: 18,
            alignItems: 'center',
            shadowColor: BRAND.teal,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 6,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontFamily: 'DMSans-Bold',
              color: '#0A0A0B',
              letterSpacing: 0.5,
            }}
          >
            Begin Assessment →
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            textAlign: 'center',
            marginTop: 16,
            fontSize: 12,
            fontFamily: 'DMSans-Regular',
            color: BRAND.textMuted,
          }}
        >
          Your data is private and only visible to your assigned coach
        </Text>
      </ScrollView>
    </View>
  );
}
