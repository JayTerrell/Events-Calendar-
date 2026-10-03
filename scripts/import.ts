/**
 * Turns a Notion CSV export into public/data/entries.json for the app.
 *
 *   npm run import -- path/to/export.csv          (default: data/notion-export.csv)
 *   npm run import -- path/to/export.csv --no-geocode
 *
 * Addresses are geocoded with OpenStreetMap Nominatim (1 request/second, cached
 * in data/geocache.json so re-imports only look up new addresses). Entries
 * without an address get a city-level pin from src/lib/regions.ts.
 *
 * data/overrides.json (optional) patches entries by exact Name, e.g.
 *   { "Friday live music at the nasher": { "repeats": "every Friday" } }
 * Handy until the Notion database has a "Repeats" property.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import Papa from 'papaparse';
import { normalizeRow, type NotionRow } from '../src/lib/normalize';
import { findCity } from '../src/lib/regions';
import type { Entry } from '../src/lib/types';

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--')) ?? 'data/notion-export.csv';
const geocode = !args.includes('--no-geocode');
const OUT = 'public/data/entries.json';
const CACHE = 'data/geocache.json';
const OVERRIDES = 'data/overrides.json';

const readJson = <T>(path: string, fallback: T): T => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback);

const csv = readFileSync(input, 'utf8').replace(/^﻿/, '');
const parsed = Papa.parse<NotionRow>(csv, { header: true, skipEmptyLines: true });
if (parsed.errors.length) console.warn(`CSV warnings: ${parsed.errors.length}`, parsed.errors.slice(0, 3));

const overrides = readJson<Record<string, Partial<Entry>>>(OVERRIDES, {});
const entries = parsed.data
  .map(normalizeRow)
  .filter((e): e is Entry => !!e)
  .map((e) => {
    const o = overrides[e.name];
    if (!o) return e;
    const { _note, ...patch } = o as Partial<Entry> & { _note?: string };
    return { ...e, ...patch };
  });

type Hit = { lat: number; lng: number } | null;
const cache = readJson<Record<string, Hit>>(CACHE, {});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function lookup(q: string): Promise<Hit> {
  if (q in cache) return cache[q];
  await sleep(1100); // Nominatim usage policy: max 1 request per second
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'dfw-events-calendar/0.1 (+https://github.com/JayTerrell/Events-Calendar-)' },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status} for "${q}"`);
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  cache[q] = hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  return cache[q];
}

/** Rough distance check so "Bishop Arts" can't land in another state. */
const near = (a: { lat: number; lng: number }, b: { lat: number; lng: number }, km: number) =>
  Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 94) < km;

function queriesFor(e: Entry): string[] {
  const addr = e.address!.replace(/-\d{4}\b/, '').replace(/,?\s*United States$/i, '').trim();
  // "Fort Worth, TX" is just the city again; the city pin already covers it.
  if (e.city && addr.toLowerCase().replace(/,?\s*(tx|texas)$/, '') === e.city.toLowerCase()) return [];
  const local = e.city ? findCity(e.city)?.dfw : true;
  const hasState = /\b(TX|Texas)\b/.test(addr);
  const city = e.city && !addr.toLowerCase().includes(e.city.toLowerCase()) ? `, ${e.city}` : '';
  const suffix = `${city}${local && !hasState ? ', TX' : ''}`;
  const qs = [`${addr}${suffix}`, addr];
  // "White Rock Lake 4100 West Lawther Dr" → "4100 West Lawther Dr, Dallas, TX"
  const street = /\d+\s+\S.*$/.exec(addr)?.[0];
  if (street && street !== addr) qs.push(`${street}${suffix}`);
  return [...new Set(qs)];
}

if (geocode) {
  let found = 0;
  const withAddress = entries.filter((e) => e.address);
  for (const e of withAddress) {
    const city = findCity(e.city);
    for (const q of queriesFor(e)) {
      const hit = await lookup(q);
      if (hit && (!city || near(hit, city, 80))) {
        e.geo = { ...hit, precision: 'address' };
        found++;
        break;
      }
    }
  }
  mkdirSync(dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, JSON.stringify(cache, null, 2));
  console.log(`Geocoded ${found}/${withAddress.length} addresses.`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ importedAt: new Date().toISOString(), entries }, null, 1));

const count = (k: string) => entries.filter((e) => e.occurrence === k).length;
console.log(
  `Wrote ${entries.length} entries to ${OUT}: ` +
    ['one-time', 'recurring', 'temporary', 'evergreen', 'unsorted'].map((k) => `${count(k)} ${k}`).join(', '),
);
