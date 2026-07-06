// Pure check-in red-flag logic, extracted from VitalsSparklines.tsx for unit
// testing without pulling in react-native/react-native-svg at import time.

export interface CheckinRow {
  date: string; // YYYY-MM-DD
  pain_level: number | null;
}

export function daysAgo(dateStr: string, now: number = Date.now()): number {
  return Math.floor((now - new Date(dateStr + 'T00:00:00').getTime()) / 86400000);
}

// Pain ≥7 on 3+ consecutive check-in days (calendar-consecutive) — the
// simplest defensible red flag; surfaced as a chip on the card header.
export function hasSustainedHighPain(rows: CheckinRow[]): boolean {
  let run = 0;
  let prevDate: string | null = null;
  for (const r of rows) {
    const high = (r.pain_level ?? 0) >= 7;
    const consecutive =
      prevDate != null &&
      new Date(r.date + 'T00:00:00').getTime() - new Date(prevDate + 'T00:00:00').getTime() === 86400000;
    run = high ? (consecutive ? run + 1 : 1) : 0;
    if (run >= 3) return true;
    prevDate = r.date;
  }
  return false;
}
