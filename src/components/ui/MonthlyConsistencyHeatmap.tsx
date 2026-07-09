import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { THEME } from '@/constants/theme';
import { DayScore } from '@/hooks/useAlignmentScore';

const DAY_ROW_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL_GAP = 3;
const DAY_LABEL_W = 20;
const MONTH_GAP = 14;

type Cell = { date: string; day: number; score: number | null; isFuture: boolean; visible: 'blank' | 'dim' | 'active' };

// Builds one continuous Monday-start week strip spanning from the first
// Monday of `earlier` month through the last Sunday of `later` month, then
// splits it into the two months' column groups at the boundary. This way a
// shared boundary week (e.g. the week straddling Apr 30 / May 1) is only
// ever rendered once — inside the earlier month's trailing column, dimmed —
// instead of being duplicated as a leading partial column in the later
// month too.
function buildTwoMonthCols(earlierYear: number, earlierMonth: number, laterYear: number, laterMonth: number, scoreMap: Record<string, number | null>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstOfEarlier = new Date(earlierYear, earlierMonth, 1);
  const firstOfLater    = new Date(laterYear, laterMonth, 1);
  const lastOfLater      = new Date(laterYear, laterMonth + 1, 0);

  const mondayIndex = (firstOfEarlier.getDay() + 6) % 7;
  const gridStart = new Date(firstOfEarlier);
  gridStart.setDate(gridStart.getDate() - mondayIndex);

  const lastMondayIndex = (lastOfLater.getDay() + 6) % 7;
  const gridEnd = new Date(lastOfLater);
  gridEnd.setDate(gridEnd.getDate() + (6 - lastMondayIndex));

  const allCols: { monday: Date; cells: Cell[] }[] = [];
  let cur = new Date(gridStart);
  let cells: Cell[] = [];
  let colMonday = new Date(cur);
  while (cur <= gridEnd) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const inEarlier = cur.getFullYear() === earlierYear && cur.getMonth() === earlierMonth;
    const inLater    = cur.getFullYear() === laterYear && cur.getMonth() === laterMonth;
    const visible: Cell['visible'] = (inEarlier || inLater) ? 'active' : (cur < firstOfEarlier || cur > lastOfLater ? 'blank' : 'dim');
    cells.push({ date: dateStr, day: cur.getDate(), score: scoreMap[dateStr] ?? null, isFuture: cur > today, visible });
    if (cells.length === 7) { allCols.push({ monday: colMonday, cells }); cells = []; colMonday = new Date(cur); colMonday.setDate(colMonday.getDate() + 1); }
    cur.setDate(cur.getDate() + 1);
  }
  if (cells.length) allCols.push({ monday: colMonday, cells });

  const earlierCols = allCols.filter((c) => c.monday < firstOfLater).map((c) => c.cells);
  const laterCols    = allCols.filter((c) => c.monday >= firstOfLater).map((c) => c.cells);
  return { earlierCols, laterCols };
}

function MonthColumns({ cols, cellSize }: { cols: Cell[][]; cellSize: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: CELL_GAP }}>
      {cols.map((col, ci) => (
        <View key={ci} style={{ gap: CELL_GAP }}>
          {col.map((cell, di) => {
            if (cell.visible === 'blank') {
              return <View key={di} style={{ width: cellSize, height: cellSize }} />;
            }
            const isSunday = di === 6;
            const dim = cell.visible === 'dim';
            const opacity =
              cell.isFuture || dim ? 0
              : isSunday           ? 0.06
              : cell.score === null ? 0.06
              : Math.max(0.12, (cell.score / 100) * 0.95);

            return (
              <View key={di} style={{
                width: cellSize, height: cellSize, borderRadius: 4,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: (isSunday || dim || cell.isFuture)
                  ? 'rgba(255,255,255,0.06)'
                  : `rgba(0,196,180,${opacity})`,
              }}>
                {!cell.isFuture && (
                  <Text style={{
                    fontSize: cellSize >= 20 ? 9 : 8,
                    fontFamily: THEME.fonts.sans,
                    color: dim
                      ? 'rgba(255,255,255,0.15)'
                      : (cell.score !== null && cell.score >= 45 && !isSunday ? 'rgba(0,0,0,0.55)' : THEME.colors.textMuted),
                  }}>
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

// ── Two-month Consistency Heatmap — always shows exactly 2 consecutive
//    calendar months side by side (Monday-start weeks, matching the rest of
//    the app). `laterYear`/`laterMonth` is the rightmost (more recent) month;
//    the month immediately before it is derived and shown on the left.
export function MonthlyConsistencyHeatmap({
  data, laterYear, laterMonth, onPrev, onNext, canPrev = true, canNext = true,
}: {
  data: DayScore[];
  laterYear: number;
  laterMonth: number; // 0-11
  onPrev: () => void;
  onNext: () => void;
  canPrev?: boolean;
  canNext?: boolean;
}) {
  const { width } = useWindowDimensions();

  const scoreMap = useMemo(() => {
    const m: Record<string, number | null> = {};
    data.forEach((d) => { m[d.date] = d.score; });
    return m;
  }, [data]);

  const earlier = laterMonth === 0
    ? { year: laterYear - 1, month: 11 }
    : { year: laterYear, month: laterMonth - 1 };

  const { earlierCols, laterCols } = useMemo(
    () => buildTwoMonthCols(earlier.year, earlier.month, laterYear, laterMonth, scoreMap),
    [scoreMap, earlier.year, earlier.month, laterYear, laterMonth]
  );

  const totalCols = earlierCols.length + laterCols.length;
  const availableWidth = width - 2 * 24 - 2 * 18; // screen margin + card padding
  const cellSize = Math.max(15, Math.min(24, Math.floor(
    (availableWidth - DAY_LABEL_W - MONTH_GAP - (totalCols - 1) * CELL_GAP) / totalCols
  )));

  const earlierLabel = new Date(earlier.year, earlier.month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const laterLabel   = new Date(laterYear, laterMonth, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <TouchableOpacity onPress={onPrev} disabled={!canPrev} style={{ padding: 4, opacity: canPrev ? 1 : 0.3 }}>
          <Text style={{ fontSize: 20, color: THEME.colors.teal }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, textAlign: 'center' }}>
          {earlierLabel}
        </Text>
        <Text style={{ flex: 1, fontSize: 14, fontFamily: THEME.fonts.sansMedium, color: THEME.colors.textPrimary, textAlign: 'center' }}>
          {laterLabel}
        </Text>
        <TouchableOpacity onPress={onNext} disabled={!canNext} style={{ padding: 4, opacity: canNext ? 1 : 0.3 }}>
          <Text style={{ fontSize: 20, color: THEME.colors.teal }}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: CELL_GAP }}>
        <View style={{ width: DAY_LABEL_W, gap: CELL_GAP }}>
          {DAY_ROW_LABELS.map((label, i) => (
            <View key={i} style={{ width: DAY_LABEL_W, height: cellSize, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 10, fontFamily: THEME.fonts.sans, color: THEME.colors.textMuted }}>{label}</Text>
            </View>
          ))}
        </View>
        <MonthColumns cols={earlierCols} cellSize={cellSize} />
        <View style={{ width: MONTH_GAP }} />
        <MonthColumns cols={laterCols} cellSize={cellSize} />
      </View>
    </View>
  );
}
