import { parseNotionDate } from './dates';
import { canonicalCity, findCity, isDfw } from './regions';
import type { Entry, Occurrence } from './types';

export type NotionRow = Record<string, string | undefined>;

const OCCURRENCE: Record<string, Occurrence> = {
  'one-time': 'one-time',
  'one time': 'one-time',
  onetime: 'one-time',
  recurring: 'recurring',
  reoccurring: 'recurring',
  temporary: 'temporary',
  evergreen: 'evergreen',
};

/** FNV-1a: stable short id from name + created time (the CSV export has no page id). */
function hashId(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** "BAR" → "Bar", "game night" → "Game night". */
function tidyCategory(c: string): string {
  const s = c.trim();
  if (s.length > 2 && s === s.toUpperCase()) return s[0] + s.slice(1).toLowerCase();
  return s[0].toUpperCase() + s.slice(1);
}

const field = (row: NotionRow, ...names: string[]) => {
  for (const n of names) {
    const v = row[n]?.trim();
    if (v) return v;
  }
  return undefined;
};

export function normalizeRow(row: NotionRow): Entry | null {
  const name = field(row, 'Name');
  if (!name) return null;

  const { start, end, time } = parseNotionDate(field(row, 'Date') ?? '');
  const rawType = field(row, 'Occurence', 'Occurrence')?.toLowerCase();
  let occurrence: Occurrence = (rawType && OCCURRENCE[rawType]) || 'unsorted';
  let typeInferred = false;
  if (occurrence === 'unsorted' && start) {
    occurrence = end ? 'temporary' : 'one-time';
    typeInferred = true;
  }

  const rawCity = field(row, 'Location');
  const city = rawCity ? canonicalCity(rawCity) : undefined;
  const createdAt = field(row, 'Created time');
  const categories = [
    ...new Set(
      (field(row, 'Event Type') ?? '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .map(tidyCategory),
    ),
  ];

  const known = findCity(city);
  return {
    id: hashId(`${name}|${createdAt ?? ''}`),
    name,
    occurrence,
    ...(typeInferred && { typeInferred }),
    categories,
    city,
    address: field(row, 'Address'),
    url: field(row, 'URL', 'Source'),
    createdAt,
    start,
    end,
    time,
    repeats: field(row, 'Repeats', 'Repeat', 'Schedule'),
    inDfw: isDfw(city),
    geo: known ? { lat: known.lat, lng: known.lng, precision: 'city' } : undefined,
  };
}
