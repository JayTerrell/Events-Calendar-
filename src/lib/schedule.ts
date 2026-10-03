import { diffDays, formatShort, formatTime } from './dates';
import { describeRule, occursOn, parseRule, type Rule } from './recurrence';
import type { Entry, ISODate } from './types';

export interface Item extends Entry {
  rule: Rule | null;
}

export const prepare = (entries: Entry[]): Item[] => entries.map((e) => ({ ...e, rule: parseRule(e.repeats) }));

const within = (date: ISODate, start?: ISODate, end?: ISODate) =>
  (!start || date >= start) && (!end || date <= end);

/** Is this entry something you could do on `date`, according to the database? */
export function activeOn(item: Item, date: ISODate): boolean {
  switch (item.occurrence) {
    case 'one-time':
      return !!item.start && within(date, item.start, item.end ?? item.start);
    case 'temporary':
      return !!item.start && within(date, item.start, item.end ?? item.start);
    case 'recurring':
      if (item.rule) return within(date, item.start, item.end) && occursOn(item.rule, date, item.start);
      // No schedule yet: show it on the one date we know about.
      return item.start === date;
    case 'evergreen':
      return within(date, item.start, item.end);
    case 'unsorted':
      return false;
  }
}

/** Short run (≤ 3 days) temporaries get a chip on the calendar like events; long runs are summarised. */
export const isShortRun = (item: Item) =>
  item.occurrence === 'temporary' && !!item.start && diffDays(item.start, item.end ?? item.start) < 3;

/** One-line "when" text for cards and popups. */
export function whenText(item: Item, date?: ISODate): string {
  const time = item.time ? ` · ${formatTime(item.time)}` : '';
  switch (item.occurrence) {
    case 'one-time':
      if (!item.start) return 'Date not set';
      return (item.end ? `${formatShort(item.start)} – ${formatShort(item.end)}` : formatShort(item.start)) + time;
    case 'recurring':
      if (item.rule) return describeRule(item.rule) + time;
      return item.repeats ? `“${item.repeats}” (couldn’t read this schedule)` : 'Schedule not set yet';
    case 'temporary': {
      if (!item.start) return 'Dates not set';
      if (!item.end) return formatShort(item.start) + time;
      const range = `${formatShort(item.start)} – ${formatShort(item.end)}`;
      if (!date) return range;
      const left = diffDays(date, item.end);
      if (left === 0) return `${range} · last day`;
      if (date === item.start) return `${range} · opens today`;
      return `${range} · ${left} day${left === 1 ? '' : 's'} left`;
    }
    case 'evergreen':
      return item.end ? `Until ${formatShort(item.end)}` : 'Always open';
    case 'unsorted':
      return 'Not sorted yet';
  }
}

export type IssueKey = 'needs-schedule' | 'bad-schedule' | 'needs-date' | 'type-guessed' | 'unsorted' | 'no-location';

export const ISSUE_INFO: Record<IssueKey, { title: string; fix: string }> = {
  'needs-schedule': {
    title: 'Recurring, but no schedule',
    fix: 'Add a “Repeats” text property in Notion, e.g. “every other Thursday” or “1st Monday”. Set Date to the first occurrence.',
  },
  'bad-schedule': {
    title: 'Schedule I couldn’t read',
    fix: 'Try a shape like “every Friday”, “every other Thursday”, “1st & 3rd Monday”, “last Sunday”, or “monthly on the 15th”.',
  },
  'needs-date': {
    title: 'One-time or temporary, but no date',
    fix: 'Fill in Date (use an end date for temporary runs) so it lands on the calendar.',
  },
  'type-guessed': {
    title: 'Dated, but no Occurence — type was guessed',
    fix: 'Set Occurence in Notion to confirm. A single date was treated as one-time, a range as temporary.',
  },
  unsorted: {
    title: 'Not sorted yet',
    fix: 'No Occurence and no Date, so these only live here (and on the map if they have a location).',
  },
  'no-location': {
    title: 'No location',
    fix: 'Add Location (city) and ideally Address so they can go on the map.',
  },
};

export function issuesFor(item: Item): IssueKey[] {
  const out: IssueKey[] = [];
  if (item.occurrence === 'unsorted') out.push('unsorted');
  if (item.typeInferred) out.push('type-guessed');
  if (item.occurrence === 'recurring' && !item.rule) out.push(item.repeats ? 'bad-schedule' : 'needs-schedule');
  if ((item.occurrence === 'one-time' || item.occurrence === 'temporary') && !item.start) out.push('needs-date');
  if (item.occurrence !== 'unsorted' && !item.city && !item.address) out.push('no-location');
  return out;
}
