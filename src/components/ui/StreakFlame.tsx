import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { THEME } from '@/constants/theme';

// Visual growth caps at day 30 — size and glow scale linearly up to that point
const MIN_SIZE   = 28;
const MAX_SIZE   = 46;
const GLOW_MAX   = 22;
const GROWTH_CAP = 30;

function flameParams(streak: number) {
  const t    = Math.min(streak, GROWTH_CAP) / GROWTH_CAP; // 0 → 1
  const size = MIN_SIZE + t * (MAX_SIZE - MIN_SIZE);
  const glow = t * GLOW_MAX;
  // Colour shifts from amber → deep orange → red-orange as streak grows
  const r = Math.round(232 + t * 23);   // 232 → 255
  const g = Math.round(164 - t * 100);  // 164 → 64
  const b = 0;
  const color = `rgb(${r},${g},${b})`;
  return { size, glow, color };
}

// ── Compact badge for home page header ───────────────────────────────────────
export function StreakBadge({
  streak,
  freezeBanked,
}: {
  streak:       number;
  freezeBanked: boolean;
}) {
  const { size, glow, color } = flameParams(streak);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [streak]);

  if (streak === 0) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
        <Text style={{ fontSize: 16 }}>🔥</Text>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>No streak yet</Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }],
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: glow > 0 ? 0.85 : 0,
          shadowRadius: glow,
          elevation: Math.round(glow / 2),
        }}
      >
        <Text style={{ fontSize: size * 0.7 }}>🔥</Text>
      </Animated.View>

      <View>
        <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color, lineHeight: 18 }}>
          {streak} day{streak !== 1 ? 's' : ''}
        </Text>
        {freezeBanked && (
          <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: '#60A5FA', lineHeight: 13 }}>
            🧊 freeze ready
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Full card for home page ───────────────────────────────────────────────────
export function StreakCard({
  streak,
  longestStreak,
  freezeBanked,
  planStartDate,
}: {
  streak:          number;
  longestStreak:   number;
  freezeBanked:    boolean;
  planStartDate:   string | null;
}) {
  const { size, glow, color } = flameParams(streak);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (streak === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [streak]);

  // Progress bar toward next milestone (10, 20, 30, 50, 100)
  const milestones = [7, 14, 21, 30, 50, 100];
  const nextMilestone = milestones.find(m => m > streak) ?? 100;
  const prevMilestone = milestones.filter(m => m <= streak).pop() ?? 0;
  const milestoneProgress = nextMilestone === prevMilestone
    ? 1
    : (streak - prevMilestone) / (nextMilestone - prevMilestone);

  const activeSince = planStartDate
    ? new Date(planStartDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <Animated.View style={{ opacity: fadeAnim, marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: streak > 0 ? `${color}30` : THEME.colors.border, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Flame + count */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }], shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: streak > 0 ? 0.8 : 0, shadowRadius: glow, elevation: Math.round(glow / 2) }}>
            <Text style={{ fontSize: size }}>🔥</Text>
          </Animated.View>

          <View>
            <Text style={{ fontSize: 32, fontFamily: THEME.fonts.sansMedium, color, lineHeight: 36 }}>
              {streak}
            </Text>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, letterSpacing: 0.5 }}>
              {streak === 1 ? 'day streak' : 'day streak'}
            </Text>
          </View>
        </View>

        {/* Right-side stats */}
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Best</Text>
            <Text style={{ fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
              {longestStreak}d 🏆
            </Text>
          </View>
          {freezeBanked ? (
            <View style={{ backgroundColor: 'rgba(96,165,250,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 0.5, borderColor: 'rgba(96,165,250,0.3)' }}>
              <Text style={{ fontSize: 12 }}>🧊</Text>
              <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: '#60A5FA' }}>Freeze ready</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
              Hit 100% to bank a freeze
            </Text>
          )}
        </View>
      </View>

      {/* Milestone progress */}
      {streak > 0 && (
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
              Next milestone: {nextMilestone} days
            </Text>
            <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color }}>
              {streak}/{nextMilestone}
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.round(milestoneProgress * 100)}%`, backgroundColor: color, borderRadius: 3 }} />
          </View>
        </View>
      )}

      {/* Empty state */}
      {streak === 0 && (
        <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 12, lineHeight: 20 }}>
          Hit 70%+ alignment today to start your streak. Sundays are rest days.
        </Text>
      )}

      {activeSince && (
        <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 8 }}>
          Plan started {activeSince}
        </Text>
      )}
    </Animated.View>
  );
}
