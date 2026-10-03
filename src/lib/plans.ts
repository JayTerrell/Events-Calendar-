import { useCallback, useState } from 'react';
import type { ISODate } from './types';

// Plans ("I'm going") live in this browser for now. Key: `${entryId}|${date}`.
const KEY = 'pst.plans.v1';

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function usePlans() {
  const [plans, setPlans] = useState<Set<string>>(load);

  const toggle = useCallback((id: string, date: ISODate) => {
    setPlans((prev) => {
      const next = new Set(prev);
      const k = `${id}|${date}`;
      if (next.has(k)) next.delete(k);
      else next.add(k);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* storage unavailable: plans last for this visit only */
      }
      return next;
    });
  }, []);

  const isPlanned = useCallback((id: string, date: ISODate) => plans.has(`${id}|${date}`), [plans]);
  const datesWithPlans = useCallback(
    (id: string) => [...plans].filter((k) => k.startsWith(`${id}|`)).map((k) => k.split('|')[1]),
    [plans],
  );

  return { isPlanned, toggle, datesWithPlans };
}
