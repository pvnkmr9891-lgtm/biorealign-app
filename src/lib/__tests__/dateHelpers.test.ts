import { getWeekStart, getDayDate, isToday, isPast, groupLogs, dayProgress, addDaysToDateStr } from '../dateHelpers';

describe('getWeekStart', () => {
  it('returns the same Monday when given a Monday', () => {
    expect(getWeekStart(new Date(2026, 6, 6))).toBe('2026-07-06'); // Monday
  });

  it('rolls forward mid-week days to that week\'s Monday', () => {
    expect(getWeekStart(new Date(2026, 6, 8))).toBe('2026-07-06'); // Wednesday
    expect(getWeekStart(new Date(2026, 6, 11))).toBe('2026-07-06'); // Saturday
  });

  it('the Sunday boundary: Sunday belongs to the PRECEDING week, not the next', () => {
    // Sunday 2026-07-12 is the rest day at the end of the 2026-07-06 week
    expect(getWeekStart(new Date(2026, 6, 12))).toBe('2026-07-06');
  });

  it('Monday immediately after that Sunday starts a new week', () => {
    expect(getWeekStart(new Date(2026, 6, 13))).toBe('2026-07-13');
  });

  it('handles a month rollover (Sunday Feb 1 -> Jan 26 week)', () => {
    // 2026-02-01 is a Sunday; the week should start Monday 2026-01-26
    expect(getWeekStart(new Date(2026, 1, 1))).toBe('2026-01-26');
  });

  it('handles a year rollover (Sunday Jan 3 2027 -> Dec 28 2026 week)', () => {
    expect(getWeekStart(new Date(2027, 0, 3))).toBe('2026-12-28');
  });

  it('defaults to "now" when called with no argument', () => {
    expect(() => getWeekStart()).not.toThrow();
    expect(getWeekStart()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getDayDate', () => {
  it('day 1 of a week is the Monday itself', () => {
    const d = getDayDate('2026-07-06', 1);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(6);
  });

  it('day 6 is Saturday, the last tracked day', () => {
    const d = getDayDate('2026-07-06', 6);
    expect(d.getDate()).toBe(11);
  });

  it('rolls into the next month correctly', () => {
    const d = getDayDate('2026-07-27', 6); // week of July 27 -> day 6 = Aug 1
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(1);
  });
});

describe('isToday / isPast', () => {
  const realDateNow = Date.now;
  const FAKE_NOW = new Date(2026, 6, 8, 12, 0, 0); // Wednesday, mid-day

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(FAKE_NOW);
  });
  afterEach(() => {
    jest.useRealTimers();
    Date.now = realDateNow;
  });

  it('isToday is true for the matching day_number in the current week', () => {
    expect(isToday('2026-07-06', 3)).toBe(true); // day 3 = Wednesday
  });

  it('isToday is false for a different day_number', () => {
    expect(isToday('2026-07-06', 1)).toBe(false); // Monday, not today
  });

  it('isPast is true for days earlier in the week, false for today and future', () => {
    expect(isPast('2026-07-06', 1)).toBe(true);  // Monday already happened
    expect(isPast('2026-07-06', 3)).toBe(false); // today itself is not "past"
    expect(isPast('2026-07-06', 5)).toBe(false); // Friday hasn't happened yet
  });
});

describe('addDaysToDateStr', () => {
  it('subtracts a day within a month', () => {
    expect(addDaysToDateStr('2026-07-06', -1)).toBe('2026-07-05');
  });

  it('adds a day within a month', () => {
    expect(addDaysToDateStr('2026-07-05', 1)).toBe('2026-07-06');
  });

  it('rolls backward across a month boundary', () => {
    expect(addDaysToDateStr('2026-07-01', -1)).toBe('2026-06-30');
  });

  it('rolls backward across a year boundary', () => {
    expect(addDaysToDateStr('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('never round-trips through UTC, so it is stable regardless of TZ', () => {
    // This is the exact bug class: .toISOString().split('T')[0] would shift
    // this result back an extra day in any positive-UTC-offset timezone.
    // jest.setup.js pins TZ=Asia/Calcutta, so this catches the regression.
    expect(addDaysToDateStr('2026-07-06', -1)).toBe('2026-07-05');
  });
});

describe('groupLogs', () => {
  it('groups by day_number then item_type, sorted by item_order', () => {
    const logs = [
      { day_number: 1, item_type: 'workout', item_order: 2, item_name: 'b' },
      { day_number: 1, item_type: 'workout', item_order: 1, item_name: 'a' },
      { day_number: 2, item_type: 'food', item_order: 1, item_name: 'c' },
    ];
    const grouped = groupLogs(logs);
    expect(grouped[1].workout.map((l) => l.item_name)).toEqual(['a', 'b']);
    expect(grouped[2].food.map((l) => l.item_name)).toEqual(['c']);
  });

  it('handles an empty log list without throwing', () => {
    expect(groupLogs([])).toEqual({});
    expect(groupLogs()).toEqual({});
  });
});

describe('dayProgress', () => {
  it('computes done/total/percent across all item types for a day', () => {
    const grouped = groupLogs([
      { day_number: 1, item_type: 'workout', item_order: 1, completed: true },
      { day_number: 1, item_type: 'workout', item_order: 2, completed: false },
      { day_number: 1, item_type: 'food', item_order: 1, completed: true },
    ]);
    expect(dayProgress(grouped, 1)).toEqual({ total: 3, done: 2, percent: 67 });
  });

  it('returns zeroed progress for a day with no logs (percent must not divide by zero)', () => {
    expect(dayProgress({}, 1)).toEqual({ total: 0, done: 0, percent: 0 });
  });

  it('100% when every item is completed', () => {
    const grouped = groupLogs([
      { day_number: 1, item_type: 'water', item_order: 1, completed: true },
    ]);
    expect(dayProgress(grouped, 1).percent).toBe(100);
  });
});
