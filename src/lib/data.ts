import type { Entry } from './types';

export interface Dataset {
  entries: Entry[];
  importedAt?: string;
  isSample: boolean;
}

/** Your import (public/data/entries.json, git-ignored) if present, otherwise the bundled sample. */
export async function loadDataset(): Promise<Dataset> {
  const base = import.meta.env.BASE_URL;
  try {
    const res = await fetch(`${base}data/entries.json`, { cache: 'no-store' });
    if (res.ok && res.headers.get('content-type')?.includes('json')) {
      const json = await res.json();
      return { entries: json.entries, importedAt: json.importedAt, isSample: false };
    }
  } catch {
    /* fall through to sample */
  }
  const res = await fetch(`${base}sample/entries.json`);
  const json = await res.json();
  return { entries: json.entries, importedAt: json.importedAt, isSample: true };
}
