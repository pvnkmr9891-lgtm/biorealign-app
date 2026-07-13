import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useClientTrainingLoadScores } from '@/hooks/useTrainingLoad';
import { DateField } from '@/components/ui/DateField';
import { THEME } from '@/constants/theme';

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <View style={{ backgroundColor: THEME.colors.surface2, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 14, borderLeftWidth: accent ? 3 : 0.5, borderLeftColor: accent ?? THEME.colors.border }}>
      {children}
    </View>
  );
}

function SectionHeader({ icon, title, color }: { icon: string; title: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 13 }}>{icon}</Text>
      </View>
      <Text style={{ fontSize: 15, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary }}>{title}</Text>
    </View>
  );
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type PresetKey = '2w' | '4w' | '6w' | '8w' | '12w' | 'custom';
const PRESETS: { key: PresetKey; label: string; days: number | null }[] = [
  { key: '2w', label: '2 wk', days: 14 },
  { key: '4w', label: '4 wk', days: 28 },
  { key: '6w', label: '6 wk', days: 42 },
  { key: '8w', label: '8 wk', days: 56 },
  { key: '12w', label: '12 wk', days: 84 },
  { key: 'custom', label: 'Custom', days: null },
];

const SERIES = [
  { key: 'cardioScore' as const,   label: 'Cardio',   color: '#93C5FD' },
  { key: 'strengthScore' as const, label: 'Strength', color: '#8b78e8' },
  { key: 'mobilityScore' as const, label: 'Mobility', color: THEME.colors.teal },
];

function StatCell({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: THEME.colors.surface3, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}>
      <Text style={{ fontSize: 20, fontFamily: THEME.fonts.sansMedium, color }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 3, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

// Multi-series bar trend — bars compress as the range widens, same approach
// as the admin dashboard's 14-day chart, just generalized to N days / 3 series.
function TrendChart({ dates, seriesData }: { dates: string[]; seriesData: Record<string, (number | null)[]> }) {
  const max = Math.max(1, ...SERIES.flatMap((s) => seriesData[s.key].map((v) => v ?? 0)));
  const BAR_AREA_H = 90;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: BAR_AREA_H, gap: dates.length > 40 ? 0.5 : 2 }}>
        {dates.map((date, i) => (
          <View key={date} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 0.5 }}>
            {SERIES.map((s) => {
              const v = seriesData[s.key][i];
              return (
                <View
                  key={s.key}
                  style={{
                    flex: 1, height: v != null ? Math.max(2, (v / max) * BAR_AREA_H) : 1.5,
                    backgroundColor: s.color, borderTopLeftRadius: 1, borderTopRightRadius: 1,
                    opacity: v == null || v === 0 ? 0.2 : 1,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
          {dates[0] ? new Date(dates[0] + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
        </Text>
        <Text style={{ fontSize: 9.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>
          {dates[dates.length - 1] ? new Date(dates[dates.length - 1] + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        {SERIES.map((s) => (
          <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color }} />
            <Text style={{ fontSize: 10.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ActivityTrendReportScreen() {
  const router = useRouter();
  const { clientId, clientName } = useLocalSearchParams<{ clientId: string; clientName: string }>();
  const { data: trainingLoad, isLoading } = useClientTrainingLoadScores(clientId);

  const [preset, setPreset] = useState<PresetKey>('4w');
  const today = localDateStr(new Date());
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 28);
    return localDateStr(d);
  });
  const [customEnd, setCustomEnd] = useState(today);

  const { startDate, endDate } = useMemo(() => {
    if (preset === 'custom') return { startDate: customStart, endDate: customEnd };
    const days = PRESETS.find((p) => p.key === preset)!.days!;
    const start = new Date(); start.setDate(start.getDate() - (days - 1));
    return { startDate: localDateStr(start), endDate: today };
  }, [preset, customStart, customEnd, today]);

  // Every calendar day in the selected range, so the chart/adherence math
  // covers days with zero logged activity too, not just days with a row.
  const dateSeries = useMemo(() => {
    const dates: string[] = [];
    const cursor = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    while (cursor <= end) {
      dates.push(localDateStr(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  const scoresByDate = useMemo(() => {
    const map: Record<string, { strengthScore: number | null; cardioScore: number | null; mobilityScore: number | null }> = {};
    (trainingLoad?.scores ?? []).forEach((s) => { map[s.date] = s; });
    return map;
  }, [trainingLoad]);

  const seriesData = useMemo(() => {
    const out: Record<string, (number | null)[]> = { cardioScore: [], strengthScore: [], mobilityScore: [] };
    for (const date of dateSeries) {
      const row = scoresByDate[date];
      out.cardioScore.push(row?.cardioScore ?? null);
      out.strengthScore.push(row?.strengthScore ?? null);
      out.mobilityScore.push(row?.mobilityScore ?? null);
    }
    return out;
  }, [dateSeries, scoresByDate]);

  const avg = (key: 'cardioScore' | 'strengthScore' | 'mobilityScore') => {
    const vals = seriesData[key].filter((v): v is number => v != null);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  };
  const activeDays = dateSeries.filter((d) => scoresByDate[d]).length;
  const totalDays = dateSeries.length;
  const adherencePct = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: THEME.colors.border }}
        >
          <Text style={{ color: THEME.colors.textPrimary, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontFamily: THEME.fonts.serif, color: THEME.colors.textPrimary }}>Activity Trend Report</Text>
          <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted, marginTop: 1 }}>{clientName}</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.colors.teal} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: `${THEME.colors.teal}0D`, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: `${THEME.colors.teal}25`, marginBottom: 16 }}>
            <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.textSecondary, lineHeight: 17 }}>
              ℹ️ Computed automatically from logged workouts — a rough, self-relative activity signal. Not a substitute for the physical Fitness Assessment test. Data available for roughly the last 90 days.
            </Text>
          </View>

          <Card accent="#93C5FD">
            <SectionHeader icon="🗓️" title="Time period" color="#93C5FD" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: preset === 'custom' ? 12 : 0 }}>
              {PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => setPreset(p.key)}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: preset === p.key ? '#93C5FD' : THEME.colors.surface3, borderWidth: 0.5, borderColor: preset === p.key ? '#93C5FD' : THEME.colors.border }}
                >
                  <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sansMedium, color: preset === p.key ? THEME.colors.background : THEME.colors.textSecondary }}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {preset === 'custom' && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>Start</Text>
                  <DateField value={customStart} onChange={setCustomStart} accentColor="#93C5FD" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textMuted, marginBottom: 6 }}>End</Text>
                  <DateField value={customEnd} onChange={setCustomEnd} accentColor="#93C5FD" />
                </View>
              </View>
            )}
          </Card>

          {trainingLoad?.calibrating && (
            <View style={{ backgroundColor: `${THEME.colors.amber}12`, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: `${THEME.colors.amber}35`, marginBottom: 14 }}>
              <Text style={{ fontSize: 11.5, fontFamily: THEME.fonts.sans, color: THEME.colors.amber, lineHeight: 17 }}>
                ⏳ Not enough logging history yet to compute reliable trend scores for this client — scores will fill in as they log more workout days.
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <StatCell value={avg('cardioScore') != null ? `${avg('cardioScore')}` : '—'} label="Avg Cardio" color="#93C5FD" />
            <StatCell value={avg('strengthScore') != null ? `${avg('strengthScore')}` : '—'} label="Avg Strength" color="#8b78e8" />
            <StatCell value={avg('mobilityScore') != null ? `${avg('mobilityScore')}` : '—'} label="Avg Mobility" color={THEME.colors.teal} />
          </View>
          <View style={{ marginBottom: 14 }}>
            <StatCell value={`${activeDays}/${totalDays} (${adherencePct}%)`} label="Active days in period" color={adherencePct >= 70 ? (THEME.colors.success ?? '#4CC986') : adherencePct >= 40 ? THEME.colors.amber : '#F87171'} />
          </View>

          <Card>
            <SectionHeader icon="📊" title="Daily trend" color={THEME.colors.textMuted} />
            {dateSeries.length > 0 ? (
              <TrendChart dates={dateSeries} seriesData={seriesData} />
            ) : (
              <Text style={{ fontSize: 12, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>No data in this range.</Text>
            )}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
