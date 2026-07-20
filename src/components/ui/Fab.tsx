// Floating action button with spring-expanding action stack — replaces
// grids of "Quick actions" cards so the scrollable page stays purely
// informational and every do-something verb lives in one predictable spot.
import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Pressable, StyleSheet } from 'react-native';
import { THEME } from '@/constants/theme';

export interface FabAction {
  id: string;
  icon: string;
  label: string;
  onPress: () => void;
  badge?: number;
}

export function Fab({ actions }: { actions: FabAction[] }) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const totalBadge = actions.reduce((s, a) => s + (a.badge ?? 0), 0);

  function toggle(next: boolean) {
    setOpen(next);
    Animated.spring(anim, { toValue: next ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  }

  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <>
      {/* Scrim — tap anywhere to close */}
      {open && (
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={() => toggle(false)} />
      )}

      <View style={{ position: 'absolute', right: 20, bottom: 28, alignItems: 'flex-end' }} pointerEvents="box-none">
        {/* Action stack */}
        {open && actions.map((action, i) => {
          const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [12 * (actions.length - i), 0] });
          return (
            <Animated.View key={action.id} style={{ opacity: anim, transform: [{ translateY }], marginBottom: 10 }}>
              <TouchableOpacity
                testID={`quick-action-${action.id}`}
                onPress={() => { toggle(false); action.onPress(); }}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: THEME.colors.surface2, borderRadius: THEME.radius.full,
                  paddingLeft: 16, paddingRight: 12, paddingVertical: 11,
                  ...THEME.glow.soft,
                }}
              >
                <Text style={{ fontSize: 13.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>
                  {action.label}
                </Text>
                {(action.badge ?? 0) > 0 && (
                  <View style={{ minWidth: 18, height: 18, borderRadius: 9, backgroundColor: THEME.colors.amber, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>{action.badge}</Text>
                  </View>
                )}
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: THEME.colors.surface3, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 15 }}>{action.icon}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Main button */}
        <TouchableOpacity onPress={() => toggle(!open)} activeOpacity={0.85} testID="coach-fab">
          <Animated.View
            style={{
              width: 58, height: 58, borderRadius: 29,
              backgroundColor: THEME.colors.teal,
              alignItems: 'center', justifyContent: 'center',
              transform: [{ rotate }],
              ...THEME.glow.teal,
            }}
          >
            <Text style={{ fontSize: 26, color: THEME.colors.background, lineHeight: 30 }}>＋</Text>
          </Animated.View>
        </TouchableOpacity>
        {!open && totalBadge > 0 && (
          <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: THEME.colors.amber, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: THEME.colors.background }}>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.background }}>{totalBadge}</Text>
          </View>
        )}
      </View>
    </>
  );
}
