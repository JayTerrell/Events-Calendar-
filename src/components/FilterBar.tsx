import { useMemo } from 'react';
import { passesBase, type Filters } from '../lib/filters';
import type { Item } from '../lib/schedule';
import { TYPES, TYPE_LABEL } from '../lib/types';

interface Props {
  items: Item[];
  filters: Filters;
  onChange: (f: Filters) => void;
}

export default function FilterBar({ items, filters, onChange }: Props) {
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items) if (i.occurrence !== 'unsorted') for (const c of i.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const i of items) if (passesBase(i, filters)) out[i.occurrence] = (out[i.occurrence] ?? 0) + 1;
    return out;
  }, [items, filters]);

  const toggleType = (t: (typeof TYPES)[number]) => {
    const types = new Set(filters.types);
    if (types.has(t)) types.delete(t);
    else types.add(t);
    onChange({ ...filters, types });
  };

  return (
    <div className="filterbar">
      <div className="type-toggles" role="group" aria-label="Event types">
        {TYPES.map((t) => (
          <button
            key={t}
            className={`type-toggle t-${t} ${filters.types.has(t) ? 'on' : ''}`}
            aria-pressed={filters.types.has(t)}
            onClick={() => toggleType(t)}
          >
            <span className="dot" />
            {TYPE_LABEL[t]}
            <span className="count">{counts[t] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="filter-fields">
        <select value={filters.category} onChange={(e) => onChange({ ...filters, category: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {categories.map(([c, n]) => (
            <option key={c} value={c}>
              {c} ({n})
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          aria-label="Search"
        />
        <label className="check">
          <input type="checkbox" checked={filters.dfwOnly} onChange={(e) => onChange({ ...filters, dfwOnly: e.target.checked })} />
          DFW only
        </label>
      </div>
    </div>
  );
}
