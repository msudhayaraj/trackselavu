/**
 * All date handling here is LOCAL-TIME based and deliberately avoids
 * Date#toISOString()/UTC getters, which would shift a transaction to the
 * wrong calendar day near midnight for users east of UTC (all of India).
 */

export type ReportPreset =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'CUSTOM';

export type WeekStart = 'MONDAY' | 'SUNDAY';

export interface DateRange {
  /** Inclusive, 'YYYY-MM-DD'. */
  startKey: string;
  /** Inclusive, 'YYYY-MM-DD'. */
  endKey: string;
  label: string;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export function addDaysToKey(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function dateKeyToLocalTimestamp(key: string, hours = 0, minutes = 0): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, hours, minutes, 0, 0).getTime();
}

export function startOfMonthKey(key: string): string {
  const d = fromDateKey(key);
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonthKey(key: string): string {
  const d = fromDateKey(key);
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function addMonthsToKey(key: string, months: number): string {
  const d = fromDateKey(key);
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + months, Math.min(d.getDate(), 28)));
}

/** ISO-like weekday index where Monday=0..Sunday=6, or Sunday=0..Saturday=6. */
function weekdayIndex(date: Date, weekStartsOn: WeekStart): number {
  const jsDay = date.getDay(); // 0=Sunday..6=Saturday
  if (weekStartsOn === 'SUNDAY') return jsDay;
  return (jsDay + 6) % 7; // shift so Monday=0
}

export function startOfWeekKey(key: string, weekStartsOn: WeekStart = 'MONDAY'): string {
  const d = fromDateKey(key);
  const offset = weekdayIndex(d, weekStartsOn);
  d.setDate(d.getDate() - offset);
  return toDateKey(d);
}

export function endOfWeekKey(key: string, weekStartsOn: WeekStart = 'MONDAY'): string {
  return addDaysToKey(startOfWeekKey(key, weekStartsOn), 6);
}

export function daysBetweenInclusive(range: DateRange): number {
  const start = fromDateKey(range.startKey).getTime();
  const end = fromDateKey(range.endKey).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
}

export function isKeyInRange(key: string, range: DateRange): boolean {
  return key >= range.startKey && key <= range.endKey;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function monthLabel(key: string): string {
  const d = fromDateKey(key);
  return `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
}

export function getPresetRange(
  preset: ReportPreset,
  referenceKey: string = todayKey(),
  weekStartsOn: WeekStart = 'MONDAY',
  custom?: { startKey: string; endKey: string },
): DateRange {
  switch (preset) {
    case 'TODAY':
      return { startKey: referenceKey, endKey: referenceKey, label: 'Today' };
    case 'YESTERDAY': {
      const y = addDaysToKey(referenceKey, -1);
      return { startKey: y, endKey: y, label: 'Yesterday' };
    }
    case 'THIS_WEEK': {
      const start = startOfWeekKey(referenceKey, weekStartsOn);
      return { startKey: start, endKey: endOfWeekKey(referenceKey, weekStartsOn), label: 'This Week' };
    }
    case 'LAST_WEEK': {
      const lastWeekRef = addDaysToKey(referenceKey, -7);
      return {
        startKey: startOfWeekKey(lastWeekRef, weekStartsOn),
        endKey: endOfWeekKey(lastWeekRef, weekStartsOn),
        label: 'Last Week',
      };
    }
    case 'THIS_MONTH':
      return {
        startKey: startOfMonthKey(referenceKey),
        endKey: endOfMonthKey(referenceKey),
        label: monthLabel(referenceKey),
      };
    case 'LAST_MONTH': {
      const lastMonthRef = addMonthsToKey(referenceKey, -1);
      return {
        startKey: startOfMonthKey(lastMonthRef),
        endKey: endOfMonthKey(lastMonthRef),
        label: monthLabel(lastMonthRef),
      };
    }
    case 'CUSTOM':
      if (!custom) throw new Error('Custom range requires startKey/endKey');
      return { startKey: custom.startKey, endKey: custom.endKey, label: 'Custom Range' };
  }
}

/** The immediately preceding period of equal length, for "vs previous period" comparisons. */
export function getPreviousEquivalentRange(range: DateRange): DateRange {
  const lengthDays = daysBetweenInclusive(range);
  const endKey = addDaysToKey(range.startKey, -1);
  const startKey = addDaysToKey(endKey, -(lengthDays - 1));
  return { startKey, endKey, label: 'Previous Period' };
}
