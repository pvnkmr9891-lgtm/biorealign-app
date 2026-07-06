import { scoreBand } from '../fitnessScoring';

describe('scoreBand', () => {
  it.each([
    [100, 'Excellent'],
    [90, 'Excellent'],
    [70, 'Good'],
    [50, 'Fair'],
    [20, 'Needs work'],
    [0, 'Needs work'],
  ])('score %i -> %s', (score, expected) => {
    expect(scoreBand(score).label).toBe(expected);
  });

  it('boundaries are inclusive on the lower edge of each band', () => {
    expect(scoreBand(80).label).toBe('Excellent');
    expect(scoreBand(60).label).toBe('Good');
    expect(scoreBand(40).label).toBe('Fair');
  });

  it('one point below each boundary drops to the band below', () => {
    expect(scoreBand(79).label).toBe('Good');
    expect(scoreBand(59).label).toBe('Fair');
    expect(scoreBand(39).label).toBe('Needs work');
  });

  it('handles out-of-spec inputs without throwing', () => {
    expect(() => scoreBand(-5)).not.toThrow();
    expect(scoreBand(-5).label).toBe('Needs work');
    expect(() => scoreBand(150)).not.toThrow();
    expect(scoreBand(150).label).toBe('Excellent');
  });

  it('every band returns a usable hex color', () => {
    for (const s of [0, 40, 60, 80]) {
      expect(scoreBand(s).color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
