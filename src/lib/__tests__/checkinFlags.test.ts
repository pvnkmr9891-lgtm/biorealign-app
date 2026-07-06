import { hasSustainedHighPain, daysAgo, CheckinRow } from '../checkinFlags';

function rows(pairs: [string, number | null][]): CheckinRow[] {
  return pairs.map(([date, pain_level]) => ({ date, pain_level }));
}

describe('hasSustainedHighPain', () => {
  it('flags 3 consecutive calendar days at pain >= 7', () => {
    expect(hasSustainedHighPain(rows([
      ['2026-07-01', 7], ['2026-07-02', 8], ['2026-07-03', 7],
    ]))).toBe(true);
  });

  it('does not flag only 2 consecutive high-pain days', () => {
    expect(hasSustainedHighPain(rows([
      ['2026-07-01', 7], ['2026-07-02', 8],
    ]))).toBe(false);
  });

  it('a gap in the calendar (missed check-in) breaks the streak', () => {
    // 07-01 and 07-03 are both high but not calendar-consecutive (07-02 missing)
    expect(hasSustainedHighPain(rows([
      ['2026-07-01', 7], ['2026-07-03', 8], ['2026-07-04', 9],
    ]))).toBe(false);
  });

  it('a single low-pain day in the middle resets the run', () => {
    expect(hasSustainedHighPain(rows([
      ['2026-07-01', 7], ['2026-07-02', 3], ['2026-07-03', 8], ['2026-07-04', 9],
    ]))).toBe(false); // only 2 consecutive (03, 04) after the reset
  });

  it('boundary: pain exactly 7 counts as high; 6 does not', () => {
    expect(hasSustainedHighPain(rows([
      ['2026-07-01', 6], ['2026-07-02', 6], ['2026-07-03', 6],
    ]))).toBe(false);
    expect(hasSustainedHighPain(rows([
      ['2026-07-01', 7], ['2026-07-02', 7], ['2026-07-03', 7],
    ]))).toBe(true);
  });

  it('null pain_level is treated as 0 (not high)', () => {
    expect(hasSustainedHighPain(rows([
      ['2026-07-01', null], ['2026-07-02', null], ['2026-07-03', null],
    ]))).toBe(false);
  });

  it('a longer run than 3 still flags true (does not require exactly 3)', () => {
    expect(hasSustainedHighPain(rows([
      ['2026-07-01', 7], ['2026-07-02', 7], ['2026-07-03', 7],
      ['2026-07-04', 7], ['2026-07-05', 7],
    ]))).toBe(true);
  });

  it('empty check-in list never flags', () => {
    expect(hasSustainedHighPain([])).toBe(false);
  });
});

describe('daysAgo', () => {
  it('today is 0 days ago', () => {
    const now = new Date(2026, 6, 15, 18, 0, 0).getTime();
    expect(daysAgo('2026-07-15', now)).toBe(0);
  });

  it('yesterday is 1 day ago regardless of time-of-day', () => {
    const now = new Date(2026, 6, 15, 0, 5, 0).getTime(); // just after midnight
    expect(daysAgo('2026-07-14', now)).toBe(1);
  });

  it('a week ago is 7', () => {
    const now = new Date(2026, 6, 15, 12, 0, 0).getTime();
    expect(daysAgo('2026-07-08', now)).toBe(7);
  });
});
