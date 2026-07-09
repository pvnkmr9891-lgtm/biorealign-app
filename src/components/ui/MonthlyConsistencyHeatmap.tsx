import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { THEME } from '@/constants/theme';
import { DayScore } from '@/hooks/useAlignmentScore';

const DAY_ROW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL_GAP = 3;

// ── Monthly Consistency Heatmap — one calendar month per view (Mon-start
//    weeks, like the rest of the app), with prev/next navigation handled by
//    the caller via `year`/`month`. Bigger cells than the 12-week strip used
//    elsewhere, since this is the primary (not preview) view on Home.
export function MonthlyConsistencyHeatmap({
  data, year, month, cellSize = 25,
}: {
  data: DayScore[];
  year: number;
  month: number; // 0-11
  cellSize?: number;
}) {
  const scoreMap = useMemo(() => {
    const m: Record<string, number | null> = {};
    data.forEach((d) => { m[d.date] = d.score; });
    return m;
  }, [data]);

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth  = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mondayIndex = (firstOfMonth.getDay() + 6) % 7; // 0=Mon..6=Sun
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - mondayIndex);

    const lastMondayIndex = (lastOfMonth.getDay() + 6) % 7;
    const gridEnd = new Date(lastOfMonth);
    gridEnd.setDate(gridEnd.getDate() + (6 - lastMondayIndex));

    const cols: { date: string; day: number; inMonth: boolean; isFuture: boolean; score: number | null }[][] = [];
    let cur = new Date(gridStart);
    let col: typeof cols[0] = [];
    while (cur <= gridEnd) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      col.push({
        date: dateStr,
        day: cur.getDate(),
        inMonth: cur.getMonth() === month,
        isFuture: cur > today,
        score: scoreMap[dateStr] ?? null,
      });
      if (col.length === 7) { cols.push(col); col = []; }
      cur.setDate(cur.getDate() + 1);
    }
    if (col.length) cols.push(col);
    return cols;
  }, [scoreMap, year, month]);

  return (
    <View style={{ flexDirection: 'row', gap: CELL_GAP }}>
      {/* Day-of-week labels */}
      <View style={{ width: 20, gap: CELL_GAP }}>
        {DAY_ROW_LABELS.map((label, i) => (
          <View key={i} style={{ width: 20, height: cellSize, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{label}</Text>
          </View>
        ))}
      </View>

      {weeks.map((col, ci) => (
        <View key={ci} style={{ gap: CELL_GAP }}>
          {col.map((cell, di) => {
            if (!cell.inMonth) {
              return <View key={di} style={{ width: cellSize, height: cellSize }} />;
            }
            const isSunday = di === 6;
            const opacity =
              cell.isFuture ? 0
              : isSunday    ? 0.06
              : cell.score === null ? 0.06
              : Math.max(0.12, (cell.score / 100) * 0.95);

            return (
              <View key={di} style={{
                width: cellSize, height: cellSize, borderRadius: 4,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: isSunday
                  ? 'rgba(255,255,255,0.06)'
                  : `rgba(0,196,180,${opacity})`,
              }}>
                {!cell.isFuture && (
                  <Text style={{ fontSize: 9, fontFamily: THEME.fonts.sans, color: cell.score !== null && cell.score >= 45 ? 'rgba(0,0,0,0.55)' : THEME.colors.textMuted }}>
                    {cell.day}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
