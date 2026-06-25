import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Animated, Easing, KeyboardAvoidingView, Platform,
  StatusBar, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { THEME } from '@/constants/theme';
import { PROGRAMS_ENABLED } from '@/constants/featureFlags';
import { SUPPORT_EMAIL } from '@/constants/contact';

// ─────────────────────────────────────────────────────────────────────────────
// Q&A DATA
// ─────────────────────────────────────────────────────────────────────────────

interface QA {
  q: string;
  a: string;
  related?: string[];
  // Curated-programme content (Pro version, deferred for now) — see
  // PROGRAMS_ENABLED. Kept in place rather than deleted so it comes back
  // automatically once Programs ships, instead of being re-written.
  proOnly?: boolean;
}

interface Category {
  id: string;
  icon: string;
  title: string;
  color: string;
  items: QA[];
  proOnly?: boolean;
}

const CATEGORIES: Category[] = [
  {
    id: 'getting-started',
    icon: '🏠',
    title: 'Getting Started',
    color: '#00C4B4',
    items: [
      {
        q: 'How does BioRealign work?',
        a: 'BioRealign is a personalised wellness coaching app. You complete a Daily Check-In every day (mood, energy, sleep, pain) which generates your three core scores: Fitness, Recovery, and Longevity. Your coach assigns a programme and workout plan tailored to your goals, and the app tracks your alignment — how consistently you hit your daily targets.',
        related: ['How do I start my first programme?', 'What do the scores mean?', 'How do I complete Daily Check-In?'],
      },
      {
        q: 'How do I start my first programme?',
        a: 'During onboarding, go to the Assessment section and complete all 5 stages. Your coach will then review your data and assign a programme. You can also browse all 7 programmes in the Programmes tab and tap "Request this programme" to let your coach know your preference.',
        related: ['How does BioRealign work?', 'How long does a programme last?', 'Which programme is right for me?'],
        proOnly: true,
      },
      {
        q: 'How do I complete Daily Check-In?',
        a: 'Tap the "Daily Pulse" button on the home screen. You\'ll log 4 metrics:\n\n• 😊 Mood (1–10)\n• ⚡ Energy (1–12)\n• 🌙 Sleep (hours, 0–12)\n• 💊 Pain (0–12, where 0 = no pain)\n\nYour Fitness, Recovery, and Longevity scores update instantly. You can check in for past dates too — tap the date on the home screen.',
        related: ['What do the scores mean?', 'How is Fitness Score calculated?', 'Why are my scores low?'],
      },
      {
        q: 'What do the scores mean?',
        a: 'Your dashboard shows three core scores (0–100):\n\n⚡ Fitness Score — reflects your energy and mood. High energy + good mood = strong fitness score.\n\n🔄 Recovery Score — measures how well your body is recovering, based on sleep quality, energy, mood, and pain levels.\n\n🌱 Longevity Score — a blend of both (40% fitness + 60% recovery). This is your overall wellness indicator.\n\nAll three reach 100 when your check-in metrics are at their best.',
        related: ['How is Fitness Score calculated?', 'Why are my scores low?', 'What happens when I reach 100%?'],
      },
      {
        q: 'What happens when I reach 100%?',
        a: 'When all your tracker rings fill to 100%, you\'ll see special animations:\n\n🎯 Alignment Tracker — a golden bullseye appears with sparkles\n⚡ Vitality Tracker — electric green neon glow activates with firefly and leaf effects\n\nKeep hitting those targets daily to build your streak and perfect week count!',
        related: ['What do the scores mean?', 'How do I complete Daily Check-In?'],
      },
    ],
  },
  {
    id: 'programmes',
    icon: '🏋️',
    title: 'Programmes',
    color: '#8B5CF6',
    proOnly: true,
    items: [
      {
        q: 'Which programme is right for me?',
        a: 'Here\'s a quick guide:\n\n🚀 Future Body Reset — complete overhaul, all pillars\n🔥 Metabolic Reversal System — slow metabolism, stubborn fat, hormonal issues\n🧘 Posture Recode Protocol — chronic pain, posture problems\n🛠️ Rebuild & Rehab System — hormonal imbalances, burnout, PCOS\n💼 Corporate Performance Reset — desk workers, fatigue, back pain\n⚡ Peak Performance Lab — athletes, high performers\n🌿 Longevity & Vitality Engine — burnout recovery, stress, mindset\n\nComplete your assessment and your coach will recommend the best fit.',
        related: ['How do I start my first programme?', 'How long does a programme last?', 'How do I switch programmes?'],
      },
      {
        q: 'What\'s the difference between programmes?',
        a: 'Each programme targets different pillars of wellness. Posture Recode (PRP) focuses on movement and alignment, while Metabolic Reversal (MRS) targets nutrition and metabolic function. Future Body Reset covers all five pillars simultaneously. Browse the Programmes tab to see detailed breakdowns, phase structures, and outcomes for each.',
        related: ['Which programme is right for me?', 'How long does a programme last?'],
      },
      {
        q: 'How long does a programme last?',
        a: 'Programme length depends on your chosen intensity:\n\n🌱 Beginner — 20 weeks\n⚡ Medium — 12 weeks\n🔥 Hard — 8 weeks\n\nThe shorter programmes have higher intensity and require more commitment. Choose based on your current fitness level and goals.',
        related: ['Which programme is right for me?', 'How do I switch programmes?'],
      },
      {
        q: 'How do I switch programmes?',
        a: 'Go to the Programmes tab, browse the list, and tap "Request this programme" on any programme card. You can add a note to your coach explaining why you want to switch. Your coach will review and reassign your plan. Your progress history is always preserved.',
        related: ['Which programme is right for me?', 'How long does a programme last?'],
      },
      {
        q: 'Can I follow multiple programmes?',
        a: 'Currently, BioRealign supports one active programme at a time. This is by design — our programmes are comprehensive and following more than one simultaneously would lead to overtraining and reduce results. Your coach can always update your programme as you progress.',
        related: ['How do I switch programmes?', 'Which programme is right for me?'],
      },
    ],
  },
  {
    id: 'scores',
    icon: '📊',
    title: 'Dashboard & Scores',
    color: '#60A5FA',
    items: [
      {
        q: 'How is Fitness Score calculated?',
        a: 'Fitness Score is based on your energy and mood from your Daily Check-In:\n\nFitness = (Energy × 0.6 + Mood × 0.4) × 10\n\nBoth are normalised to 0–10 first:\n• Energy 1–12 → divide by 12, multiply by 10\n• Mood 1–10 → subtract 1, divide by 9, multiply by 10\n\nWith max energy (12) and max mood (10) you get a perfect 100.',
        related: ['How is Recovery Score calculated?', 'Why are my scores low?', 'How do I complete Daily Check-In?'],
      },
      {
        q: 'What is Recovery Score?',
        a: 'Recovery Score measures how well your body is bouncing back each day. It\'s a weighted blend:\n\n• 😊 Mood — 25%\n• ⚡ Energy — 25%\n• 🌙 Sleep — 35%\n• 💊 Pain (inverted) — 15%\n\nSleep has the highest weight because it\'s the strongest predictor of physical recovery. A night of 8+ hours can significantly boost this score.',
        related: ['How is Longevity Score calculated?', 'How do I improve recovery?', 'What affects sleep score?'],
      },
      {
        q: 'What is Longevity Score?',
        a: 'Longevity Score is your overall wellness indicator — a blend of how you perform AND how well you recover:\n\nLongevity = (Fitness × 40%) + (Recovery × 60%)\n\nRecovery is weighted higher because sustainable long-term health depends more on rest and recovery than peak performance alone.',
        related: ['What is Recovery Score?', 'How is Fitness Score calculated?', 'How do I improve all scores?'],
      },
      {
        q: 'Why are my scores low?',
        a: 'Scores are directly tied to your Daily Check-In values. Common reasons for low scores:\n\n• Low energy reading → reduces Fitness and Recovery\n• Poor sleep → largest impact on Recovery Score\n• High pain level → reduces Recovery\n• Low mood → affects both Fitness and Recovery\n\nAlso, if you haven\'t checked in today, scores show 0. Make sure to log your Daily Pulse each day.',
        related: ['How do I complete Daily Check-In?', 'How do I improve recovery?', 'What is Recovery Score?'],
      },
      {
        q: 'What is the Alignment Score?',
        a: 'The Alignment Score (shown as a percentage on the Weekly Activity ring) tracks how consistently you complete your daily targets — workout items, food goals, and water intake. Days where your alignment is ≥45% count as "active days" and contribute to your streak. Days at ≥75% show in green on your weekly chart.',
        related: ['How is Fitness Score calculated?', 'How do workouts count?', 'Why are my scores low?'],
      },
    ],
  },
  {
    id: 'workout',
    icon: '💪',
    title: 'Workout Questions',
    color: '#EF4444',
    items: [
      {
        q: 'How do I start a workout?',
        a: 'Go to the Workout tab at the bottom. If your coach has assigned a plan, you\'ll see your programme with daily sessions. Tap a day card, then tap "Start Workout" to begin the session. If no coach plan is active yet, you\'ll see a 6-day manual checklist — tick off items as you complete them and tap Save.',
        related: ['Why is Start Workout disabled?', 'Can I skip exercises?', 'How do I set my workout start date?'],
      },
      {
        q: 'Why is Start Workout disabled?',
        a: 'Start Workout may be disabled if:\n\n• You don\'t have an active programme enrolled yet (request one from the Programmes tab)\n• The session for today hasn\'t been scheduled by your coach\n• You\'ve already completed today\'s session (you\'ll see "Do Again" instead)\n\nIf the button remains disabled after enrolling, contact your coach to confirm your plan is set up.',
        related: ['How do I start a workout?', 'How do I switch programmes?', 'How do I contact my coach?'],
        proOnly: true,
      },
      {
        q: 'Can I skip exercises?',
        a: 'In the manual checklist mode, you can simply not tick an exercise — it won\'t be marked complete. In coach-assigned sessions, you can navigate past exercises. However, skipping frequently will lower your Alignment Score, which affects your weekly stats and progress reports.',
        related: ['How do I start a workout?', 'What is the Alignment Score?'],
      },
      {
        q: 'How do I log manual workout items?',
        a: 'In the Workout tab, select the day of the week, then tap items to toggle them complete (they show a ✓ and a timestamp). Each section (Warm-up, Workout, Cool-down, Water, Food) has a "select all" option. When done, tap Save to record your progress for that day.',
        related: ['How do I start a workout?', 'How is Alignment Score calculated?'],
      },
      {
        q: 'How do I set my workout start date?',
        a: 'The first time you open the Workout tab, you\'ll be asked to set your programme start date. This determines which week\'s content you see. If you need to reset your start date, contact your coach.',
        related: ['How do I start a workout?', 'How long does a programme last?'],
        proOnly: true,
      },
    ],
  },
  {
    id: 'nutrition',
    icon: '🍎',
    title: 'Nutrition & Food',
    color: '#F59E0B',
    items: [
      {
        q: 'How do I track food?',
        a: 'Food tracking is built into the Workout tab daily checklist. Each day has a Food section (🍽) with programme-specific nutrition targets — for example, vegetables, protein portions, whole grains, and items to avoid. Tick them off as you complete them during the day. Your Food Score contributes to your overall Alignment.',
        related: ['How is Food Score calculated?', 'What if I miss a meal?', 'What are my nutrition targets?'],
        proOnly: true,
      },
      {
        q: 'How is Food Score calculated?',
        a: 'Your Food Score is the percentage of food checklist items you complete in a day. Completing all food items = 100% food score. This combines with workout and water completion to give your overall Alignment Score for the day.',
        related: ['How is Alignment Score calculated?', 'How do I track food?'],
      },
      {
        q: 'What are my nutrition targets?',
        a: 'Nutrition targets are programme-specific. For example:\n\n• Posture Recode Protocol — protein targets by body weight, anti-inflammatory foods, reduced alcohol\n• Metabolic Reversal System — calorie periodisation, insulin-sensitive meals\n• Future Body Reset — full macro tracking with fibre, protein, complex carbs\n\nOpen the Food section in your daily workout checklist to see your specific targets.',
        related: ['How do I track food?', 'Which programme is right for me?'],
        proOnly: true,
      },
      {
        q: 'What if I miss a meal or forget to log?',
        a: 'You can update your workout checklist for past days within the current week. Navigate to the relevant day in the Workout tab and tick the items you completed. However, entries older than the current week cannot be modified, so try to log daily.',
        related: ['How do I track food?', 'How is Alignment Score calculated?'],
      },
      {
        q: 'How do I add and track my food?',
        a: 'In the Workout tab, scroll to the Food area. It\'s split into 5 sections — Morning Drink, Breakfast, Lunch, Evening Snacks, and Dinner. Tap the "+" on any section to add a food item: either pick one from the curated list (with calories and macros pre-filled) or write your own and fill in Quantity, Calories, Protein, Carbs, and Fat. Tick items off as you eat them — the nutrition rings above update live with your totals for the day.',
        related: ['What if I miss a meal or forget to log?', 'How is Food Score calculated?'],
      },
    ],
  },
  {
    id: 'water',
    icon: '💧',
    title: 'Water Tracker',
    color: '#3B82F6',
    items: [
      {
        q: 'How many glasses should I drink?',
        a: 'The general target in BioRealign is 8–10 glasses (2–2.5 litres) per day. Your workout checklist has specific water timing cues:\n\n• Morning — 1–2 glasses on waking\n• Pre-workout — 1 glass 30 mins before\n• During workout — sip every 15 minutes\n• Post-workout — 2 glasses to rehydrate\n• Evening — 1 glass before sleep\n\nStay consistent — hydration directly affects your energy levels and recovery.',
        related: ['How is Water Score calculated?', 'How do I log water intake?', 'How do I improve recovery?'],
      },
      {
        q: 'How do I log water intake?',
        a: 'Water is tracked in the Workout tab daily checklist under the Water (💧) section. Each water goal is a toggleable item — tick it when you drink. You can also log water glasses directly in the Daily Check-In flow if your programme includes it as a metric.',
        related: ['How many glasses should I drink?', 'How is Water Score calculated?'],
      },
      {
        q: 'How is Water Score calculated?',
        a: 'Water Score is the percentage of your daily water checklist items you complete. If your checklist has 5 water checkpoints and you complete 4, your Water Score for that day is 80%. This contributes to your overall daily Alignment Score.',
        related: ['How many glasses should I drink?', 'How is Alignment Score calculated?'],
      },
    ],
  },
  {
    id: 'recovery',
    icon: '🌙',
    title: 'Recovery & Sleep',
    color: '#A78BFA',
    items: [
      {
        q: 'How do I improve my Recovery Score?',
        a: 'Recovery Score is most influenced by sleep (35% weight). To improve it:\n\n🌙 Sleep 8–9 hours consistently — even one good night makes a measurable difference\n💊 Manage pain — address sources of chronic pain with your coach\n⚡ Improve energy — stay hydrated, eat well, limit caffeine after 2pm\n😊 Support mood — movement, sunlight, and social connection all help\n\nSmall, consistent improvements across all four areas compound quickly.',
        related: ['What is Recovery Score?', 'What affects sleep score?', 'What is Longevity Score?'],
      },
      {
        q: 'What affects my sleep score?',
        a: 'Your sleep score comes from the Sleep hours you log in the Daily Check-In (0–12 hours). The visual moon phase tracks your entry:\n\n• 0–4h — new/crescent moon 🌑\n• 5–7h — half moon 🌓, stars appear\n• 8–9h — nearly full moon 🌕\n• 10–11h — full moon with halo ✨\n• 12h — full glow + 💤 animation\n\nFor maximum Recovery Score, aim for 8+ hours. Sleep has a 35% weight in Recovery.',
        related: ['How do I improve my Recovery Score?', 'What is Recovery Score?'],
      },
      {
        q: 'What affects Longevity Score?',
        a: 'Longevity is a blend of Fitness (40%) and Recovery (60%). Since Recovery depends heavily on sleep and pain, the biggest levers for Longevity are:\n\n1. Consistent 8+ hour sleep\n2. Managing pain levels\n3. High energy (hydration, nutrition, movement)\n4. Positive mood (stress management, exercise)\n\nLongevity is designed to be the hardest score to maximise — it requires holistic balance.',
        related: ['What is Longevity Score?', 'How do I improve my Recovery Score?', 'What is Recovery Score?'],
      },
    ],
  },
  {
    id: 'account',
    icon: '👤',
    title: 'Account & Profile',
    color: '#10B981',
    items: [
      {
        q: 'How do I edit my profile?',
        a: 'Go to Menu (bottom nav) → your profile page. Tap the "✏️ Edit profile" button to update your full name and phone number. Profile changes are saved instantly.',
        related: ['How do I reset my password?', 'Can I change my email?'],
      },
      {
        q: 'How do I complete my assessment?',
        a: 'Go to Menu → Assessment tab. If your assessment is incomplete, you\'ll see a progress bar and a "Continue Assessment →" button. Tap it to resume from where you left off. The assessment has 5 stages covering personal baseline, body & health, movement, nutrition, and goals. You can skip individual stages and come back later.',
        related: ['How do I start my first programme?', 'How does BioRealign work?'],
        proOnly: true,
      },
      {
        q: 'How do I reset my password?',
        a: `On the login screen, there is currently no "Forgot password" link in the app — please contact support at ${SUPPORT_EMAIL} with your registered email and we'll send a password reset link directly.`,
        related: ['Can I change my email?', 'How do I delete my account?'],
      },
      {
        q: 'Can I change my email?',
        a: `Email changes require identity verification. Please contact ${SUPPORT_EMAIL} with your current registered email and your desired new email. Our team will process the change securely within 24–48 hours.`,
        related: ['How do I reset my password?', 'How do I edit my profile?'],
      },
      {
        q: 'How do I delete my account?',
        a: `To request account deletion, email ${SUPPORT_EMAIL} from your registered email address with the subject "Account Deletion Request". We will delete all your data within 30 days as per our Privacy Policy. Note: this action is irreversible.`,
        related: ['How do I edit my profile?', 'How do I reset my password?'],
      },
    ],
  },
];

// ── Quick chips shown on the home view ──────────────────────────────────────
const QUICK_CHIPS = [
  { label: '⚡ Recovery Score?',   q: 'What is Recovery Score?' },
  { label: '💧 Water Score?',       q: 'How is Water Score calculated?' },
  { label: '💪 Start Workout?',     q: 'How do I start a workout?' },
  { label: '🍎 Food Tracker?',      q: 'How do I add and track my food?' },
  { label: '🌙 Sleep Score?',       q: 'What affects my sleep score?' },
  { label: '🎯 Daily Check-In?',    q: 'How do I complete Daily Check-In?' },
  { label: '📈 Progress Report?',   q: 'What is the Alignment Score?' },
  { label: '📊 What scores mean?',  q: 'What do the scores mean?' },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Curated-programme Q&A is deferred for Lite mode (see PROGRAMS_ENABLED) —
// filtered out here rather than deleted from CATEGORIES, so it reappears
// automatically once Programs ships instead of needing to be re-written.
const VISIBLE_CATEGORIES: Category[] = CATEGORIES
  .filter(cat => !cat.proOnly || PROGRAMS_ENABLED)
  .map(cat => ({ ...cat, items: cat.items.filter(it => !it.proOnly || PROGRAMS_ENABLED) }))
  .filter(cat => cat.items.length > 0);

function findQA(question: string): QA | undefined {
  for (const cat of VISIBLE_CATEGORIES) {
    const item = cat.items.find(it => it.q === question);
    if (item) return item;
  }
}

function searchQA(query: string): QA[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: QA[] = [];
  for (const cat of VISIBLE_CATEGORIES) {
    for (const item of cat.items) {
      if (item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)) {
        results.push(item);
      }
    }
  }
  return results.slice(0, 6);
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED AVATAR
// ─────────────────────────────────────────────────────────────────────────────

function AvatarBreathing() {
  const scale = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.06, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 0.9,  duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1,    duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glow,  { toValue: 0.4,  duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, []);

  return (
    <View style={{ alignItems: 'center', marginBottom: 8 }}>
      {/* Outer glow ring */}
      <Animated.View style={{
        position: 'absolute',
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: THEME.colors.teal,
        opacity: glow,
        transform: [{ scale }],
      }} />
      {/* Avatar circle */}
      <Animated.View style={{
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: '#0D2E2C',
        borderWidth: 2, borderColor: THEME.colors.teal,
        alignItems: 'center', justifyContent: 'center',
        transform: [{ scale }],
      }}>
        <Text style={{ fontSize: 30 }}>🤖</Text>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────────────────────────────────────

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 400, useNativeDriver: true }),
          Animated.delay((2 - i) * 200),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1A1A1E', borderRadius: 16, borderTopLeftRadius: 4, alignSelf: 'flex-start', marginLeft: 52 }}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: THEME.colors.teal, opacity: dot }} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT BUBBLE
// ─────────────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  type: 'user' | 'bot';
  text: string;
  related?: string[];
}

function ChatBubble({ msg, onRelated }: { msg: Message; onRelated: (q: string) => void }) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const isUser = msg.type === 'user';

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }], marginBottom: 12 }}>
      {!isUser && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          {/* Bot avatar */}
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0D2E2C', borderWidth: 1.5, borderColor: THEME.colors.teal, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <Text style={{ fontSize: 16 }}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal, marginBottom: 4, letterSpacing: 0.5 }}>BioRealign Assistant</Text>
            <View style={{ backgroundColor: '#1A1A1E', borderRadius: 16, borderTopLeftRadius: 4, padding: 14 }}>
              <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary, lineHeight: 22 }}>{msg.text}</Text>
            </View>
            {msg.related && msg.related.length > 0 && (
              <View style={{ marginTop: 10, gap: 6 }}>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>Related questions</Text>
                {msg.related.map(rq => (
                  <TouchableOpacity key={rq} onPress={() => onRelated(rq)} activeOpacity={0.7}
                    style={{ backgroundColor: `${THEME.colors.teal}12`, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.5, borderColor: `${THEME.colors.teal}30`, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.teal, flex: 1, lineHeight: 18 }}>• {rq}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {isUser && (
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ backgroundColor: THEME.colors.teal, borderRadius: 16, borderTopRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '78%' }}>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sans, color: '#000', lineHeight: 20 }}>{msg.text}</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY CARD
// ─────────────────────────────────────────────────────────────────────────────

function CategoryCard({ cat, onQuestion }: { cat: Category; onQuestion: (q: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 14, marginBottom: 10, borderWidth: 0.5, borderColor: THEME.colors.border, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.8}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}
      >
        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${cat.color}18`, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{cat.title}</Text>
        <Text style={{ color: THEME.colors.textMuted, fontSize: 16, transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>›</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={{ borderTopWidth: 0.5, borderTopColor: THEME.colors.border }}>
          {cat.items.map((item, i) => (
            <TouchableOpacity
              key={item.q}
              onPress={() => onQuestion(item.q)}
              activeOpacity={0.7}
              style={{ paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: THEME.colors.border }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cat.color, flexShrink: 0, marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 20 }}>{item.q}</Text>
              <Text style={{ color: THEME.colors.textMuted, fontSize: 14 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH RESULTS
// ─────────────────────────────────────────────────────────────────────────────

function SearchResults({ results, onQuestion }: { results: QA[]; onQuestion: (q: string) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [results.length]);

  if (!results.length) {
    return (
      <Animated.View style={{ opacity, alignItems: 'center', paddingVertical: 32, gap: 8 }}>
        <Text style={{ fontSize: 28 }}>🔍</Text>
        <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>No results found</Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Try a different keyword</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity, gap: 8 }}>
      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
        {results.length} result{results.length > 1 ? 's' : ''}
      </Text>
      {results.map(item => (
        <TouchableOpacity
          key={item.q}
          onPress={() => onQuestion(item.q)}
          activeOpacity={0.7}
          style={{ backgroundColor: THEME.colors.surface2, borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <Text style={{ fontSize: 18 }}>💬</Text>
          <Text style={{ flex: 1, fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 20 }}>{item.q}</Text>
          <Text style={{ color: THEME.colors.textMuted, fontSize: 14 }}>›</Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function SupportScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<QA[]>([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [isTyping, setIsTyping]           = useState(false);
  const [view, setView]                   = useState<'home' | 'chat'>('home');

  // Handle search
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (text.trim().length > 1) {
      setIsSearching(true);
      setSearchResults(searchQA(text));
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  }, []);

  // Ask a question — shows typing then answer
  const askQuestion = useCallback((question: string) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setIsSearching(false);
    setView('chat');

    const userMsg: Message = { id: Date.now().toString(), type: 'user', text: question };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const qa = findQA(question);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: qa?.a ?? `I don't have a specific answer for that yet. Please contact ${SUPPORT_EMAIL} and we'll help you directly.`,
        related: qa?.related,
      };
      setIsTyping(false);
      setMessages(prev => [...prev, botMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 900 + Math.random() * 400);
  }, []);

  const goHome = () => {
    setView('home');
    setMessages([]);
    setSearchQuery('');
    setIsSearching(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Header ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: THEME.colors.border }}>
          {view === 'chat' ? (
            <TouchableOpacity onPress={goHome} style={{ marginRight: 12, padding: 4 }}>
              <Text style={{ fontSize: 22, color: THEME.colors.textPrimary }}>←</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
              <Text style={{ fontSize: 22, color: THEME.colors.textPrimary }}>←</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>💬 BioRealign Assistant</Text>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
              {view === 'chat' ? 'Conversation active' : 'How can I help you today?'}
            </Text>
          </View>
          {view === 'chat' && (
            <TouchableOpacity onPress={goHome} style={{ backgroundColor: THEME.colors.surface2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 0.5, borderColor: THEME.colors.border }}>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted }}>New chat</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Search Bar ── */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: isSearching ? 0.5 : 0, borderBottomColor: THEME.colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.colors.surface2, borderRadius: 12, paddingHorizontal: 12, borderWidth: 0.5, borderColor: isSearching ? THEME.colors.teal : THEME.colors.border, gap: 8 }}>
            <Text style={{ fontSize: 16, color: THEME.colors.textMuted }}>🔍</Text>
            <TextInput
              style={{ flex: 1, paddingVertical: 11, fontSize: 14, fontFamily: THEME.fonts.sans, color: THEME.colors.textPrimary }}
              placeholder="Search your question..."
              placeholderTextColor={THEME.colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (searchResults.length > 0) askQuestion(searchResults[0].q);
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Text style={{ fontSize: 16, color: THEME.colors.textMuted }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Search Results overlay ── */}
        {isSearching && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <SearchResults results={searchResults} onQuestion={askQuestion} />
          </ScrollView>
        )}

        {/* ── Home View ── */}
        {!isSearching && view === 'home' && (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Avatar */}
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <AvatarBreathing />
              <Text style={{ fontSize: 18, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary, marginTop: 12, marginBottom: 4 }}>
                Ask me anything
              </Text>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center' }}>
                about BioRealign — programmes, scores, workouts, nutrition and more.
              </Text>
            </View>

            {/* Quick chips */}
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              Quick questions
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {QUICK_CHIPS.map(chip => (
                <TouchableOpacity
                  key={chip.q}
                  onPress={() => askQuestion(chip.q)}
                  activeOpacity={0.75}
                  style={{ backgroundColor: THEME.colors.surface2, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 0.5, borderColor: THEME.colors.border }}
                >
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary }}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Categories */}
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              Browse by topic
            </Text>
            {VISIBLE_CATEGORIES.map(cat => (
              <CategoryCard key={cat.id} cat={cat} onQuestion={askQuestion} />
            ))}

            {/* Contact footer */}
            <View style={{ marginTop: 8, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>Still need help?</Text>
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Reach our team at</Text>
              <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>{SUPPORT_EMAIL}</Text>
            </View>
          </ScrollView>
        )}

        {/* ── Chat View ── */}
        {!isSearching && view === 'chat' && (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {/* Welcome message */}
            <ChatBubble
              msg={{
                id: 'welcome',
                type: 'bot',
                text: 'Hi! I\'m the BioRealign Assistant. Ask me anything about your programme, scores, workouts, or account — I\'m here to help.',
                related: undefined,
              }}
              onRelated={askQuestion}
            />

            {messages.map(msg => (
              <ChatBubble key={msg.id} msg={msg} onRelated={askQuestion} />
            ))}

            {isTyping && <TypingIndicator />}

            {/* Bottom chips after at least one exchange */}
            {messages.length > 0 && !isTyping && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
                  Quick follow-ups
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                  {QUICK_CHIPS.slice(0, 4).map(chip => (
                    <TouchableOpacity
                      key={chip.q}
                      onPress={() => askQuestion(chip.q)}
                      activeOpacity={0.75}
                      style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 0.5, borderColor: THEME.colors.border }}
                    >
                      <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary }}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
