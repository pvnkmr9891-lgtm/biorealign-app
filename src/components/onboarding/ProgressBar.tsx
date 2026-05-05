import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';

const BRAND = {
  teal: '#00C4B4',
  bg: '#0A0A0B',
  surface: '#141416',
  textMuted: '#6B6B70',
  text: '#F0EEE8',
};

const STAGES = [
  { num: 1, label: 'Personal' },
  { num: 2, label: 'Body' },
  { num: 3, label: 'Movement' },
  { num: 4, label: 'Nutrition' },
  { num: 5, label: 'Goals' },
];

interface ProgressBarProps {
  currentStage: number; // 1–5
}

export function ProgressBar({ currentStage }: ProgressBarProps) {
  const animValues = useRef(STAGES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = animValues.map((anim, i) =>
      Animated.timing(anim, {
        toValue: i < currentStage ? 1 : 0,
        duration: 300,
        delay: i * 40,
        useNativeDriver: false,
      })
    );
    Animated.parallel(animations).start();
  }, [currentStage]);

  return (
    <View style={{ paddingHorizontal: 24, paddingBottom: 20 }}>
      {/* Stage dots row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        {STAGES.map((stage, i) => {
          const isComplete = stage.num < currentStage;
          const isActive = stage.num === currentStage;
          const isLast = i === STAGES.length - 1;

          return (
            <React.Fragment key={stage.num}>
              {/* Dot */}
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isComplete || isActive ? BRAND.teal : BRAND.surface,
                  borderWidth: isActive ? 2 : 0,
                  borderColor: BRAND.teal,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: isActive ? BRAND.teal : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: 8,
                  elevation: isActive ? 4 : 0,
                }}
              >
                {isComplete ? (
                  <Text style={{ color: BRAND.bg, fontSize: 12, fontFamily: 'DMSans-Bold' }}>✓</Text>
                ) : (
                  <Text
                    style={{
                      color: isActive ? BRAND.bg : BRAND.textMuted,
                      fontSize: 11,
                      fontFamily: 'DMSans-Bold',
                    }}
                  >
                    {stage.num}
                  </Text>
                )}
              </View>

              {/* Connector line */}
              {!isLast && (
                <View style={{ flex: 1, height: 2, marginHorizontal: 4, backgroundColor: BRAND.surface, overflow: 'hidden' }}>
                  <Animated.View
                    style={{
                      height: '100%',
                      backgroundColor: BRAND.teal,
                      width: animValues[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    }}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Label row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {STAGES.map((stage) => (
          <Text
            key={stage.num}
            style={{
              fontSize: 10,
              fontFamily: 'DMSans-Medium',
              color: stage.num === currentStage ? BRAND.teal : BRAND.textMuted,
              letterSpacing: 0.5,
            }}
          >
            {stage.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
