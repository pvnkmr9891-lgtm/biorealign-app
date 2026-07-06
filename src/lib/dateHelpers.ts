// Pure date/log helpers shared by the manual workout log and its consumers.
// Extracted from useManualLog.js so this logic is unit-testable without
// pulling in Supabase/RN native modules at import time.
//
// Week convention: weeks start Monday, end Sunday (day_number 1-6 = Mon-Sat;
// Sunday is the untracked rest day). This is the boundary most date bugs in
// this app live at — see docs/TESTING.md §3.

export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekStart(fromDate: Date = new Date()): string {
  const d = new Date(fromDate);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  d.setHours(0, 0, 0, 0);
  return toLocalDateStr(d);
}

export function getDayDate(weekStart: string, dayNumber: number): Date {
  const [y, m, day] = weekStart.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  d.setDate(d.getDate() + (dayNumber - 1));
  return d;
}

export function isToday(weekStart: string, dayNumber: number): boolean {
  const d = getDayDate(weekStart, dayNumber);
  const t = new Date();
  return d.getDate() === t.getDate() &&
         d.getMonth() === t.getMonth() &&
         d.getFullYear() === t.getFullYear();
}

export function isPast(weekStart: string, dayNumber: number): boolean {
  const d = getDayDate(weekStart, dayNumber);
  d.setHours(0, 0, 0, 0);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return d < t;
}

export interface LogRow {
  day_number: number;
  item_type: string;
  item_order: number;
  completed?: boolean;
  [key: string]: unknown;
}

export function groupLogs(logs: LogRow[] = []): Record<number, Record<string, LogRow[]>> {
  const grouped: Record<number, Record<string, LogRow[]>> = {};
  logs.forEach((log) => {
    if (!grouped[log.day_number]) grouped[log.day_number] = {};
    if (!grouped[log.day_number][log.item_type]) grouped[log.day_number][log.item_type] = [];
    grouped[log.day_number][log.item_type].push(log);
  });
  Object.values(grouped).forEach((day) => {
    Object.values(day).forEach((items) => {
      items.sort((a, b) => a.item_order - b.item_order);
    });
  });
  return grouped;
}

export function dayProgress(
  grouped: Record<number, Record<string, LogRow[]>>,
  dayNumber: number
): { total: number; done: number; percent: number } {
  const day = grouped[dayNumber] || {};
  let total = 0;
  let done = 0;
  Object.values(day).forEach((items) => {
    total += items.length;
    done += items.filter((i) => i.completed).length;
  });
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}
