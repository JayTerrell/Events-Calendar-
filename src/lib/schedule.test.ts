import { describe, expect, it } from 'vitest';
import { parseNotionDate } from './dates';
import { normalizeRow } from './normalize';
import { activeOn, issuesFor, prepare } from './schedule';

describe('parseNotionDate', () => {
  it('reads the formats in the Notion export', () => {
    expect(parseNotionDate('October 17, 2026')).toEqual({ start: '2026-10-17', end: undefined, time: undefined });
    expect(parseNotionDate('October 9, 2026 → October 17, 2026')).toEqual({ start: '2026-10-09', end: '2026-10-17', time: undefined });
    expect(parseNotionDate('June 28, 2026 18:30 (CDT)')).toEqual({ start: '2026-06-28', end: undefined, time: '18:30' });
    expect(parseNotionDate('June 28, 2026 6:30 PM')).toMatchObject({ time: '18:30' });
    expect(parseNotionDate('')).toEqual({});
  });
});

const item = (row: Record<string, string>) => prepare([normalizeRow({ Name: 'x', ...row })!])[0];

describe('activeOn', () => {
  it('temporary runs cover their whole range', () => {
    const opera = item({ Occurence: 'Temporary', Date: 'October 9, 2026 → October 17, 2026' });
    expect(activeOn(opera, '2026-10-08')).toBe(false);
    expect(activeOn(opera, '2026-10-09')).toBe(true);
    expect(activeOn(opera, '2026-10-17')).toBe(true);
    expect(activeOn(opera, '2026-10-18')).toBe(false);
  });

  it('recurring entries use Repeats, bounded by Date', () => {
    const jazz = item({ Occurence: 'Recurring', Repeats: 'every Monday', Date: 'October 5, 2026' });
    expect(activeOn(jazz, '2026-09-28')).toBe(false); // a Monday before it started
    expect(activeOn(jazz, '2026-10-05')).toBe(true);
    expect(activeOn(jazz, '2026-10-12')).toBe(true);
    expect(activeOn(jazz, '2026-10-13')).toBe(false);
  });

  it('recurring without a schedule shows only on its known date and is flagged', () => {
    const r = item({ Occurence: 'Recurring', Date: 'June 19, 2026' });
    expect(activeOn(r, '2026-06-19')).toBe(true);
    expect(activeOn(r, '2026-06-26')).toBe(false);
    expect(issuesFor(r)).toContain('needs-schedule');
  });

  it('evergreen is always on', () => {
    expect(activeOn(item({ Occurence: 'Evergreen', Location: 'Dallas' }), '2031-01-01')).toBe(true);
  });

  it('guesses the type of dated but untyped rows', () => {
    const one = item({ Date: 'July 4, 2026' });
    const run = item({ Date: 'July 4, 2026 → July 6, 2026' });
    expect([one.occurrence, run.occurrence]).toEqual(['one-time', 'temporary']);
    expect(issuesFor(one)).toContain('type-guessed');
  });
});

describe('normalizeRow', () => {
  it('tidies categories and cities', () => {
    const e = normalizeRow({ Name: ' Bar ', 'Event Type': 'BAR, game night, activity', Location: 'Mckinney', Occurence: 'Evergreen' })!;
    expect(e.categories).toEqual(['Bar', 'Game night', 'Activity']);
    expect(e.city).toBe('McKinney');
    expect(e.inDfw).toBe(true);
    expect(e.geo?.precision).toBe('city');
  });

  it('marks out-of-town entries', () => {
    expect(normalizeRow({ Name: 'Train', Location: 'Colorado' })!.inDfw).toBe(false);
    expect(normalizeRow({ Name: 'Rooftop', Location: 'Austin' })!.inDfw).toBe(false);
  });
});
