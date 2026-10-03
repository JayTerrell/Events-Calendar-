import { useMemo } from 'react';
import { monthGrid, monthTitle, parts, WEEKDAY_SHORT } from '../lib/dates';
import { activeOn, isShortRun, type Item } from '../lib/schedule';
import type { ISODate } from '../lib/types';

interface Props {
  items: Item[];
  year: number;
  month: number;
  today: ISODate;
  selected: ISODate;
  isPlanned: (id: string, date: ISODate) => boolean;
  onSelect: (d: ISODate) => void;
  onShift: (delta: number) => void;
  onToday: () => void;
}

const MAX_CHIPS = 3;

export default function CalendarView({ items, year, month, today, selected, isPlanned, onSelect, onShift, onToday }: Props) {
  const days = useMemo(() => {
    return monthGrid(year, month).map((date) => {
      const active = items.filter((i) => activeOn(i, date));
      const planned = active.filter((i) => isPlanned(i.id, date));
      const events = active.filter(
        (i) => !isPlanned(i.id, date) && (i.occurrence === 'one-time' || i.occurrence === 'recurring' || isShortRun(i)),
      );
      const running = active.filter((i) => i.occurrence === 'temporary' && !isShortRun(i) && !isPlanned(i.id, date));
      return { date, planned, events, running };
    });
  }, [items, year, month, isPlanned]);

  return (
    <section className="calendar" aria-label="Calendar">
      <div className="cal-head">
        <h2>{monthTitle(year, month)}</h2>
        <div className="cal-nav">
          <button onClick={() => onShift(-1)} aria-label="Previous month">‹</button>
          <button onClick={onToday}>Today</button>
          <button onClick={() => onShift(1)} aria-label="Next month">›</button>
        </div>
      </div>
      <div className="grid" role="grid">
        {WEEKDAY_SHORT.map((w) => (
          <div key={w} className="dow" role="columnheader">
            {w}
          </div>
        ))}
        {days.map(({ date, planned, events, running }) => {
          const { m, d } = parts(date);
          const shown = [...planned, ...events].slice(0, MAX_CHIPS);
          const more = planned.length + events.length - shown.length;
          const cls = [
            'cell',
            m !== month && 'outside',
            date === today && 'today',
            date === selected && 'selected',
            date < today && 'past',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button key={date} className={cls} onClick={() => onSelect(date)} role="gridcell" aria-selected={date === selected}>
              <span className="num">{d}</span>
              <span className="chips">
                {shown.map((i) => {
                  const isPlan = planned.includes(i);
                  return (
                    <span key={i.id} className={`chip t-${i.occurrence} ${isPlan ? 'planned' : ''}`} title={i.name}>
                      {isPlan && '★ '}
                      {i.name}
                    </span>
                  );
                })}
                {more > 0 && <span className="more">+{more} more</span>}
              </span>
              {running.length > 0 && (
                <span className="running" title={running.map((i) => i.name).join('\n')}>
                  <span className="bar" />
                  {running.length} running
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
