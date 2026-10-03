export type ISODate = string; // YYYY-MM-DD, always a local calendar date

export type Occurrence = 'one-time' | 'recurring' | 'temporary' | 'evergreen' | 'unsorted';

export const TYPES: Exclude<Occurrence, 'unsorted'>[] = ['one-time', 'recurring', 'temporary', 'evergreen'];

export const TYPE_LABEL: Record<Occurrence, string> = {
  'one-time': 'One-time',
  recurring: 'Recurring',
  temporary: 'Temporary',
  evergreen: 'Evergreen',
  unsorted: 'Unsorted',
};

export interface Geo {
  lat: number;
  lng: number;
  /** 'address' = geocoded from the Address field; 'city' = city centre only. */
  precision: 'address' | 'city';
}

/** One row of the Notion database, cleaned up. Produced by scripts/import.ts. */
export interface Entry {
  id: string;
  name: string;
  occurrence: Occurrence;
  /** True when Occurence was blank and the type was guessed from the Date. */
  typeInferred?: boolean;
  categories: string[];
  city?: string;
  address?: string;
  url?: string;
  createdAt?: string;
  start?: ISODate;
  end?: ISODate;
  /** 24h "HH:MM" when the Notion date carried a time. */
  time?: string;
  /** Free-text repeat rule, e.g. "every other Thursday", "1st & 3rd Monday". */
  repeats?: string;
  inDfw: boolean;
  geo?: Geo;
}
