import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { THEME } from '@/constants/theme';
import { DayScore } from '@/hooks/useAlignmentScore';

const DAY_ROW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ── Consistency Heatmap — GitHub-style contribution grid of daily alignment
//    scores over `weeks` weeks. Shared between Progress (full, interactive)
//    and the Home dashboard (compact, tap-through preview) so the same data
//    isn't rebuilt twice — see ConsistencySection in progress.tsx and
//    ConsistencyPreviewCard in (client)/index.tsx.
export function ConsistencyHeatmap({
  data, bare = false, weeks = 12, cellSize = 13, showLegend = true, showMonthLabels = true, scrollable = true,
}: {
  data: DayScore[];
  bare?: boolean;
  weeks?: number;
  cellSize?: number;
  showLegend?: boolean;
  showMonthLabels?: boolean;
  scrollable?: boolean;
}) {
  const cellGap = 2;
  const colW = cellSize + cellGap;

  // Build a date→score lookup
  const scoreMap = useMemo(() => {
    const m: Record<string, number | null> = {};
    data.forEach(d => { m[d.date] = d.score; });
    return m;
  }, [data]);

  // Build the N-week grid ending today
  const cells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Find last Saturday (or today if Saturday)
    const dow = today.getDay(); // 0=Sun, 6=Sat
    const daysToSat = dow === 6 ? 0 : 6 - dow;
    const gridEnd = new Date(today);
    gridEnd.setDate(today.getDate() + daysToSat);

    // Grid starts `weeks` weeks back from gridEnd, on Monday
    const gridStart = new Date(gridEnd);
    gridStart.setDate(gridEnd.getDate() - weeks * 7 + 1);

    const grid: { date: string | null; score: number | null; isFuture: boolean }[][] = [];
    let cur = new Date(gridStart);
    for (let week = 0; week < weeks; week++) {
      const col: typeof grid[0] = [];
      for (let day = 0; day < 7; day++) {
        const isFuture = cur > today;
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        col.push({ date: dateStr, score: scoreMap[dateStr] ?? null, isFuture });
        cur.setDate(cur.getDate() + 1);
      }
      grid.push(col);
    }
    return grid;
  }, [scoreMap, weeks]);

  // Month labels: figure out which column is the first of each month
  const monthLabels = useMemo(() => {
    if (!showMonthLabels) return [];
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    cells.forEach((col, ci) => {
      const firstCell = col[0];
      if (!firstCell.date) return;
      const m = new Date(firstCell.date + 'T00:00:00').getMonth();
      if (m !== lastMonth) {
        labels.push({ col: ci, label: new Date(firstCell.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' }) });
        lastMonth = m;
      }
    });
    return labels;
  }, [cells, showMonthLabels]);

  const totalW = weeks * colW + 22; // 22px for day labels on left

  const grid = (
        <View style={{ width: totalW }}>
          {/* Month labels row */}
          {showMonthLabels && (
            <View style={{ flexDirection: 'row', marginLeft: 22, marginBottom: 4, height: 12 }}>
              {monthLabels.map((ml, i) => (
                <Text key={i} style={{
                  position: 'absolute',
                  left: ml.col * colW,
                  fontSize: 9,
                  fontFamily: THEME.fonts.sansMedium,
                  color: THEME.colors.textMuted,
                  letterSpacing: 0.3,
                }}>{ml.label}</Text>
              ))}
            </View>
          )}

          {/* Grid: 7 rows (days) × N cols (weeks) */}
          <View style={{ flexDirection: 'row', gap: cellGap }}>
            {/* Day-of-week labels column */}
            <View style={{ width: 18, gap: cellGap }}>
              {DAY_ROW_LABELS.map((label, i) => (
                <View key={i} style={{ width: 18, height: cellSize, alignItems: 'center', justifyContent: 'center' }}>
                  {(i % 2 === 0) && (
                    <Text style={{ fontSize: 8, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{label}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Week columns */}
            {cells.map((col, ci) => (
              <View key={ci} style={{ gap: cellGap }}>
                {col.map((cell, di) => {
                  const isSunday = di === 6;
                  const opacity =
                    cell.isFuture ? 0
                    : isSunday    ? 0.06
                    : cell.score === null ? 0.06
                    : Math.max(0.12, (cell.score / 100) * 0.95);

                  return (
                    <View key={di} style={{
                      width: cellSize, height: cellSize, borderRadius: 2.5,
                      backgroundColor: isSunday
                        ? 'rgba(255,255,255,0.06)'
                        : `rgba(0,196,180,${opacity})`,
                    }} />
                  );
                })}
              </View>
            ))}
          </View>

          {/* Legend */}
          {showLegend && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, marginLeft: 22, justifyContent: 'flex-end' }}>
              <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>Less</Text>
              {[0.08, 0.25, 0.5, 0.75, 0.95].map((op, i) => (
                <View key={i} style={{ width: cellSize, height: cellSize, borderRadius: 2.5, backgroundColor: `rgba(0,196,180,${op})` }} />
              ))}
              <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>More</Text>
            </View>
          )}
        </View>
  );

  const content = (
    <>
      {!bare && (
        <Text style={{ color: THEME.colors.textSecondary, fontFamily: THEME.fonts.sansMedium, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
          {weeks}-Week Consistency
        </Text>
      )}
      {scrollable
        ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{grid}</ScrollView>
        : grid}
    </>
  );

  if (bare) return content;

  return (
    <View style={{ marginHorizontal: 24, backgroundColor: THEME.colors.surface2, borderRadius: 14, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16, borderWidth: 0.5, borderColor: THEME.colors.border, marginBottom: 16 }}>
      {content}
    </View>
  );
}
