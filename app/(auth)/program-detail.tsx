// app/(auth)/program-detail.tsx
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PROGRAMS } from '@/constants/programs';
import { THEME } from '@/constants/theme';

export default function ProgramDetailScreen() {
  const router = useRouter();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const prog = PROGRAMS.find(p => p.id === programId) ?? PROGRAMS[0];

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
          <Text style={s.backLabel}>Change</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Programme Overview</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={[s.hero, { borderColor: `${prog.color}30` }]}>
          <View style={[s.heroAccent, { backgroundColor: prog.color }]} />
          <View style={s.heroContent}>
            <View style={[s.heroIcon, { backgroundColor: `${prog.color}18` }]}>
              <Text style={s.heroIconText}>{prog.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.heroName, { color: prog.color }]}>{prog.name}</Text>
              <Text style={s.heroTagline}>{prog.tagline}</Text>
            </View>
          </View>
        </View>

        {/* ── Pillars ── */}
        <View style={s.pillarsRow}>
          {prog.pillars.map(p => (
            <View key={p} style={[s.pillar, { borderColor: `${prog.color}30`, backgroundColor: `${prog.color}0A` }]}>
              <Text style={[s.pillarText, { color: prog.color }]}>{p}</Text>
            </View>
          ))}
        </View>

        {/* ── Description ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>About this programme</Text>
          <Text style={s.description}>{prog.description}</Text>
        </View>

        {/* ── Benefits ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>What you'll achieve</Text>
          <View style={s.benefitsList}>
            {prog.benefits.map((b, i) => (
              <View key={i} style={s.benefitRow}>
                <View style={[s.benefitDot, { backgroundColor: prog.color }]} />
                <Text style={s.benefitText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Target ── */}
        <View style={s.targetCard}>
          <Text style={s.targetLabel}>Best suited for</Text>
          <Text style={s.targetText}>{prog.target}</Text>
        </View>

        {/* ── Personalise note ── */}
        <View style={[s.noteCard, { borderColor: `${prog.color}25`, backgroundColor: `${prog.color}06` }]}>
          <Text style={[s.noteTitle, { color: prog.color }]}>Up next: Personalise your plan</Text>
          <Text style={s.noteText}>
            In the next step, you'll choose your intensity level and training environment so we can build the exact plan your body and schedule need.
          </Text>
        </View>

      </ScrollView>

      {/* ── Next button ── */}
      <View style={s.bottomWrap}>
        <TouchableOpacity
          style={[s.nextBtn, { backgroundColor: prog.color, shadowColor: prog.color }]}
          onPress={() => router.push({ pathname: '/(auth)/intensity-select', params: { programId: prog.id } } as any)}
          activeOpacity={0.85}
        >
          <Text style={s.nextBtnText}>Personalise this programme  →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, width: 70 },
  backArrow:   { color: THEME.colors.teal, fontSize: 18 },
  backLabel:   { color: THEME.colors.teal, fontSize: 14, fontFamily: THEME.fonts.sans },
  headerTitle: { color: THEME.colors.textPrimary, fontSize: 16, fontFamily: THEME.fonts.sansMedium },

  scrollContent: { padding: 16, paddingBottom: 24 },

  // Hero
  hero: {
    backgroundColor: THEME.colors.surface2, borderRadius: 16,
    borderWidth: 1, overflow: 'hidden', marginBottom: 14,
  },
  heroAccent:   { height: 4, width: '100%' },
  heroContent:  { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  heroIcon:     { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heroIconText: { fontSize: 28 },
  heroName:     { fontSize: 17, fontFamily: THEME.fonts.sansMedium, marginBottom: 5 },
  heroTagline:  { fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 19 },

  pillarsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  pillar:     { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  pillarText: { fontSize: 12, fontFamily: THEME.fonts.sansMedium },

  section:      { marginBottom: 20 },
  sectionLabel: { color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sansMedium, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  description:  { color: THEME.colors.textSecondary, fontSize: 14, fontFamily: THEME.fonts.sans, lineHeight: 23 },

  benefitsList: { gap: 10 },
  benefitRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  benefitDot:   { width: 7, height: 7, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  benefitText:  { color: THEME.colors.textPrimary, fontSize: 14, fontFamily: THEME.fonts.sans, lineHeight: 22, flex: 1 },

  targetCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    padding: 14, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16,
  },
  targetLabel: { color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.sansMedium, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  targetText:  { color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.sans, lineHeight: 20 },

  noteCard:  { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  noteTitle: { fontSize: 13, fontFamily: THEME.fonts.sansMedium, marginBottom: 6 },
  noteText:  { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans, lineHeight: 20 },

  bottomWrap:  { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  nextBtn:     { borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  nextBtnText: { color: '#000', fontSize: 15, fontFamily: THEME.fonts.sansMedium },
});
