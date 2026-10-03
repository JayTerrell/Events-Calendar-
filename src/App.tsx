import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import CalendarView from './components/CalendarView';
import DayPanel from './components/DayPanel';
import FilterBar from './components/FilterBar';
import InboxView from './components/InboxView';
import { loadDataset, type Dataset } from './lib/data';
import { addDays, parts, todayISO } from './lib/dates';
import { defaultFilters, passes, type Filters } from './lib/filters';
import { usePlans } from './lib/plans';
import { issuesFor, prepare } from './lib/schedule';
import type { ISODate } from './lib/types';

// The map library is big; only load it when the Map tab is opened.
const MapView = lazy(() => import('./components/MapView'));

type View = 'calendar' | 'map' | 'inbox';

export default function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('calendar');
  const today = todayISO();
  const [selected, setSelected] = useState<ISODate>(today);
  const [month, setMonth] = useState(() => {
    const { y, m } = parts(today);
    return { y, m };
  });
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [mapScope, setMapScope] = useState<'all' | 'day'>('all');
  const [focusId, setFocusId] = useState<string | null>(null);
  const plans = usePlans();

  useEffect(() => {
    loadDataset().then(setData, (e) => setError(String(e)));
  }, []);

  const items = useMemo(() => (data ? prepare(data.entries) : []), [data]);
  const visible = useMemo(() => items.filter((i) => passes(i, filters)), [items, filters]);
  // Badge counts only the fixable problems, not the long tail of unsorted saves.
  const inboxCount = useMemo(
    () => items.filter((i) => issuesFor(i).some((k) => k !== 'unsorted' && k !== 'no-location')).length,
    [items],
  );

  const selectDate = (d: ISODate) => {
    setSelected(d);
    const { y, m } = parts(d);
    setMonth({ y, m });
  };
  const shiftMonth = (delta: number) =>
    setMonth(({ y, m }) => {
      const n = (y * 12 + (m - 1) + delta);
      return { y: Math.floor(n / 12), m: (n % 12) + 1 };
    });
  const clearFocus = useCallback(() => setFocusId(null), []);
  const showOnMap = (id: string) => {
    setFocusId(id);
    setView('map');
  };

  if (error) return <div className="state">Couldn’t load data: {error}</div>;
  if (!data) return <div className="state">Loading…</div>;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Places, Spaces &amp; Things To Do</h1>
          <span className="sub">
            {data.isSample ? 'Sample data — run npm run import to load your Notion export' : `${items.length} entries`}
          </span>
        </div>
        <nav className="tabs" aria-label="View">
          {(['calendar', 'map', 'inbox'] as View[]).map((v) => (
            <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
              {v === 'calendar' ? 'Calendar' : v === 'map' ? 'Map' : 'Inbox'}
              {v === 'inbox' && inboxCount > 0 && <span className="badge">{inboxCount}</span>}
            </button>
          ))}
        </nav>
      </header>

      {view !== 'inbox' && <FilterBar items={items} filters={filters} onChange={setFilters} />}

      {view === 'calendar' && (
        <main className="split">
          <CalendarView
            items={visible}
            year={month.y}
            month={month.m}
            today={today}
            selected={selected}
            isPlanned={plans.isPlanned}
            onSelect={selectDate}
            onShift={shiftMonth}
            onToday={() => selectDate(today)}
          />
          <DayPanel
            date={selected}
            items={visible}
            today={today}
            isPlanned={plans.isPlanned}
            onTogglePlan={plans.toggle}
            onShowOnMap={showOnMap}
            onStep={(n) => selectDate(addDays(selected, n))}
          />
        </main>
      )}

      {view === 'map' && (
        <Suspense fallback={<div className="state">Loading map…</div>}>
          <MapView
            items={visible}
            scope={mapScope}
            onScope={setMapScope}
            date={selected}
            onStep={(n) => selectDate(addDays(selected, n))}
            isPlanned={plans.isPlanned}
            onTogglePlan={plans.toggle}
            focusId={focusId}
            onFocusDone={clearFocus}
          />
        </Suspense>
      )}

      {view === 'inbox' && <InboxView items={items} />}
    </div>
  );
}
