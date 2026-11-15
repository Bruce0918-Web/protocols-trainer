import { describe, expect, it } from 'vitest';
import { addDays, dayOf, isSchoolDay, scheduledOn, weekStart, weeklyRate } from '../src/schedule';
import type { Freq, Protocol } from '../src/types';

const proto = (freq: Freq): Protocol => ({ id: 'x', freq }) as Protocol;
const MON = '2026-11-16'; // a Monday
const week = (marks: (boolean | null)[]) => {
  const out: Record<string, { done: Record<string, boolean> }> = {};
  marks.forEach((m, i) => {
    if (m !== null) out[addDays(MON, i)] = { done: { x: m } };
  });
  return out;
};

describe('dates', () => {
  it('knows weekdays and week starts', () => {
    expect(dayOf(MON)).toBe('mon');
    expect(dayOf('2026-11-15')).toBe('sun');
    expect(weekStart('2026-11-22')).toBe(MON);
    expect(weekStart(MON)).toBe(MON);
  });
  it('crosses month and year ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
});

describe('scheduledOn', () => {
  it('daily is due every day', () => expect(scheduledOn(proto('daily'), MON)).toBe(true));
  it('listed days only', () => {
    const p = proto(['mon', 'wed', 'sat']);
    expect(scheduledOn(p, MON)).toBe(true);
    expect(scheduledOn(p, addDays(MON, 1))).toBe(false);
    expect(scheduledOn(p, addDays(MON, 5))).toBe(true);
  });
  it('N-per-week is never due on a specific day', () => expect(scheduledOn(proto(3), MON)).toBe(false));
});

describe('school days', () => {
  const cal = { '2026-11-25': 'noschool', '2026-11-24': 'A1' };
  const school = { ...proto('daily'), when: 'school' } as Protocol;
  const off = { ...proto('daily'), when: 'noschool' } as Protocol;
  it('a listed holiday on a weekday is not a school day', () => {
    expect(isSchoolDay('2026-11-25', cal)).toBe(false);
    expect(scheduledOn(school, '2026-11-25', cal)).toBe(false);
    expect(scheduledOn(off, '2026-11-25', cal)).toBe(true);
  });
  it('a listed rotation day is a school day', () => {
    expect(scheduledOn(school, '2026-11-24', cal)).toBe(true);
    expect(scheduledOn(off, '2026-11-24', cal)).toBe(false);
  });
  it('dates outside the calendar: weekdays are school, weekends are not', () => {
    expect(isSchoolDay('2027-03-01', cal)).toBe(true); // a Monday
    expect(isSchoolDay('2027-03-06', cal)).toBe(false); // a Saturday
    expect(scheduledOn(off, '2027-03-06', cal)).toBe(true);
  });
  it('protocols without a condition ignore the calendar', () => {
    expect(scheduledOn(proto('daily'), '2026-11-25', cal)).toBe(true);
  });
  it('a holiday week does not count school-only protocols as due', () => {
    const marks = { '2026-11-23': { done: { x: true } }, '2026-11-24': { done: { x: true } }, '2026-11-25': { done: { x: false } } };
    expect(weeklyRate(school, '2026-11-23', marks, cal)).toEqual({ done: 2, due: 2, rate: 1 });
  });
});

describe('weeklyRate', () => {
  it('three-times-a-week done three times is 100%', () => {
    expect(weeklyRate(proto(3), MON, week([true, false, true, false, true, false, false]))).toEqual({ done: 3, due: 3, rate: 1 });
  });
  it('three-times-a-week done four times stays at 100%', () => {
    expect(weeklyRate(proto(3), MON, week([true, true, true, true, false, false, false]))!.rate).toBe(1);
  });
  it('three-times-a-week done once is one third', () => {
    expect(weeklyRate(proto(3), MON, week([true, null, null, null, null, null, null]))!.rate).toBeCloseTo(1 / 3);
  });
  it('fixed days: counts only the days it was due', () => {
    // due Mon, Wed, Sat; done Mon and Sat, missed Wed; Tue's mark is ignored
    const r = weeklyRate(proto(['mon', 'wed', 'sat']), MON, week([true, true, false, null, null, true, null]));
    expect(r).toEqual({ done: 2, due: 3, rate: 2 / 3 });
  });
  it('fixed days: a day with no record is unknown, not a miss', () => {
    expect(weeklyRate(proto('daily'), MON, week([true, true, null, null, false, null, null]))).toEqual({ done: 2, due: 3, rate: 2 / 3 });
  });
  it('fixed days: no records gives null', () => {
    expect(weeklyRate(proto('daily'), MON, {})).toBeNull();
  });
});
