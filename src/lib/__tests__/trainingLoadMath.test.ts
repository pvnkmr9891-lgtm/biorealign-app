import {
  sideMultiplier,
  computeRawsForDay,
  logDate,
  buildTrainingLoadResult,
  WorkoutLogRow,
} from '../trainingLoadMath';

describe('sideMultiplier', () => {
  it('unilateral (null/na) counts once', () => {
    expect(sideMultiplier(null)).toBe(1);
    expect(sideMultiplier(undefined)).toBe(1);
    expect(sideMultiplier('na')).toBe(1);
  });

  it('bilateral (left/right/rotation) counts double', () => {
    expect(sideMultiplier('left')).toBe(2);
    expect(sideMultiplier('right')).toBe(2);
    expect(sideMultiplier('rotation')).toBe(2);
  });
});

describe('computeRawsForDay — classification boundaries', () => {
  const base: WorkoutLogRow = {
    week_start_date: '2026-07-06', day_number: 1, item_type: 'workout',
    item_name: 'x', completed: true,
  };

  it('reps-based workout -> strength volume (sets * reps * side mult)', () => {
    const { strengthVolume, cardioDuration } = computeRawsForDay([
      { ...base, sets: 3, reps: 10, side: 'na' },
    ]);
    expect(strengthVolume).toBe(30);
    expect(cardioDuration).toBe(0);
  });

  it('bilateral reps double the volume', () => {
    const { strengthVolume } = computeRawsForDay([{ ...base, sets: 3, reps: 10, side: 'left' }]);
    expect(strengthVolume).toBe(60);
  });

  it('short isometric (holdSecs<60 AND total<90) -> strength, at 5s=1rep', () => {
    // plank: 2 sets x 40s hold = 80s total, holdSecs 40 < 60, total 80 < 90
    const { strengthVolume, cardioDuration } = computeRawsForDay([
      { ...base, sets: 2, hold_secs: 40, reps: null },
    ]);
    expect(strengthVolume).toBe(2 * (40 / 5));
    expect(cardioDuration).toBe(0);
  });

  it('boundary: holdSecs exactly 60 -> cardio, not strength (>= 60 rule)', () => {
    const { strengthVolume, cardioDuration } = computeRawsForDay([
      { ...base, sets: 1, hold_secs: 60, reps: null },
    ]);
    expect(strengthVolume).toBe(0);
    expect(cardioDuration).toBe(60);
  });

  it('boundary: holdSecs 59 but total>=90 -> cardio (interval total rule)', () => {
    // 3 sets x 30s = 90s total, even though each hold (30s) is under 60
    const { strengthVolume, cardioDuration } = computeRawsForDay([
      { ...base, sets: 3, hold_secs: 30, reps: null },
    ]);
    expect(strengthVolume).toBe(0);
    expect(cardioDuration).toBe(90);
  });

  it('a single 89s hold is cardio even though total<90 — both conditions must hold for strength', () => {
    const { strengthVolume, cardioDuration } = computeRawsForDay([
      { ...base, sets: 1, hold_secs: 89, reps: null },
    ]);
    // holdSecs(89) < 60 is FALSE, so this routes to cardio despite total (89) < 90
    expect(strengthVolume).toBe(0);
    expect(cardioDuration).toBe(89);
  });

  it('just under both thresholds (holdSecs 44, total 88) stays strength', () => {
    const { strengthVolume, cardioDuration } = computeRawsForDay([
      { ...base, sets: 2, hold_secs: 44, reps: null },
    ]);
    expect(strengthVolume).toBeCloseTo(2 * (44 / 5), 5);
    expect(cardioDuration).toBe(0);
  });

  it('warmup/cooldown always count toward mobility, timed or reps-based', () => {
    const { mobilityEngagement } = computeRawsForDay([
      { week_start_date: '2026-07-06', item_type: 'warmup', item_name: 'stretch A', sets: 1, hold_secs: 30, completed: true },
      { week_start_date: '2026-07-06', item_type: 'cooldown', item_name: 'stretch B', sets: 2, reps: 10, completed: true },
    ]);
    // duration = 30 + (2*10*3=60) = 90; variety bonus for 2 distinct names = 1 + min(0.3, 0.1) = 1.1
    expect(mobilityEngagement).toBeCloseTo(90 * 1.1, 5);
  });

  it('incomplete logs are ignored entirely', () => {
    const { strengthVolume } = computeRawsForDay([{ ...base, sets: 3, reps: 10, completed: false }]);
    expect(strengthVolume).toBe(0);
  });

  it('zero or missing reps/hold_secs contribute nothing', () => {
    const raws = computeRawsForDay([{ ...base, sets: 3, reps: 0 }, { ...base, sets: 3 }]);
    expect(raws.strengthVolume).toBe(0);
    expect(raws.cardioDuration).toBe(0);
  });
});

describe('logDate', () => {
  it('day_number 1 is the week_start_date itself', () => {
    expect(logDate({ week_start_date: '2026-07-06', day_number: 1, item_type: 'workout' })).toBe('2026-07-06');
  });

  it('day_number 6 is 5 days after week_start (Saturday)', () => {
    expect(logDate({ week_start_date: '2026-07-06', day_number: 6, item_type: 'workout' })).toBe('2026-07-11');
  });

  it('missing day_number defaults to day 1', () => {
    expect(logDate({ week_start_date: '2026-07-06', item_type: 'workout' })).toBe('2026-07-06');
  });

  it('handles a month-boundary week', () => {
    expect(logDate({ week_start_date: '2026-07-27', day_number: 6, item_type: 'workout' })).toBe('2026-08-01');
  });
});

describe('buildTrainingLoadResult', () => {
  const NOW = new Date(2026, 6, 30); // fixed "today" for deterministic windows

  function logsFor(dates: string[], reps = 10): WorkoutLogRow[] {
    return dates.map((d) => ({
      week_start_date: d, day_number: 1, item_type: 'workout', reps, sets: 1, completed: true,
    }));
  }

  it('calibrating is true with fewer than 5 logged days in the past 30', () => {
    const result = buildTrainingLoadResult(logsFor(['2026-07-29', '2026-07-30']), NOW);
    expect(result.calibrating).toBe(true);
  });

  it('calibrating is false once 5+ distinct days are logged in the past 30', () => {
    const result = buildTrainingLoadResult(
      logsFor(['2026-07-26', '2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30']), NOW
    );
    expect(result.calibrating).toBe(false);
  });

  it('first-ever session (no baseline) scores exactly 50', () => {
    const result = buildTrainingLoadResult(logsFor(['2026-07-30']), NOW);
    expect(result.scores[0].strengthScore).toBe(50);
  });

  it('a day with double the 30-day baseline volume scores 100 (capped)', () => {
    // 4 baseline days at volume 10, then a 5th day at volume 100 -> ratio 10x,
    // score = min(100, round(100/10 * 50)) capped at 100
    const baselineDays = logsFor(['2026-07-01', '2026-07-08', '2026-07-15', '2026-07-22'], 10);
    const spikeDay = logsFor(['2026-07-30'], 100);
    const result = buildTrainingLoadResult([...baselineDays, ...spikeDay], NOW);
    const spike = result.scores.find((s) => s.date === '2026-07-30');
    expect(spike?.strengthScore).toBe(100);
  });

  it('a day with no activity in a domain scores null for that domain, not 0', () => {
    const result = buildTrainingLoadResult(logsFor(['2026-07-30']), NOW);
    expect(result.scores[0].cardioScore).toBeNull();
    expect(result.scores[0].mobilityScore).toBeNull();
  });

  it('only includes days within the trailing 90-day window', () => {
    const tooOld = logsFor(['2026-04-01']); // > 90 days before 2026-07-30
    const result = buildTrainingLoadResult(tooOld, NOW);
    expect(result.scores.find((s) => s.date === '2026-04-01')).toBeUndefined();
  });

  it('empty log list returns empty scores and calibrating=true', () => {
    const result = buildTrainingLoadResult([], NOW);
    expect(result.scores).toEqual([]);
    expect(result.calibrating).toBe(true);
  });
});
