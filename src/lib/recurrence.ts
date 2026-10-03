import { daysInMonth, diffDays, parts, weekday, WEEKDAY_LONG } from './dates';
import type { ISODate } from './types';

/**
 * A repeat rule written in plain English, so it can live in a Notion text
 * property ("Repeats"). Supported shapes:
 *   every Thursday · Thursdays · Fridays and Saturdays · weekends
 *   every other Thursday · every 3 weeks on Monday   (counts from the Date)
 *   first Monday · 1st & 3rd Friday · last Sunday of the month
 *   monthly on the 15th · the 1st and 15th of every month
 *   daily · every day
 */
export type Rule =
  | { kind: 'daily' }
  | { kind: 'weekly'; interval: number; weekdays: number[] }
  | { kind: 'monthly-nth'; nths: number[]; weekdays: number[] } // nth -1 = last
  | { kind: 'monthly-day'; days: number[] };

const DAY_PATTERNS: [RegExp, number[]][] = [
  [/\bweekends?\b/, [0, 6]],
  [/\bweekdays\b/, [1, 2, 3, 4, 5]],
  [/\bsun(day)?s?\b/, [0]],
  [/\bmon(day)?s?\b/, [1]],
  [/\btue(s|sday)?s?\b/, [2]],
  [/\bwed(nesday)?s?\b/, [3]],
  [/\bthu(r|rs|rsday)?s?\b/, [4]],
  [/\bfri(day)?s?\b/, [5]],
  [/\bsat(urday)?s?\b/, [6]],
];

const ORDINALS: [RegExp, number][] = [
  [/\b(1st|first)\b/, 1],
  [/\b(2nd|second)\b/, 2],
  [/\b(3rd|third)\b/, 3],
  [/\b(4th|fourth)\b/, 4],
  [/\b(5th|fifth)\b/, 5],
  [/\blast\b/, -1],
];

export function parseRule(text: string | undefined): Rule | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/[,&+]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;

  const weekdays = [...new Set(DAY_PATTERNS.filter(([re]) => re.test(t)).flatMap(([, d]) => d))].sort();

  if (!weekdays.length) {
    if (/\b(daily|every ?day)\b/.test(t)) return { kind: 'daily' };
    if (/\bmonth/.test(t)) {
      const days = [...t.matchAll(/\b(\d{1,2})(st|nd|rd|th)?\b/g)].map((m) => Number(m[1])).filter((d) => d >= 1 && d <= 31);
      if (days.length) return { kind: 'monthly-day', days: [...new Set(days)].sort((a, b) => a - b) };
    }
    return null;
  }

  const nths = ORDINALS.filter(([re]) => re.test(t)).map(([, n]) => n);
  if (nths.length) return { kind: 'monthly-nth', nths, weekdays };

  let interval = 1;
  if (/\b(every other|other|biweekly|bi-weekly|alternate|alternating)\b/.test(t)) interval = 2;
  const n = /\bevery (\d+) weeks?\b/.exec(t);
  if (n) interval = Math.max(1, Number(n[1]));
  return { kind: 'weekly', interval, weekdays };
}

/** Does the rule fall on `date`? `anchor` (the entry's start date) sets the phase of "every other". */
export function occursOn(rule: Rule, date: ISODate, anchor?: ISODate): boolean {
  const { y, m, d } = parts(date);
  switch (rule.kind) {
    case 'daily':
      return true;
    case 'monthly-day':
      return rule.days.includes(d);
    case 'monthly-nth': {
      if (!rule.weekdays.includes(weekday(date))) return false;
      const nth = Math.ceil(d / 7);
      const isLast = d + 7 > daysInMonth(y, m);
      return rule.nths.includes(nth) || (isLast && rule.nths.includes(-1));
    }
    case 'weekly': {
      if (!rule.weekdays.includes(weekday(date))) return false;
      if (rule.interval === 1 || !anchor) return true;
      // Compare the Sundays that start each week.
      const weeks = Math.round(diffDays(anchor, date) / 7 + (weekday(anchor) - weekday(date)) / 7);
      return ((weeks % rule.interval) + rule.interval) % rule.interval === 0;
    }
  }
}

const ORDINAL_WORD: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', [-1]: 'last' };

function joinAnd(xs: string[]): string {
  return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} & ${xs[xs.length - 1]}`;
}

export function describeRule(rule: Rule): string {
  const days = (ws: number[]) =>
    ws.length === 2 && ws[0] === 0 && ws[1] === 6 ? 'weekend' : joinAnd(ws.map((w) => WEEKDAY_LONG[w]));
  switch (rule.kind) {
    case 'daily':
      return 'Every day';
    case 'monthly-day':
      return `Monthly on the ${joinAnd(rule.days.map((d) => `${d}${d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th'}`))}`;
    case 'monthly-nth':
      return `Every ${joinAnd(rule.nths.map((n) => ORDINAL_WORD[n]))} ${days(rule.weekdays)} of the month`;
    case 'weekly':
      if (rule.interval === 1) return `Every ${days(rule.weekdays)}`;
      if (rule.interval === 2) return `Every other ${days(rule.weekdays)}`;
      return `Every ${rule.interval} weeks on ${days(rule.weekdays)}`;
  }
}
