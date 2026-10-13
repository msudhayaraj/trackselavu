import {
  addDaysToKey,
  addMonthsToKey,
  daysBetweenInclusive,
  endOfMonthKey,
  endOfWeekKey,
  fromDateKey,
  getPresetRange,
  getPreviousEquivalentRange,
  startOfMonthKey,
  startOfWeekKey,
  toDateKey,
} from './date-range.util';

describe('date-range.util', () => {
  it('round-trips a date through toDateKey/fromDateKey', () => {
    const d = new Date(2026, 9, 12); // October 12, 2026 (month is 0-indexed)
    expect(toDateKey(d)).toBe('2026-10-12');
    expect(toDateKey(fromDateKey('2026-10-12'))).toBe('2026-10-12');
  });

  it('adds days across month boundaries', () => {
    expect(addDaysToKey('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('computes start and end of month', () => {
    expect(startOfMonthKey('2026-10-15')).toBe('2026-10-01');
    expect(endOfMonthKey('2026-10-15')).toBe('2026-10-31');
    expect(endOfMonthKey('2026-02-10')).toBe('2026-02-28'); // 2026 is not a leap year
  });

  it('adds months, clamping day-of-month safely', () => {
    expect(addMonthsToKey('2026-10-15', -1)).toBe('2026-09-15');
    expect(addMonthsToKey('2026-01-15', -1)).toBe('2025-12-15');
  });

  it('computes a Monday-start week containing the reference date', () => {
    const start = startOfWeekKey('2026-10-12', 'MONDAY');
    const end = endOfWeekKey('2026-10-12', 'MONDAY');
    expect(fromDateKey(start).getDay()).toBe(1); // Monday
    expect(start <= '2026-10-12' && '2026-10-12' <= end).toBeTrue();
    expect(daysBetweenInclusive({ startKey: start, endKey: end, label: '' })).toBe(7);
  });

  it('TODAY preset is a single-day range', () => {
    const range = getPresetRange('TODAY', '2026-10-12');
    expect(range.startKey).toBe('2026-10-12');
    expect(range.endKey).toBe('2026-10-12');
  });

  it('THIS_MONTH preset spans the full calendar month', () => {
    const range = getPresetRange('THIS_MONTH', '2026-10-12');
    expect(range.startKey).toBe('2026-10-01');
    expect(range.endKey).toBe('2026-10-31');
  });

  it('computes the previous equivalent period of the same length', () => {
    const range = getPresetRange('THIS_WEEK', '2026-10-12', 'MONDAY');
    const previous = getPreviousEquivalentRange(range);
    expect(daysBetweenInclusive(previous)).toBe(daysBetweenInclusive(range));
    expect(addDaysToKey(previous.endKey, 1)).toBe(range.startKey);
  });
});
