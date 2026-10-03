import * as maplibregl from 'maplibre-gl';
// MapLibre runs tile decoding in a web worker; let Vite bundle it and tell MapLibre where it lives.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatShort, weekday, WEEKDAY_SHORT } from '../lib/dates';
import { activeOn, type Item } from '../lib/schedule';
import { TYPES, TYPE_LABEL, type ISODate } from '../lib/types';
import EntryCard from './EntryCard';

interface Props {
  items: Item[];
  scope: 'all' | 'day';
  onScope: (s: 'all' | 'day') => void;
  date: ISODate;
  onStep: (n: number) => void;
  isPlanned: (id: string, date: ISODate) => boolean;
  onTogglePlan: (id: string, date: ISODate) => void;
  focusId: string | null;
  onFocusDone: () => void;
}

maplibregl.setWorkerUrl(workerUrl);

// OpenFreeMap: free vector tiles, no API key.
const STYLE = (dark: boolean) => `https://tiles.openfreemap.org/styles/${dark ? 'dark' : 'positron'}`;
const DFW_CENTER: [number, number] = [-96.93, 32.86];

/** A pin is either one address, or every entry in a city that only has a city. */
interface Pin {
  key: string;
  lngLat: [number, number];
  items: Item[];
  city?: string;
}

const typeOrder = (i: Item) => TYPES.indexOf(i.occurrence as (typeof TYPES)[number]);

export default function MapView({ items, scope, onScope, date, onStep, isPlanned, onTogglePlan, focusId, onFocusDone }: Props) {
  const dark = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const popupEl = useMemo(() => document.createElement('div'), []);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const inScope = useMemo(() => (scope === 'day' ? items.filter((i) => activeOn(i, date)) : items), [items, scope, date]);

  const pins = useMemo<Pin[]>(() => {
    const out: Pin[] = [];
    const cities = new Map<string, Pin>();
    for (const i of inScope) {
      if (!i.geo) continue;
      if (i.geo.precision === 'address') {
        out.push({ key: i.id, lngLat: [i.geo.lng, i.geo.lat], items: [i] });
      } else {
        const key = `city:${i.city}`;
        const pin = cities.get(key) ?? { key, lngLat: [i.geo.lng, i.geo.lat] as [number, number], items: [], city: i.city };
        pin.items.push(i);
        cities.set(key, pin);
      }
    }
    for (const p of cities.values()) p.items.sort((a, b) => typeOrder(a) - typeOrder(b) || a.name.localeCompare(b.name));
    // City bubbles first so address pins draw on top.
    return [...cities.values(), ...out];
  }, [inScope]);

  const exactCount = pins.filter((p) => !p.city).length;
  const cityCount = pins.filter((p) => p.city).reduce((n, p) => n + p.items.length, 0);
  const unmapped = inScope.filter((i) => !i.geo).length;

  // Create the map once.
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: STYLE(dark),
      center: DFW_CENTER,
      zoom: 9.2,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [dark]);

  // Draw pins.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = pins.map((pin) => {
      const el = document.createElement('button');
      el.type = 'button';
      if (pin.city) {
        const size = 26 + Math.min(pin.items.length, 60) / 3;
        el.className = 'pin city-pin';
        el.style.width = el.style.height = `${size}px`;
        el.textContent = String(pin.items.length);
        el.setAttribute('aria-label', `${pin.city}: ${pin.items.length} entries without an address`);
      } else {
        const i = pin.items[0];
        el.className = `pin t-${i.occurrence} ${scope === 'day' && isPlanned(i.id, date) ? 'planned' : ''}`;
        el.setAttribute('aria-label', i.name);
        el.title = i.name;
      }
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpenKey(pin.key);
      });
      return new maplibregl.Marker({ element: el }).setLngLat(pin.lngLat).addTo(map);
    });
    return () => markers.forEach((m) => m.remove());
  }, [pins, scope, date, isPlanned]);

  // Open / move the popup; React renders its content through a portal.
  const openPin = pins.find((p) => p.key === openKey);
  useEffect(() => {
    const map = mapRef.current;
    popupRef.current?.remove();
    popupRef.current = null;
    if (!map || !openPin) return;
    const popup = new maplibregl.Popup({ offset: 14, maxWidth: '340px', focusAfterOpen: false })
      .setLngLat(openPin.lngLat)
      .setDOMContent(popupEl)
      .addTo(map);
    popup.on('close', () => setOpenKey((k) => (k === openPin.key ? null : k)));
    popupRef.current = popup;
  }, [openPin?.key, popupEl]);

  // "Map" button on a card: fly there and open it.
  useEffect(() => {
    if (!focusId) return;
    const item = items.find((i) => i.id === focusId);
    const map = mapRef.current;
    if (item?.geo && map) {
      map.flyTo({ center: [item.geo.lng, item.geo.lat], zoom: Math.max(map.getZoom(), item.geo.precision === 'city' ? 11 : 14) });
      setOpenKey(item.geo.precision === 'address' ? item.id : `city:${item.city}`);
    }
    onFocusDone();
  }, [focusId, items, onFocusDone]);

  const card = (i: Item) => (
    <EntryCard
      key={i.id}
      item={i}
      date={scope === 'day' ? date : undefined}
      planned={scope === 'day' ? isPlanned(i.id, date) : undefined}
      onTogglePlan={scope === 'day' ? () => onTogglePlan(i.id, date) : undefined}
    />
  );

  return (
    <main className="mapview">
      <div className="map-bar">
        <div className="seg" role="group" aria-label="Map scope">
          <button className={scope === 'all' ? 'on' : ''} onClick={() => onScope('all')}>
            Everything
          </button>
          <button className={scope === 'day' ? 'on' : ''} onClick={() => onScope('day')}>
            What’s on {WEEKDAY_SHORT[weekday(date)]}, {formatShort(date)}
          </button>
        </div>
        {scope === 'day' && (
          <div className="cal-nav">
            <button onClick={() => onStep(-1)} aria-label="Previous day">‹</button>
            <button onClick={() => onStep(1)} aria-label="Next day">›</button>
          </div>
        )}
        <div className="legend">
          {TYPES.map((t) => (
            <span key={t}>
              <span className={`dot t-${t}`} /> {TYPE_LABEL[t]}
            </span>
          ))}
          <span>
            <span className="dot city" /> City only (no address yet)
          </span>
        </div>
      </div>
      <div className="mapwrap">
        <div ref={containerRef} className="map" />
      </div>
      <p className="map-foot">
        {exactCount} pinned by address · {cityCount} at city level{unmapped > 0 && ` · ${unmapped} with no location`}
      </p>
      {openPin &&
        createPortal(
          <div className="map-popup">
            {openPin.city && (
              <h4>
                {openPin.city} · {openPin.items.length} without an address
              </h4>
            )}
            <div className="map-popup-list">{openPin.items.map(card)}</div>
          </div>,
          popupEl,
        )}
    </main>
  );
}
