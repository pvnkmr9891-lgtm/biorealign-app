import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBadgeProgress, BadgeState, PhaseState } from '@/hooks/useBadgeProgress';
import { THEME } from '@/constants/theme';

const CARD_MARGIN = 24;

function BadgeCell({ badge, locked }: { badge: BadgeState; locked: boolean }) {
  const dimmed = locked || !badge.earned;
  return (
    <View style={{ width: '33.33%', alignItems: 'center', paddingVertical: 10 }}>
      <View style={{
        width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
        backgroundColor: dimmed ? 'rgba(255,255,255,0.05)' : `${THEME.colors.amber}18`,
        borderWidth: 0.5, borderColor: dimmed ? 'rgba(255,255,255,0.08)' : `${THEME.colors.amber}35`,
        opacity: dimmed ? 0.4 : 1,
      }}>
        <Text style={{ fontSize: 22 }}>{badge.icon}</Text>
        {locked && (
          <View style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
            <Text style={{ fontSize: 9 }}>🔒</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: dimmed ? THEME.colors.textMuted : THEME.colors.textPrimary, textAlign: 'center', marginTop: 6, lineHeight: 14 }}>
        {badge.label}
      </Text>
      {!locked && !badge.earned && (
        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 2 }}>
          {Math.min(badge.progress, badge.threshold)}/{badge.threshold}
        </Text>
      )}
    </View>
  );
}

function PhaseCard({ phase, index, width }: { phase: PhaseState; index: number; width: number }) {
  return (
    <View style={{ width, paddingHorizontal: CARD_MARGIN }}>
      <View style={{
        backgroundColor: THEME.colors.surface2, borderRadius: 18, padding: 20,
        borderWidth: phase.complete ? 1 : 0.5,
        borderColor: phase.complete ? 'rgba(255,215,0,0.4)' : THEME.colors.border,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Phase {index + 1}{phase.complete ? '  🏆' : phase.locked ? '  🔒' : ''}
          </Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11.5 }}>
            {phase.locked ? 'Locked' : `${phase.earnedCount}/${phase.badges.length}`}
          </Text>
        </View>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 22, marginBottom: 4 }}>
          {phase.name}
        </Text>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12.5, lineHeight: 17, marginBottom: 14 }}>
          {phase.subtitle}
        </Text>

        {!phase.locked && (
          <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
            <View style={{ height: '100%', width: `${(phase.earnedCount / phase.badges.length) * 100}%`, backgroundColor: phase.complete ? '#FFD700' : THEME.colors.teal, borderRadius: 3 }} />
          </View>
        )}

        {phase.locked && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, marginBottom: 6 }}>
            <Text style={{ fontSize: 15 }}>🔒</Text>
            <Text style={{ flex: 1, fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, lineHeight: 17 }}>
              Complete Phase {index} to unlock this phase.
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: phase.locked ? 4 : -4 }}>
          {phase.badges.map((b) => (
            <BadgeCell key={b.id} badge={b} locked={phase.locked} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Swipe hint — a small pulsing chevron near the card's right edge, only
//    shown on the first phase before the user has ever swiped ─────────────
function SwipeHintChevron() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const translateX = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });
  const opacity     = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', right: 8, top: '50%', marginTop: -14,
      opacity, transform: [{ translateX }],
    }}>
      <Text style={{ fontSize: 26, color: THEME.colors.teal }}>›</Text>
    </Animated.View>
  );
}

// ── Next Badge spotlight — the single closest-to-earning badge across every
//    unlocked phase, filling the space below the phase pager with something
//    actionable instead of empty background ─────────────────────────────────
function findSpotlight(phases: PhaseState[]): BadgeState | null {
  let best: BadgeState | null = null;
  let bestPct = -1;
  for (const phase of phases) {
    if (phase.locked) continue;
    for (const b of phase.badges) {
      if (b.earned) continue;
      const pct = b.progress / b.threshold;
      if (pct > bestPct) { bestPct = pct; best = b; }
    }
  }
  return best;
}

function SpotlightCard({ phases }: { phases: PhaseState[] }) {
  const spotlight = useMemo(() => findSpotlight(phases), [phases]);

  if (!spotlight) {
    return (
      <View style={{ marginHorizontal: 24, alignItems: 'center', paddingVertical: 8 }}>
        <Text style={{ fontSize: 32, marginBottom: 8 }}>🎉</Text>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 18, textAlign: 'center' }}>
          Every badge earned!
        </Text>
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12.5, textAlign: 'center', marginTop: 4 }}>
          You've cleared all 4 phases. Legendary.
        </Text>
      </View>
    );
  }

  const remaining = Math.max(0, spotlight.threshold - spotlight.progress);
  const pct = Math.min(1, spotlight.progress / spotlight.threshold);

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: THEME.colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: `${THEME.colors.teal}18`, borderWidth: 0.5, borderColor: `${THEME.colors.teal}35`, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 22 }}>{spotlight.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>
          Next Badge
        </Text>
        <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.sansMedium, fontSize: 14.5 }}>
          {remaining} {remaining === 1 ? 'to go' : 'away'}: {spotlight.label}
        </Text>
        <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
          <View style={{ height: '100%', width: `${pct * 100}%`, backgroundColor: THEME.colors.teal, borderRadius: 3 }} />
        </View>
      </View>
    </View>
  );
}

export default function AchievementsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { phases, totalEarned, totalBadges } = useBadgeProgress();
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // One-time "wiggle" nudge — peeks toward Phase 2 briefly on first load so
  // it's obvious the page swipes, then eases back. Only worth doing when
  // there's more than one phase to reveal.
  useEffect(() => {
    if (phases.length < 2) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 40, animated: true });
      setTimeout(() => scrollRef.current?.scrollTo({ x: 0, animated: true }), 380);
    }, 500);
    return () => clearTimeout(t);
  }, [phases.length]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setPageIndex(idx);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ color: THEME.colors.textPrimary, fontFamily: THEME.fonts.serif, fontSize: 28 }}>Milestones</Text>
          <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 12, marginTop: 2 }}>
            {totalEarned} of {totalBadges} badges earned
          </Text>
        </View>
      </View>

      <View style={{ position: 'relative' }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          style={{ marginTop: 20 }}
          contentContainerStyle={{ paddingBottom: 4 }}
        >
          {phases.map((phase, i) => (
            <PhaseCard key={phase.id} phase={phase} index={i} width={width} />
          ))}
        </ScrollView>
        {pageIndex === 0 && phases.length > 1 && <SwipeHintChevron />}
      </View>

      {/* Page dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 14 }}>
        {phases.map((_, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => { scrollRef.current?.scrollTo({ x: i * width, animated: true }); setPageIndex(i); }}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <View style={{
              width: pageIndex === i ? 18 : 6, height: 6, borderRadius: 3,
              backgroundColor: pageIndex === i ? THEME.colors.teal : 'rgba(255,255,255,0.15)',
            }} />
          </TouchableOpacity>
        ))}
      </View>

      {pageIndex === 0 && phases.length > 1 && (
        <Text style={{ color: THEME.colors.textMuted, fontFamily: THEME.fonts.sans, fontSize: 11.5, textAlign: 'center', marginBottom: 16 }}>
          Swipe for Phase 2 →
        </Text>
      )}

      {/* Fills the remaining space with something actionable instead of empty background */}
      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 24 }}>
        <SpotlightCard phases={phases} />
      </View>
    </SafeAreaView>
  );
}
