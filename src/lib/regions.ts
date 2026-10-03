/** City centres used for city-level map pins and the "DFW only" filter. */
export interface City {
  name: string;
  lat: number;
  lng: number;
  dfw: boolean;
}

const CITIES: City[] = [
  { name: 'Dallas', lat: 32.7767, lng: -96.797, dfw: true },
  { name: 'Fort Worth', lat: 32.7555, lng: -97.3308, dfw: true },
  { name: 'DFW', lat: 32.85, lng: -97.0, dfw: true },
  { name: 'Arlington', lat: 32.7357, lng: -97.1081, dfw: true },
  { name: 'Cedar Hill', lat: 32.5885, lng: -96.9561, dfw: true },
  { name: 'Cleburne', lat: 32.3476, lng: -97.3867, dfw: true },
  { name: 'Coppell', lat: 32.9546, lng: -97.015, dfw: true },
  { name: 'Denton', lat: 33.2148, lng: -97.1331, dfw: true },
  { name: 'DeSoto', lat: 32.5899, lng: -96.857, dfw: true },
  { name: 'Euless', lat: 32.8371, lng: -97.082, dfw: true },
  { name: 'Frisco', lat: 33.1507, lng: -96.8236, dfw: true },
  { name: 'Grand Prairie', lat: 32.746, lng: -96.9978, dfw: true },
  { name: 'Grapevine', lat: 32.9343, lng: -97.0781, dfw: true },
  { name: 'Irving', lat: 32.814, lng: -96.9489, dfw: true },
  { name: 'McKinney', lat: 33.1972, lng: -96.6398, dfw: true },
  { name: 'Midlothian', lat: 32.4824, lng: -96.9945, dfw: true },
  { name: 'Pilot Point', lat: 33.3965, lng: -96.9606, dfw: true },
  { name: 'Plano', lat: 33.0198, lng: -96.6989, dfw: true },
  { name: 'Prosper', lat: 33.2362, lng: -96.8011, dfw: true },
  { name: 'Rockwall', lat: 32.9312, lng: -96.4597, dfw: true },
  { name: 'The Colony', lat: 33.089, lng: -96.8864, dfw: true },
  { name: 'Waxahachie', lat: 32.3866, lng: -96.8483, dfw: true },
  { name: 'Austin', lat: 30.2672, lng: -97.7431, dfw: false },
  { name: 'Las Vegas', lat: 36.1699, lng: -115.1398, dfw: false },
  { name: 'San Diego', lat: 32.7157, lng: -117.1611, dfw: false },
];

const BY_KEY = new Map(CITIES.map((c) => [c.name.toLowerCase(), c]));

/** Places in the Location column that are too broad to pin (states, "World"). */
const NOT_DFW = new Set(['colorado', 'arizona', 'california', 'utah', 'tennessee', 'usa', 'world', 'las vegas', 'austin', 'san diego']);

export function findCity(name: string | undefined): City | undefined {
  return name ? BY_KEY.get(name.trim().toLowerCase()) : undefined;
}

/** "Mckinney" → "McKinney", "The colony" → "The Colony"; unknown places pass through. */
export function canonicalCity(name: string): string {
  return findCity(name)?.name ?? name.trim();
}

/** Entries with no location are assumed local (it's a DFW database). */
export function isDfw(city: string | undefined): boolean {
  if (!city) return true;
  const known = findCity(city);
  if (known) return known.dfw;
  return !NOT_DFW.has(city.trim().toLowerCase());
}
