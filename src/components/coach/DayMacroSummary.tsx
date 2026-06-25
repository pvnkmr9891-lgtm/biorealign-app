import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { THEME } from '@/constants/theme';

// Same daily targets used by the client's own nutrition ring on
// (client)/workout-plan, so the numbers the coach sees line up exactly with
// what the client sees.
const CAL_TARGET = 2000;
const PROTEIN_TARGET = 60;
const FAT_TARGET = 70;

// Compact, static version of the client's concentric calorie/protein/fat
// ring — calories outer, protein middle, fat inner. No animation, sized for
// inline use in a day card next to the exercise/nutrition task bars.
const RING_SZ = 56;
const RING_C  = RING_SZ / 2;

function StaticRing({ r, pct, color }: { r: number; pct: number; color: string }) {
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <>
      <Circle cx={RING_C} cy={RING_C} r={r} stroke={`${color}1F`} strokeWidth={5} fill="none" />
      <Circle
        cx={RING_C} cy={RING_C} r={r}
        stroke={color} strokeWidth={5} fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        rotation={-90}
        origin={`${RING_C}, ${RING_C}`}
      />
    </>
  );
}

const RING_LEGEND = [
  { key: 'cal',     label: 'Cal',  color: '#F59E0B' },
  { key: 'protein', label: 'Pro',  color: '#4CC986' },
  { key: 'fat',     label: 'Fat',  color: '#A78BFA' },
] as const;

function RingLegend() {
  return (
    <View style={{ flexDirection: 'row', gap: 7 }}>
      {RING_LEGEND.map((l) => (
        <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: l.color }} />
          <Text style={{ fontSize: 8.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{l.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function MacroRing({ calories, protein, fat, compact }: { calories: number; protein: number; fat: number; compact?: boolean }) {
  const ring = (
    <View style={{ width: RING_SZ, height: RING_SZ }}>
      <Svg width={RING_SZ} height={RING_SZ}>
        <StaticRing r={24} pct={calories / CAL_TARGET} color="#F59E0B" />
        <StaticRing r={17} pct={protein / PROTEIN_TARGET} color="#4CC986" />
        <StaticRing r={10} pct={fat / FAT_TARGET} color="#A78BFA" />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{calories}</Text>
      </View>
    </View>
  );

  if (compact) {
    return (
      <View style={{ alignItems: 'center', gap: 6 }}>
        {ring}
        <RingLegend />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {ring}
      <View style={{ gap: 3 }}>
        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>🔥 {calories} kcal</Text>
        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>💪 {protein}g protein</Text>
        <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>🥑 {fat}g fat</Text>
      </View>
    </View>
  );
}

function MacroBar({ label, value, target, unit, color }: { label: string; value: number; target: number; unit: string; color: string }) {
  const pct = Math.max(0, Math.min(1, value / target));
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{value}{unit}<Text style={{ color: THEME.colors.textMuted }}> /{target}{unit}</Text></Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: `${color}1F`, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
      </View>
    </View>
  );
}

// Sums only items the client has checked off as eaten — mirrors the
// "kcal logged" semantics of the client's own DailyNutritionRing exactly.
export function DayMacroSummary({ items }: { items: { calories?: number | null; protein_g?: number | null; fat_g?: number | null; completed?: boolean }[] }) {
  const eaten = items.filter((i) => i.completed);
  if (items.length === 0) return null;

  const calories = eaten.reduce((s, i) => s + (i.calories ?? 0), 0);
  const protein  = eaten.reduce((s, i) => s + (i.protein_g ?? 0), 0);
  const fat      = eaten.reduce((s, i) => s + (i.fat_g ?? 0), 0);

  return (
    <View style={{ backgroundColor: 'rgba(76,201,134,0.05)', borderWidth: 0.5, borderColor: 'rgba(76,201,134,0.18)', borderRadius: 14, padding: 14, marginBottom: 14, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      <View style={{ alignItems: 'center', width: 52 }}>
        <Text style={{ fontSize: 18, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{eaten.length}</Text>
        <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, textAlign: 'center' }}>of {items.length} eaten</Text>
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        <MacroBar label="Calories" value={calories} target={CAL_TARGET} unit="" color="#F59E0B" />
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <MacroBar label="Protein" value={protein} target={PROTEIN_TARGET} unit="g" color="#4CC986" />
          <MacroBar label="Fat" value={fat} target={FAT_TARGET} unit="g" color="#A78BFA" />
        </View>
      </View>
    </View>
  );
}
