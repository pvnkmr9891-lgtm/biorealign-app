// app/(auth)/program-select.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PROGRAMS } from '@/constants/programs';
import { useOnboardingStore } from '@/store/onboardingStore';
import { THEME } from '@/constants/theme';

// ── Progress dots ─────────────────────────────────────────────
function ProgressDots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {[1, 2, 3].map(i => (
        <View key={i} style={[
          dots.dot,
          i === step && dots.dotActive,
          i < step && dots.dotDone,
        ]} />
      ))}
    </View>
  );
}
const dots = StyleSheet.create({
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { width: 20, backgroundColor: THEME.colors.teal },
  dotDone:   { backgroundColor: `${THEME.colors.teal}50` },
});

export default function ProgramSelectScreen() {
  const router = useRouter();
  const { programId, setProgram } = useOnboardingStore();
  const [selected, setSelected] = useState<string | null>(programId);

  function handleSelect(id: string) {
    setSelected(id);
    setProgram(id);
  }

  function handleNext() {
    if (!selected) return;
    router.push({ pathname: '/(auth)/program-detail', params: { programId: selected } } as any);
  }

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <ProgressDots step={1} />
        <View style={{ width: 40 }} />
      </View>

      {/* ── Title ── */}
      <View style={s.titleWrap}>
        <Text style={s.label}>Step 1 of 3</Text>
        <Text style={s.title}>Choose your programme</Text>
        <Text style={s.subtitle}>Select the transformation path that resonates most with your goals.</Text>
      </View>

      {/* ── Program list ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      >
        {PROGRAMS.map(prog => {
          const isSelected = selected === prog.id;
          return (
            <TouchableOpacity
              key={prog.id}
              style={[s.card, isSelected && { borderColor: prog.color, borderWidth: 1.5 }]}
              onPress={() => handleSelect(prog.id)}
              activeOpacity={0.8}
            >
              {/* Color accent */}
              <View style={[s.cardAccent, { backgroundColor: prog.color }]} />

              {/* Icon */}
              <View style={[s.iconWrap, { backgroundColor: `${prog.color}18` }]}>
                <Text style={s.icon}>{prog.icon}</Text>
              </View>

              {/* Text */}
              <View style={{ flex: 1 }}>
                <Text style={[s.cardName, isSelected && { color: prog.color }]}>{prog.name}</Text>
                <Text style={s.cardTagline} numberOfLines={1}>{prog.tagline}</Text>
              </View>

              {/* Selected check */}
              <View style={[s.checkCircle, isSelected && { backgroundColor: prog.color, borderColor: prog.color }]}>
                {isSelected && <Text style={s.checkTick}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Next button ── */}
      <View style={s.bottomWrap}>
        {!selected && (
          <Text style={s.hint}>Tap a programme to select it</Text>
        )}
        <TouchableOpacity
          style={[s.nextBtn, !selected && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={[s.nextBtnText, !selected && { color: 'rgba(0,0,0,0.4)' }]}>
            View programme details  →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: THEME.colors.background },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backArrow:{ color: THEME.colors.textPrimary, fontSize: 22 },

  titleWrap: { paddingHorizontal: 20, paddingBottom: 16 },
  label:    { color: THEME.colors.teal, fontSize: 11, fontFamily: THEME.fonts.sansMedium, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  title:    { color: THEME.colors.textPrimary, fontSize: 24, fontFamily: THEME.fonts.serif, marginBottom: 6 },
  subtitle: { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.sans, lineHeight: 20 },

  list: { paddingHorizontal: 16, paddingTop: 4 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: THEME.colors.surface2, borderRadius: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10, overflow: 'hidden',
  },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  iconWrap:   { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 },
  icon:       { fontSize: 22 },
  cardName:   { fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, marginBottom: 3 },
  cardTagline:{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted },
  checkCircle:{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 },
  checkTick:  { color: '#000', fontSize: 13, fontFamily: THEME.fonts.sansMedium },

  bottomWrap: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
  hint:       { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.sans, textAlign: 'center', marginBottom: 10 },
  nextBtn:    { backgroundColor: THEME.colors.teal, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: THEME.colors.teal, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  nextBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.1)', shadowOpacity: 0, elevation: 0 },
  nextBtnText:     { color: '#000', fontSize: 15, fontFamily: THEME.fonts.sansMedium },
});
