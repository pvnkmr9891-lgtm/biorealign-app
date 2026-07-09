import { useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
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

export default function AchievementsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { phases, totalEarned, totalBadges } = useBadgeProgress();
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

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

      {/* Page dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 20 }}>
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
    </SafeAreaView>
  );
}
