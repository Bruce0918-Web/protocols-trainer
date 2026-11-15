import { DAYS, type Day, type Protocol } from './types';

/** Dates are handled as local-time 'YYYY-MM-DD' keys everywhere. */
export function dateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function dayOf(key: string): Day {
  return DAYS[(parseKey(key).getDay() + 6) % 7];
}

/** The Monday of the week containing `key`. */
export function weekStart(key: string): string {
  return addDays(key, -DAYS.indexOf(dayOf(key)));
}

/** "N times a week" protocols have no fixed days. */
export function isFlexible(p: Protocol): boolean {
  return typeof p.freq === 'number';
}

/** date → rotation code or 'noschool'. */
export type SchoolDays = Record<string, string>;

/** A listed date follows the calendar; any other date counts as school on Mon–Fri. */
export function isSchoolDay(key: string, days: SchoolDays = {}): boolean {
  const code = days[key];
  if (code !== undefined) return code !== 'noschool';
  return DAYS.indexOf(dayOf(key)) < 5;
}

/** True when the protocol is due on that specific date. Flexible protocols are never due on a specific date. */
export function scheduledOn(p: Protocol, key: string, days: SchoolDays = {}): boolean {
  if (typeof p.freq === 'number') return false;
  if (p.freq !== 'daily' && !p.freq.includes(dayOf(key))) return false;
  if (p.when === 'school') return isSchoolDay(key, days);
  if (p.when === 'noschool') return !isSchoolDay(key, days);
  return true;
}

export interface Rate {
  done: number;
  due: number;
  rate: number;
}

/**
 * Execution rate for one protocol in the week starting on `monday`.
 * Fixed-day protocols: done / due, counting only days that have a saved record for this protocol
 * (a day without a record is unknown, not a miss). Returns null if no due day was recorded.
 * Flexible protocols: done / N, capped at 100%.
 */
export function weeklyRate(
  p: Protocol,
  monday: string,
  checkins: Record<string, { done: Record<string, boolean> }>,
  days: SchoolDays = {},
): Rate | null {
  let done = 0;
  let due = 0;
  for (let i = 0; i < 7; i++) {
    const key = addDays(monday, i);
    const mark = checkins[key]?.done[p.id];
    if (isFlexible(p)) {
      if (mark === true) done++;
    } else if (scheduledOn(p, key, days) && typeof mark === 'boolean') {
      due++;
      if (mark) done++;
    }
  }
  if (isFlexible(p)) {
    due = p.freq as number;
    return { done, due, rate: Math.min(1, done / due) };
  }
  return due === 0 ? null : { done, due, rate: done / due };
}

export function byTime(a: Protocol, b: Protocol): number {
  return a.time.localeCompare(b.time);
}
