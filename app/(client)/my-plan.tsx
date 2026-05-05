import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClientPlan, useTodayPlanItems, useToggleItemComplete } from '@/hooks/usePlans';

const BRAND = {
  bg: '#0A0A0B', surface: '#141416', border: '#2A2A2E',
  text: '#F0EEE8', textMuted: '#6B6B70', teal: '#00C4B4', amber: '#E8A44A',
};

const TRACK_META: Record<string, { emoji: string; color: string; label: string }> = {
  workout:      { emoji: '🏋️', color: '#00C4B4', label: 'Workout' },
  nutrition:    { emoji: '🥗', color: '#E8A44A', label: 'Nutrition' },
  recovery:     { emoji: '😴', color: '#A78BFA', label: 'Recovery' },
  lifestyle:    { emoji: '🌿', color: '#34D399', label: 'Lifestyle' },
  posture_rehab:{ emoji: '🩺', color: '#F87171', label: 'Posture/Rehab' },
  mindset:      { emoji: '🧘', color: '#60A5FA', label: 'Mindset' },
};

const ITEM_TYPE_ICON: Record<string, string> = {
  exercise:   '💪',
  meal_guide: '🍽️',
  protocol:   '📋',
  habit:      '✅',
  note:       '📝',
};

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function PlanItemCard({ item, onToggle }: { item: any; onToggle: () => void }) {
  const meta = TRACK_META[item.track?.track_type ?? ''] ?? { color: BRAND.teal, emoji: '📌' };
  const isCompleted = item.is_completed;

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={{
        backgroundColor: isCompleted ? '#141416' : BRAND.surface,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1.5,
        borderColor: isCompleted ? `${BRAND.teal}40` : BRAND.border,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        marginBottom: 10,
        opacity: isCompleted ? 0.75 : 1,
      }}
    >
      {/* Completion circle */}
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: 2,
          borderColor: isCompleted ? BRAND.teal : BRAND.border,
          backgroundColor: isCompleted ? BRAND.teal : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        {isCompleted && (
          <Text style={{ fontSize: 12, color: BRAND.bg, fontFamily: 'DMSans-Bold' }}>✓</Text>
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {/* Track badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
          <Text style={{ fontSize: 11 }}>{meta.emoji}</Text>
          <Text style={{ fontSize: 10, fontFamily: 'DMSans-Medium', color: meta.color, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            {item.track?.title ?? 'Plan'}
          </Text>
          <Text style={{ fontSize: 10, color: BRAND.textMuted, fontFamily: 'DMSans-Regular' }}>
            · {ITEM_TYPE_ICON[item.item_type]} {item.item_type}
          </Text>
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 15,
            fontFamily: 'DMSans-Bold',
            color: isCompleted ? BRAND.textMuted : BRAND.text,
            textDecorationLine: isCompleted ? 'line-through' : 'none',
            marginBottom: 4,
          }}
        >
          {item.title}
        </Text>

        {/* Description */}
        {item.description ? (
          <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, lineHeight: 20, marginBottom: 6 }}>
            {item.description}
          </Text>
        ) : null}

        {/* Meta row: sets/reps/duration */}
        {(item.sets || item.reps || item.duration_minutes) ? (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 6 }}>
            {item.sets && item.reps && (
              <View style={{ backgroundColor: `${meta.color}18`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: meta.color }}>
                  {item.sets} × {item.reps}
                </Text>
              </View>
            )}
            {item.duration_minutes && (
              <View style={{ backgroundColor: `${BRAND.amber}18`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: BRAND.amber }}>
                  ⏱ {item.duration_minutes} min
                </Text>
              </View>
            )}
            {item.rest_seconds && (
              <View style={{ backgroundColor: `${BRAND.textMuted}18`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>
                  Rest {item.rest_seconds}s
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Coach note */}
        {item.coach_note ? (
          <View style={{ backgroundColor: `${BRAND.amber}12`, borderRadius: 8, padding: 8, borderLeftWidth: 2, borderLeftColor: BRAND.amber }}>
            <Text style={{ fontSize: 12, fontFamily: 'DMSans-Regular', color: BRAND.amber, lineHeight: 18 }}>
              💬 {item.coach_note}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function MyPlanScreen() {
  const todayFull = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayIdx  = DAYS_FULL.indexOf(todayFull);

  const [selectedDay, setSelectedDay] = useState(todayFull);

  const { data: plan, isLoading: planLoading } = useClientPlan();
  const { data: todayItems = [], isLoading: itemsLoading } = useTodayPlanItems();
  const toggleComplete = useToggleItemComplete();

  const completedCount = todayItems.filter((i: any) => i.is_completed).length;
  const totalCount     = todayItems.length;
  const completionPct  = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 }}>
          <Text style={{ fontSize: 11, color: BRAND.teal, fontFamily: 'DMSans-Medium', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Your Plan
          </Text>
          <Text style={{ fontSize: 28, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text }}>
            {plan?.title ?? 'My Plan'}
          </Text>
          {plan && (
            <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, marginTop: 4 }}>
              Phase {plan.current_phase} of {plan.total_phases}
            </Text>
          )}
        </View>

        {/* Day selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          {DAYS_FULL.map((day, i) => {
            const isToday    = day === todayFull;
            const isSelected = day === selectedDay;
            return (
              <TouchableOpacity
                key={day}
                onPress={() => setSelectedDay(day)}
                style={{
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: isSelected ? BRAND.teal : BRAND.border,
                  backgroundColor: isSelected ? `${BRAND.teal}18` : BRAND.surface,
                  minWidth: 52,
                }}
              >
                <Text style={{ fontSize: 11, fontFamily: 'DMSans-Medium', color: isSelected ? BRAND.teal : BRAND.textMuted }}>
                  {DAYS_SHORT[i]}
                </Text>
                {isToday && (
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: BRAND.teal, marginTop: 4 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Progress bar (only for today) */}
        {selectedDay === todayFull && totalCount > 0 && (
          <View style={{ marginHorizontal: 24, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans-Medium', color: BRAND.textMuted }}>
                Today's progress
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans-Bold', color: BRAND.teal }}>
                {completedCount}/{totalCount} · {completionPct}%
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: BRAND.surface, borderRadius: 3, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  width: `${completionPct}%`,
                  backgroundColor: BRAND.teal,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        )}

        {/* Plan content */}
        <View style={{ paddingHorizontal: 24 }}>
          {planLoading || itemsLoading ? (
            <ActivityIndicator color={BRAND.teal} style={{ marginTop: 40 }} />
          ) : !plan ? (
            // No plan yet
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>📋</Text>
              <Text style={{ fontSize: 20, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, textAlign: 'center', marginBottom: 8 }}>
                Your plan is being built
              </Text>
              <Text style={{ fontSize: 14, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, textAlign: 'center', lineHeight: 22 }}>
                Your coach is building your personalised plan. You'll be notified as soon as it's ready.
              </Text>
            </View>
          ) : todayItems.length === 0 ? (
            // Plan exists but no items today
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 32, marginBottom: 12 }}>🌿</Text>
              <Text style={{ fontSize: 17, fontFamily: 'DMSerifDisplay-Regular', color: BRAND.text, marginBottom: 8 }}>
                Rest day
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'DMSans-Regular', color: BRAND.textMuted, textAlign: 'center' }}>
                No items scheduled for {selectedDay}. Recovery is part of the plan.
              </Text>
            </View>
          ) : (
            // Show items
            <>
              {completionPct === 100 && (
                <View style={{ backgroundColor: `${BRAND.teal}15`, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: `${BRAND.teal}30`, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 24 }}>🎉</Text>
                  <Text style={{ fontSize: 15, fontFamily: 'DMSans-Bold', color: BRAND.teal, flex: 1 }}>
                    All done for today! Great work.
                  </Text>
                </View>
              )}

              {todayItems.map((item: any) => (
                <PlanItemCard
                  key={item.id}
                  item={item}
                  onToggle={() => toggleComplete.mutate({
                    itemId: item.id,
                    isCompleted: item.is_completed,
                  })}
                />
              ))}
            </>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
