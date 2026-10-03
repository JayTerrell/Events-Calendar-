import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { describeRule, occursOn, parseRule, type Rule } from './recurrence';

const datesIn = (rule: Rule, from: string, days: number, anchor?: string) =>
  Array.from({ length: days }, (_, i) => addDays(from, i)).filter((d) => occursOn(rule, d, anchor));

describe('parseRule', () => {
  it.each([
    ['every Thursday', { kind: 'weekly', interval: 1, weekdays: [4] }],
    ['Thursdays', { kind: 'weekly', interval: 1, weekdays: [4] }],
    ['Fridays and Saturdays', { kind: 'weekly', interval: 1, weekdays: [5, 6] }],
    ['weekends', { kind: 'weekly', interval: 1, weekdays: [0, 6] }],
    ['every other Thursday', { kind: 'weekly', interval: 2, weekdays: [4] }],
    ['biweekly on tues', { kind: 'weekly', interval: 2, weekdays: [2] }],
    ['every 3 weeks on Monday', { kind: 'weekly', interval: 3, weekdays: [1] }],
    ['every first Monday', { kind: 'monthly-nth', nths: [1], weekdays: [1] }],
    ['1st & 3rd Friday', { kind: 'monthly-nth', nths: [1, 3], weekdays: [5] }],
    ['last Sunday of the month', { kind: 'monthly-nth', nths: [-1], weekdays: [0] }],
    ['monthly on the 15th', { kind: 'monthly-day', days: [15] }],
    ['the 1st and 15th of every month', { kind: 'monthly-day', days: [1, 15] }],
    ['daily', { kind: 'daily' }],
  ])('%s', (text, rule) => {
    expect(parseRule(text)).toEqual(rule);
  });

  it('returns null for things it cannot read', () => {
    expect(parseRule('')).toBeNull();
    expect(parseRule('sometimes')).toBeNull();
    expect(parseRule('every month')).toBeNull();
  });
});

describe('occursOn', () => {
  it('every first Monday', () => {
    expect(datesIn(parseRule('first Monday')!, '2026-10-01', 92)).toEqual(['2026-10-05', '2026-11-02', '2026-12-07']);
  });

  it('last Friday', () => {
    expect(datesIn(parseRule('last Friday')!, '2026-10-01', 61)).toEqual(['2026-10-30', '2026-11-27']);
  });

  it('every other Thursday counts from the anchor date', () => {
    const rule = parseRule('every other Thursday')!;
    expect(datesIn(rule, '2026-10-01', 35, '2026-10-01')).toEqual(['2026-10-01', '2026-10-15', '2026-10-29']);
    expect(datesIn(rule, '2026-10-01', 35, '2026-10-08')).toEqual(['2026-10-08', '2026-10-22']);
  });

  it('every other week works when the anchor is a different weekday', () => {
    // Anchored on a Saturday; Tuesdays of that week and every second week after.
    expect(datesIn(parseRule('every other Tuesday')!, '2026-10-01', 31, '2026-10-03')).toEqual([
      '2026-10-13',
      '2026-10-27',
    ]);
  });

  it('crosses a DST change without drifting', () => {
    expect(datesIn(parseRule('every Sunday')!, '2026-10-25', 15)).toEqual(['2026-10-25', '2026-11-01', '2026-11-08']);
  });
});

describe('describeRule', () => {
  it.each([
    ['every other thursday', 'Every other Thursday'],
    ['1st & 3rd monday', 'Every 1st & 3rd Monday of the month'],
    ['weekends', 'Every weekend'],
    ['monthly on the 1st and 22nd', 'Monthly on the 1st & 22nd'],
  ])('%s', (text, out) => {
    expect(describeRule(parseRule(text)!)).toBe(out);
  });
});
