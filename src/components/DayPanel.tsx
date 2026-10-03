import { useMemo, useState } from 'react';
import { formatLong } from '../lib/dates';
import { activeOn, type Item } from '../lib/schedule';
import { TYPE_LABEL, type ISODate, type Occurrence } from '../lib/types';
import EntryCard from './EntryCard';

interface Props {
  date: ISODate;
  items: Item[];
  today: ISODate;
  isPlanned: (id: string, date: ISODate) => boolean;
  onTogglePlan: (id: string, date: ISODate) => void;
  onShowOnMap: (id: string) => void;
  onStep: (n: number) => void;
}

const ORDER: Occurrence[] = ['one-time', 'recurring', 'temporary', 'evergreen'];
const BLURB: Record<string, string> = {
  'one-time': 'Happening this day only',
  recurring: 'On the schedule today',
  temporary: 'Running now, for a limited time',
  evergreen: 'Always there when you want it',
};

const byTimeThenName = (a: Item, b: Item) => (a.time ?? '99').localeCompare(b.time ?? '99') || a.name.localeCompare(b.name);
const byEnd = (a: Item, b: Item) => (a.end ?? a.start ?? '').localeCompare(b.end ?? b.start ?? '');

export default function DayPanel({ date, items, today, isPlanned, onTogglePlan, onShowOnMap, onStep }: Props) {
  const [showEvergreen, setShowEvergreen] = useState(false);

  const { planned, groups } = useMemo(() => {
    const active = items.filter((i) => activeOn(i, date));
    const planned = active.filter((i) => isPlanned(i.id, date)).sort(byTimeThenName);
    const rest = active.filter((i) => !isPlanned(i.id, date));
    const groups = ORDER.map((t) => {
      const list = rest.filter((i) => i.occurrence === t);
      return { type: t, list: list.sort(t === 'temporary' ? byEnd : byTimeThenName) };
    }).filter((g) => g.list.length);
    return { planned, groups };
  }, [items, date, isPlanned]);

  const card = (i: Item) => (
    <EntryCard
      key={i.id}
      item={i}
      date={date}
      planned={isPlanned(i.id, date)}
      onTogglePlan={() => onTogglePlan(i.id, date)}
      onShowOnMap={() => onShowOnMap(i.id)}
    />
  );

  const happening =
    planned.filter((i) => i.occurrence !== 'evergreen').length +
    groups.filter((g) => g.type !== 'evergreen').reduce((n, g) => n + g.list.length, 0);

  return (
    <aside className="daypanel" aria-label="Selected day">
      <div className="day-head">
        <button onClick={() => onStep(-1)} aria-label="Previous day">‹</button>
        <div>
          <h3>{formatLong(date)}</h3>
          <p className="sub">
            {date === today ? 'Today · ' : date < today ? 'Past · ' : ''}
            {happening} happening{planned.length ? ` · ${planned.length} planned` : ''}
          </p>
        </div>
        <button onClick={() => onStep(1)} aria-label="Next day">›</button>
      </div>

      {planned.length > 0 && (
        <section className="group plans">
          <h5>Your plans</h5>
          {planned.map(card)}
        </section>
      )}

      {groups.map(({ type, list }) =>
        type === 'evergreen' ? (
          <section key={type} className="group">
            <button className="group-toggle" onClick={() => setShowEvergreen((v) => !v)} aria-expanded={showEvergreen}>
              <span className={`dot t-${type}`} />
              {TYPE_LABEL[type]} · {list.length}
              <span className="hint">{showEvergreen ? 'Hide' : 'Show'}</span>
            </button>
            {showEvergreen && list.map(card)}
          </section>
        ) : (
          <section key={type} className="group">
            <h5>
              <span className={`dot t-${type}`} />
              {TYPE_LABEL[type]} <span className="hint">{BLURB[type]}</span>
            </h5>
            {list.map(card)}
          </section>
        ),
      )}

      {!groups.length && !planned.length && <p className="empty">Nothing on file for this day with the current filters.</p>}
    </aside>
  );
}
