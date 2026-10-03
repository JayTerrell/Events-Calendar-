import type { Item } from './schedule';
import type { Occurrence } from './types';

export interface Filters {
  types: Set<Occurrence>;
  category: string; // '' = all
  search: string;
  dfwOnly: boolean;
}

export const defaultFilters = (): Filters => ({
  types: new Set<Occurrence>(['one-time', 'recurring', 'temporary', 'evergreen']),
  category: '',
  search: '',
  dfwOnly: true,
});

/** Everything except the type toggle, so the toggle chips can show counts. */
export function passesBase(item: Item, f: Filters): boolean {
  if (f.dfwOnly && !item.inDfw) return false;
  if (f.category && !item.categories.includes(f.category)) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    const hay = `${item.name} ${item.categories.join(' ')} ${item.city ?? ''} ${item.address ?? ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export const passes = (item: Item, f: Filters) => f.types.has(item.occurrence) && passesBase(item, f);
