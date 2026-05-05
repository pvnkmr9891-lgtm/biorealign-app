import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polyline, G } from 'react-native-svg';

const ACTIVE   = '#00FFE5';
const INACTIVE = '#00C4B4';

interface IconProps {
  active: boolean;
  size?: number;
}

function glow(active: boolean) {
  if (!active) return {};
  return {
    shadowColor: '#00FFE5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 10,
  };
}

// ── Home ──────────────────────────────────────────────────────────────────────
export function HomeIcon({ active, size = 26 }: IconProps) {
  const c  = active ? ACTIVE : INACTIVE;
  const op = active ? 1 : 0.45;
  return (
    <View style={glow(active)}>
      <Svg width={size} height={size} viewBox="0 0 28 28" opacity={op}>
        <G fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Polyline points="3,13 14,4 25,13" />
          <Polyline points="6,11 6,24 22,24 22,11" />
          <Rect x="10" y="16" width="8" height="8" />
        </G>
      </Svg>
    </View>
  );
}

// ── Dumbbell ──────────────────────────────────────────────────────────────────
export function WorkoutIcon({ active, size = 26 }: IconProps) {
  const c  = active ? ACTIVE : INACTIVE;
  const op = active ? 1 : 0.45;
  return (
    <View style={glow(active)}>
      <Svg width={size} height={size} viewBox="0 0 28 28" opacity={op}>
        <G fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Line x1="9" y1="14" x2="19" y2="14" />
          <Rect x="3.5" y="11.5" width="3" height="5" rx="1" />
          <Rect x="6"   y="10"   width="3" height="8" rx="1" />
          <Rect x="21.5" y="11.5" width="3" height="5" rx="1" />
          <Rect x="19"  y="10"   width="3" height="8" rx="1" />
        </G>
      </Svg>
    </View>
  );
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────
export function CheckinIcon({ active, size = 26 }: IconProps) {
  const c  = active ? ACTIVE : INACTIVE;
  const op = active ? 1 : 0.45;
  return (
    <View style={glow(active)}>
      <Svg width={size} height={size} viewBox="0 0 28 28" opacity={op}>
        <Polyline
          points="2,14 6,14 9,7 12,21 15,10 18,17 21,14 26,14"
          fill="none" stroke={c} strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
export function ProgressIcon({ active, size = 26 }: IconProps) {
  const c  = active ? ACTIVE : INACTIVE;
  const op = active ? 1 : 0.45;
  return (
    <View style={glow(active)}>
      <Svg width={size} height={size} viewBox="0 0 28 28" opacity={op}>
        <G strokeLinecap="round" strokeLinejoin="round">
          <Line x1="4" y1="4"  x2="4"  y2="24" stroke={c} strokeWidth={1.8} />
          <Line x1="4" y1="24" x2="24" y2="24" stroke={c} strokeWidth={1.8} />
          <Rect x="7"  y="17" width="4" height="7" rx="0.5" fill={c} />
          <Rect x="13" y="12" width="4" height="12" rx="0.5" fill={c} />
          <Rect x="19" y="7"  width="4" height="17" rx="0.5" fill={c} />
        </G>
      </Svg>
    </View>
  );
}

// ── Target ────────────────────────────────────────────────────────────────────
export function ProgramsIcon({ active, size = 26 }: IconProps) {
  const c  = active ? ACTIVE : INACTIVE;
  const op = active ? 1 : 0.45;
  return (
    <View style={glow(active)}>
      <Svg width={size} height={size} viewBox="0 0 28 28" opacity={op}>
        <G fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round">
          <Circle cx="14" cy="14" r="10" />
          <Circle cx="14" cy="14" r="6" />
          <Circle cx="14" cy="14" r="2" fill={c} stroke="none" />
          <Line x1="14" y1="4"  x2="14" y2="7" />
          <Line x1="14" y1="21" x2="14" y2="24" />
          <Line x1="4"  y1="14" x2="7"  y2="14" />
          <Line x1="21" y1="14" x2="24" y2="14" />
        </G>
      </Svg>
    </View>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
export function MyPlanIcon({ active, size = 26 }: IconProps) {
  const c  = active ? ACTIVE : INACTIVE;
  const op = active ? 1 : 0.45;
  return (
    <View style={glow(active)}>
      <Svg width={size} height={size} viewBox="0 0 28 28" opacity={op}>
        <G fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Rect x="4" y="6" width="20" height="18" rx="2" />
          <Line x1="4"  y1="11" x2="24" y2="11" />
          <Line x1="9"  y1="4"  x2="9"  y2="8" />
          <Line x1="19" y1="4"  x2="19" y2="8" />
          <Polyline points="9,16 12,19 19,14" />
        </G>
      </Svg>
    </View>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
export function MessagesIcon({ active, size = 26 }: IconProps) {
  const c  = active ? ACTIVE : INACTIVE;
  const op = active ? 1 : 0.45;
  return (
    <View style={glow(active)}>
      <Svg width={size} height={size} viewBox="0 0 28 28" opacity={op}>
        <G fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4,5 Q4,3 6,3 L22,3 Q24,3 24,5 L24,16 Q24,18 22,18 L10,18 L6,22 L6,18 Q4,18 4,16 Z" />
          <Circle cx="10" cy="10.5" r="1.3" fill={c} stroke="none" />
          <Circle cx="14" cy="10.5" r="1.3" fill={c} stroke="none" />
          <Circle cx="18" cy="10.5" r="1.3" fill={c} stroke="none" />
        </G>
      </Svg>
    </View>
  );
}

// ── Person ────────────────────────────────────────────────────────────────────
export function ProfileIcon({ active, size = 26 }: IconProps) {
  const c  = active ? ACTIVE : INACTIVE;
  const op = active ? 1 : 0.45;
  return (
    <View style={glow(active)}>
      <Svg width={size} height={size} viewBox="0 0 28 28" opacity={op}>
        <G fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="14" cy="9" r="5" />
          <Path d="M4,25 Q4,18 14,18 Q24,18 24,25" />
        </G>
      </Svg>
    </View>
  );
}

// ── Map ───────────────────────────────────────────────────────────────────────
export const TAB_ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  'index':        HomeIcon,
  'workout-plan': WorkoutIcon,
  'checkin':      CheckinIcon,
  'progress':     ProgressIcon,
  'programs':     ProgramsIcon,
  'my-plan':      MyPlanIcon,
  'messages':     MessagesIcon,
  'profile':      ProfileIcon,
};
