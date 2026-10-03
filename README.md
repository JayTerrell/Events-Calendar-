# Places, Spaces & Things To Do

A calendar and map for a Notion database of DFW events and places.

- **Calendar:** a month view colour-coded by occurrence type (one-time, recurring, temporary, evergreen), with filters for type, category, search and DFW-only.
  - Recurring entries land on every matching day.
  - Short temporary runs show as chips. Long runs are folded into an "N running" line so the grid stays clean.
  - Evergreen places don't clutter the grid. They show in the day panel.
- **Day panel:** click any day to see everything you could do then, grouped by type. **☆ Go** marks a plan, which then appears as a solid ★ chip on the calendar while the other options stay visible.
- **Map:** OpenFreeMap vector tiles (free, no key). Entries with an address get a coloured pin. Entries with only a city are grouped into a dashed bubble per city. You can show everything, or only what's on the selected day.
- **Inbox:** entries the calendar can't place yet, such as recurring with no schedule, missing dates, or no type. Each group tells you what to fix in Notion.

Plans are saved in your browser (localStorage) for now.

## Run it

```bash
npm install
npm run import -- path/to/notion-export.csv   # writes public/data/entries.json
npm run dev
```

Without an import, the app shows a small sample (`public/sample/entries.json`, built from `docs/sample-export.csv`).

Your real data stays out of git because this repo is public. `data/*.csv`, `data/geocache.json`, `data/overrides.json` and `public/data/` are all ignored.

### The import

`scripts/import.ts` reads the Notion CSV export, then:

- **Dates:** parses Notion's formats (`October 9, 2026 → October 17, 2026`, `June 28, 2026 18:30 (CDT)`).
- **Cleanup:** tidies categories (`BAR` → `Bar`) and city names (`Mckinney` → `McKinney`).
- **Types:** guesses the type for dated rows with no Occurence. A single date counts as one-time and a range as temporary. Guessed rows are flagged in the Inbox.
- **Addresses:** geocodes the Address field with OpenStreetMap Nominatim, one request per second. Results are cached in `data/geocache.json`, so a re-import only looks up new addresses. Pass `--no-geocode` to skip this.
- **Overrides:** applies `data/overrides.json`, which patches fields by exact Name. See `data/overrides.example.json`.

## Recommended Notion changes

1. **Add a `Repeats` text property** for recurring entries, and set `Date` to the first occurrence (or a range to bound it). The parser understands:
   - `every Thursday`, `Thursdays`, `Fridays and Saturdays`, `weekends`
   - `every other Thursday`, `every 3 weeks on Monday` (counted from Date)
   - `first Monday`, `1st & 3rd Friday`, `last Sunday of the month`
   - `monthly on the 15th`, `the 1st and 15th of every month`, `daily`
2. **Put a street address or venue name in Address.** Pins are much more useful than city bubbles.
3. **Consider a `Kind` property (Place / Event / Guide).** Many saves are round-ups ("15 free Dallas museums", "100 things to do in Dallas"), not a single place you can go.

## Code map

| Path | What |
| --- | --- |
| `src/lib/recurrence.ts` | Plain-English repeat rules: parse, match a date, describe |
| `src/lib/schedule.ts` | Is an entry on a given day, "when" text, Inbox issues |
| `src/lib/normalize.ts` | Notion CSV row → `Entry` |
| `src/lib/regions.ts` | DFW city centres and the DFW-only filter |
| `src/components/` | Calendar, day panel, map, filters, inbox |
| `scripts/import.ts` | CSV → `public/data/entries.json`, plus geocoding |

`npm test` runs the recurrence and date tests. `npm run build` type-checks and builds.
