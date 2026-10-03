import { useMemo, useState } from 'react';
import { ISSUE_INFO, issuesFor, type IssueKey, type Item } from '../lib/schedule';
import { hostLabel } from './EntryCard';

const ORDER: IssueKey[] = ['needs-schedule', 'bad-schedule', 'needs-date', 'type-guessed', 'no-location', 'unsorted'];

export default function InboxView({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<Set<IssueKey>>(new Set(['needs-schedule', 'bad-schedule', 'needs-date', 'type-guessed']));
  const groups = useMemo(
    () =>
      ORDER.map((k) => ({
        key: k,
        list: items.filter((i) => issuesFor(i).includes(k)).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
      })).filter((g) => g.list.length),
    [items],
  );

  const toggle = (k: IssueKey) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <main className="inbox">
      <p className="intro">
        Entries the calendar can’t place yet. Fix them in Notion, re-export, and run the import again.
      </p>
      {groups.map(({ key, list }) => (
        <section key={key} className="inbox-group">
          <button className="group-toggle" onClick={() => toggle(key)} aria-expanded={open.has(key)}>
            {ISSUE_INFO[key].title} · {list.length}
            <span className="hint">{open.has(key) ? 'Hide' : 'Show'}</span>
          </button>
          {open.has(key) && (
            <>
              <p className="fix">{ISSUE_INFO[key].fix}</p>
              <ul>
                {list.map((i) => (
                  <li key={i.id}>
                    <span className={`dot t-${i.occurrence}`} />
                    <span className="name">{i.name}</span>
                    {i.categories.length > 0 && <span className="muted"> · {i.categories.join(', ')}</span>}
                    {i.url && (
                      <a href={i.url} target="_blank" rel="noreferrer">
                        {hostLabel(i.url)} ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      ))}
    </main>
  );
}
