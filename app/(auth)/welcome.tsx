// app/(auth)/welcome.tsx
import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { THEME } from '@/constants/theme';
import { PROGRAMS_ENABLED } from '@/constants/featureFlags';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router   = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {/* Ambient glow */}
      <View style={s.glow1} />
      <View style={s.glow2} />

      <Animated.View style={[s.content, { opacity: fadeAnim }]}>

        {/* ── Logo ── */}
        <Animated.View style={[s.logoWrap, { transform: [{ scale: logoScale }] }]}>
          <View style={s.logoMark}>
            <View style={s.logoLine1} />
            <View style={s.logoLine2} />
            <View style={s.logoLine3} />
          </View>
          <View style={s.logoText}>
            <Text style={s.logoBio}>Bio</Text>
            <Text style={s.logoRealign}>Realign</Text>
          </View>
        </Animated.View>

        {/* ── Tagline ── */}
        <Animated.View style={[s.taglineWrap, { transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.tagline}>
            "I don't train bodies.{'\n'}I rebuild humans."
          </Text>
        </Animated.View>

        {/* ── Divider ── */}
        <View style={s.divider} />

        {/* ── Founder card ── */}
        <Animated.View style={[s.founderCard, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.founderAvatar}>
            <Text style={s.founderInitial}>E</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.founderName}>Eshwar Reddy</Text>
            <Text style={s.founderTitle}>Human Transformation Architect</Text>
          </View>
        </Animated.View>

        {/* ── Welcome message ── */}
        <Animated.View style={[s.welcomeCard, { transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.welcomeTitle}>Welcome to Your Transformation</Text>
          <Text style={s.welcomeText}>
            You're about to begin a journey that goes far beyond fitness. 
            In the next few steps, we'll personalise your programme based 
            on your goals, training environment, and commitment level.
          </Text>
          <View style={s.pillsRow}>
            {['Movement', 'Nutrition', 'Recovery', 'Mindset'].map(p => (
              <View key={p} style={s.pill}>
                <Text style={s.pillText}>{p}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

      </Animated.View>

      {/* ── Next button ── */}
      <Animated.View style={[s.bottomWrap, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={s.nextBtn}
          onPress={() => router.push(PROGRAMS_ENABLED ? '/(auth)/program-select' : '/onboarding/basic-info' as any)}
          activeOpacity={0.85}
        >
          <Text style={s.nextBtnText}>Begin my transformation  →</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: THEME.colors.background },

  glow1: {
    position: 'absolute', top: -60, left: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(0,196,180,0.06)',
  },
  glow2: {
    position: 'absolute', bottom: 80, right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(232,164,74,0.05)',
  },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32, justifyContent: 'center' },

  // Logo
  logoWrap:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  logoMark:   { width: 40, height: 40, gap: 7, justifyContent: 'center' },
  logoLine1:  { height: 3, width: 40, backgroundColor: THEME.colors.teal, borderRadius: 2 },
  logoLine2:  { height: 3, width: 28, backgroundColor: THEME.colors.teal, borderRadius: 2, opacity: 0.7 },
  logoLine3:  { height: 3, width: 16, backgroundColor: THEME.colors.teal, borderRadius: 2, opacity: 0.4 },
  logoText:   { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  logoBio:    { fontSize: 38, fontFamily: THEME.fonts.serif, color: THEME.colors.teal, lineHeight: 44 },
  logoRealign:{ fontSize: 38, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, lineHeight: 44 },

  // Tagline
  taglineWrap: { marginBottom: 24 },
  tagline:     {
    fontSize: 20, fontFamily: THEME.fonts.serif,
    color: THEME.colors.textSecondary,
    lineHeight: 30, fontStyle: 'italic',
  },

  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 20,
  },

  // Founder
  founderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  founderAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: `${THEME.colors.teal}20`,
    borderWidth: 1.5, borderColor: `${THEME.colors.teal}50`,
    alignItems: 'center', justifyContent: 'center',
  },
  founderInitial: { color: THEME.colors.teal, fontSize: 20, fontFamily: THEME.fonts.sansMedium },
  founderName:    { color: THEME.colors.textPrimary, fontSize: 15, fontFamily: THEME.fonts.sansMedium, marginBottom: 3 },
  founderTitle:   { color: THEME.colors.teal, fontSize: 12, fontFamily: THEME.fonts.sans, letterSpacing: 0.3 },

  // Welcome card
  welcomeCard: {
    backgroundColor: 'rgba(0,196,180,0.05)',
    borderRadius: 14, padding: 18,
    borderWidth: 0.5, borderColor: 'rgba(0,196,180,0.15)',
    marginBottom: 8,
  },
  welcomeTitle: {
    color: THEME.colors.textPrimary, fontSize: 17,
    fontFamily: THEME.fonts.sansMedium, marginBottom: 10,
  },
  welcomeText: {
    color: THEME.colors.textMuted, fontSize: 13,
    fontFamily: THEME.fonts.sans, lineHeight: 21, marginBottom: 14,
  },
  pillsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill:       { backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: 'rgba(0,196,180,0.25)' },
  pillText:   { color: THEME.colors.teal, fontSize: 11, fontFamily: THEME.fonts.sansMedium },

  // Bottom
  bottomWrap: { paddingHorizontal: 24, paddingBottom: 16 },
  nextBtn:    {
    backgroundColor: THEME.colors.teal, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: THEME.colors.teal, shadowOpacity: 0.3,
    shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  nextBtnText: { color: '#000', fontSize: 16, fontFamily: THEME.fonts.sansMedium, letterSpacing: 0.3 },
});
