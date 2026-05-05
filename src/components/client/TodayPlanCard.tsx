// ============================================================
// ADD THIS COMPONENT to your existing app/(client)/index.tsx
// Import and place it after the ScorePanel and before ProtocolList
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTodayPlanItems } from '@/hooks/usePlans';
import { THEME } from '@/constants/theme';

const TRACK_META: Record<string, { emoji: string; color: string }> = {
  workout:      { emoji: '🏋️', color: '#00C4B4' },
  nutrition:    { emoji: '🥗', color: '#E8A44A' },
  recovery:     { emoji: '😴', color: '#A78BFA' },
  lifestyle:    { emoji: '🌿', color: '#34D399' },
  posture_rehab:{ emoji: '🩺', color: '#F87171' },
  mindset:      { emoji: '🧘', color: '#60A5FA' },
};

export function TodayPlanCard() {
  const router = useRouter();
  const { data: items = [], isLoading } = useTodayPlanItems();

  const completed = items.filter((i: any) => i.is_completed).length;
  const total     = items.length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (isLoading) {
    return (
      <View style={{ marginHorizontal: 24, marginBottom: 16, backgroundColor: THEME.colors.surface2, borderRadius: 14, padding: 20, borderWidth: 0.5, borderColor: THEME.colors.border, alignItems: 'center' }}>
        <ActivityIndicator color={THEME.colors.teal} />
      </View>
    );
  }

  if (total === 0) return null; // No plan items today — don't show card

  return (
    <TouchableOpacity
      onPress={() => router.push('/(client)/my-plan')}
      activeOpacity={0.85}
      style={{
        marginHorizontal: 24,
        marginBottom: 16,
        backgroundColor: THEME.colors.surface2,
        borderRadius: 14,
        padding: 16,
        borderWidth: 0.5,
        borderColor: pct === 100 ? `${THEME.colors.teal}40` : THEME.colors.border,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          Today's Plan
        </Text>
        <Text style={{ color: pct === 100 ? THEME.colors.teal : THEME.colors.textMuted, fontFamily: THEME.fonts.sansMedium, fontSize: 13 }}>
          {completed}/{total} done
        </Text>
      </View>

      {/* Progress bar */}
      <View style={{ height: 4, backgroundColor: THEME.colors.border, borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: THEME.colors.teal, borderRadius: 2 }} />
      </View>

      {/* Item previews */}
      <View style={{ gap: 8 }}>
        {items.slice(0, 3).map((item: any) => {
          const meta = TRACK_META[item.track?.track_type ?? ''] ?? { emoji: '📌', color: THEME.colors.teal };
          return (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: item.is_completed ? THEME.colors.teal : THEME.colors.border, backgroundColor: item.is_completed ? THEME.colors.teal : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {item.is_completed && <Text style={{ fontSize: 9, color: '#0A0A0B', fontFamily: THEME.fonts.sansBold }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 12, marginRight: 4 }}>{meta.emoji}</Text>
              <Text style={{ flex: 1, fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: item.is_completed ? THEME.colors.textMuted : THEME.colors.textPrimary, textDecorationLine: item.is_completed ? 'line-through' : 'none' }}>
                {item.title}
              </Text>
              {item.duration_minutes && (
                <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
                  {item.duration_minutes}m
                </Text>
              )}
            </View>
          );
        })}
        {total > 3 && (
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.teal, marginTop: 4 }}>
            +{total - 3} more · View all →
          </Text>
        )}
      </View>

      {pct === 100 && (
        <View style={{ marginTop: 12, backgroundColor: `${THEME.colors.teal}15`, borderRadius: 8, padding: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.teal }}>
            🎉 All done for today!
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
