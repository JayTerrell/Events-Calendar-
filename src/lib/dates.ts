import type { ISODate } from './types';

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(y: number, m: number, d: number): ISODate {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parts(iso: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

// All arithmetic goes through UTC so daylight-saving shifts never move a date.
const toUTC = (iso: ISODate) => {
  const { y, m, d } = parts(iso);
  return Date.UTC(y, m - 1, d);
};
const fromUTC = (ms: number): ISODate => {
  const dt = new Date(ms);
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
};

export const addDays = (iso: ISODate, n: number) => fromUTC(toUTC(iso) + n * 86_400_000);
export const diffDays = (from: ISODate, to: ISODate) => Math.round((toUTC(to) - toUTC(from)) / 86_400_000);
export const weekday = (iso: ISODate) => new Date(toUTC(iso)).getUTCDay();
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function todayISO(): ISODate {
  const now = new Date();
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** 6x7 grid of dates covering the month, starting on Sunday. */
export function monthGrid(y: number, m: number): ISODate[] {
  const first = toISO(y, m, 1);
  const start = addDays(first, -weekday(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function formatShort(iso: ISODate): string {
  const { m, d } = parts(iso);
  return `${MONTH_SHORT[m - 1]} ${d}`;
}

export function formatLong(iso: ISODate): string {
  const { y, m, d } = parts(iso);
  return `${WEEKDAY_LONG[weekday(iso)]}, ${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${d}, ${y}`;
}

export function monthTitle(y: number, m: number): string {
  return `${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}`;
}

export function formatTime(hhmm: string): string {
  const [h, min] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min ? `${h12}:${pad(min)}${suffix}` : `${h12}${suffix}`;
}

const SIDE = /([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i;

function parseSide(s: string): { date: ISODate; time?: string } | null {
  const m = SIDE.exec(s);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase()) + 1;
  if (!month) return null;
  const date = toISO(Number(m[3]), month, Number(m[2]));
  if (!m[4]) return { date };
  let h = Number(m[4]);
  const ampm = m[6]?.toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return { date, time: `${pad(h)}:${m[5]}` };
}

/**
 * Parses Notion's CSV date column:
 *   "October 9, 2026"
 *   "October 9, 2026 → October 17, 2026"
 *   "June 28, 2026 18:30 (CDT)"  /  "June 28, 2026 6:30 PM"
 */
export function parseNotionDate(raw: string): { start?: ISODate; end?: ISODate; time?: string } {
  if (!raw?.trim()) return {};
  const [a, b] = raw.split('→');
  const start = parseSide(a);
  if (!start) return {};
  const end = b ? parseSide(b) : null;
  return {
    start: start.date,
    end: end && end.date !== start.date ? end.date : undefined,
    time: start.time,
  };
}
