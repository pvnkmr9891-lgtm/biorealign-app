import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { useAssessmentSubmit } from '@/hooks/useAssessmentSubmit';
import { useAssessmentStore } from '@/store/assessmentStore';

const BRAND = {
  teal: '#00C4B4',
  amber: '#E8A44A',
  bg: '#0A0A0B',
  surface: '#141416',
  border: '#2A2A2E',
  text: '#F0EEE8',
  textMuted: '#6B6B70',
};

const WHAT_HAPPENS_NEXT = [
  { emoji: '🔍', title: 'Coach review', body: 'Your coach will review your full assessment within 24–48 hours.' },
  { emoji: '🏗️', title: 'Plan construction', body: 'A personalised multi-track plan is built specifically for you.' },
  { emoji: '📱', title: 'Plan delivered', body: 'You\'ll receive a notification when your plan is ready to start.' },
  { emoji: '🚀', title: 'Transformation begins', body: 'You execute the plan inside the app with full coach support.' },
];

export default function CompleteScreen() {
  const router = useRouter();
  const { submit } = useAssessmentSubmit();
  const { submitError, isSubmitting, reset } = useAssessmentStore();

  const [submitted, setSubmitted] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Auto-submit on mount
    handleSubmit();
  }, []);

  const handleSubmit = async () => {
    const success = await submit();
    if (success) {
      setSubmitted(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 6 }),
      ]).start();
      Animated.spring(checkScale, {
        toValue: 1,
        delay: 300,
        useNativeDriver: true,
        speed: 6,
        bounciness: 10,
      }).start();
    } else {
      setSubmitFailed(true);
    }
  };

 const goToDashboard = async () => {
  reset();
  await new Promise(resolve => setTimeout(resolve, 200));
  router.replace('/(client)');
};

  if (isSubmitting) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 32, marginBottom: 20 }}>⏳</Text>
        <Text style={{ fontSize: 22, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, textAlign: 'center', marginBottom: 12 }}>
          Submitting your assessment...
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, textAlign: 'center' }}>
          This only takes a moment.
        </Text>
      </View>
    );
  }

  if (submitFailed) {
    return (
      <View style={{ flex: 1, backgroundColor: BRAND.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 20 }}>⚠️</Text>
        <Text style={{ fontSize: 22, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, textAlign: 'center', marginBottom: 12 }}>
          Submission failed
        </Text>
        <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, textAlign: 'center', marginBottom: 8 }}>
          {submitError ?? 'Please check your connection and try again.'}
        </Text>
        <TouchableOpacity
          onPress={() => { setSubmitFailed(false); handleSubmit(); }}
          style={{ backgroundColor: BRAND.teal, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, marginTop: 24 }}
        >
          <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: '#0A0A0B' }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BRAND.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 80, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Success icon */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: `${BRAND.teal}20`,
              borderWidth: 2,
              borderColor: BRAND.teal,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: BRAND.teal,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            <Animated.Text style={{ fontSize: 44, transform: [{ scale: checkScale }] }}>✓</Animated.Text>
          </Animated.View>
        </View>

        {/* Headline */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: BRAND.teal, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>
            Assessment submitted
          </Text>
          <Text style={{ fontSize: 34, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, textAlign: 'center', lineHeight: 44, marginBottom: 16 }}>
            Your journey{'\n'}starts now.
          </Text>
          <Text style={{ fontSize: 15, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 48 }}>
            Your coach has been notified and will start building your personalised transformation plan.
          </Text>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: BRAND.border, marginBottom: 32 }} />

          {/* What happens next */}
          <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: BRAND.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>
            What happens next
          </Text>

          {WHAT_HAPPENS_NEXT.map((item, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginBottom: 20,
                backgroundColor: BRAND.surface,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: BRAND.border,
              }}
            >
              {/* Step number */}
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: `${BRAND.teal}20`,
                  borderWidth: 1,
                  borderColor: BRAND.teal,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                  marginTop: 2,
                }}
              >
                <Text style={{ fontSize: 12, color: BRAND.teal, fontFamily: 'DMSans-Bold' }}>{i + 1}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: BRAND.text, marginBottom: 4 }}>
                  {item.emoji} {item.title}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, lineHeight: 20 }}>
                  {item.body}
                </Text>
              </View>
            </View>
          ))}

          {/* Quote */}
          <View style={{ backgroundColor: `${BRAND.amber}10`, borderRadius: 12, padding: 20, borderLeftWidth: 3, borderLeftColor: BRAND.amber, marginTop: 8 }}>
            <Text style={{ fontSize: 15, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, lineHeight: 24, fontStyle: 'italic' }}>
              "Every elite transformation starts with honest self-knowledge. You've done the hard part — now let us do ours."
            </Text>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Medium', color: BRAND.amber, marginTop: 12 }}>
              — Eswar Reddy, BioRealign
            </Text>
          </View>
        </Animated.View>

      </ScrollView>

      {/* CTA */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: BRAND.bg, borderTopWidth: 1, borderTopColor: BRAND.border, paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 36 }}>
        <TouchableOpacity
          onPress={goToDashboard}
          activeOpacity={0.85}
          style={{ backgroundColor: BRAND.teal, borderRadius: 14, paddingVertical: 18, alignItems: 'center', shadowColor: BRAND.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6 }}
        >
          <Text style={{ fontSize: 16, fontFamily: 'DMSans-Bold', color: '#0A0A0B' }}>
            Go to Dashboard →
          </Text>
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', fontSize: 12, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 12 }}>
          Your plan will appear here once it's ready
        </Text>
      </View>
    </View>
  );
}
