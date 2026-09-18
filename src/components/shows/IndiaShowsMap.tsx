"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { Show } from "@/content/types";

const INDIA_CENTER: [number, number] = [22.6, 79.0];
const INITIAL_ZOOM = 5;

const pinIcon = L.divIcon({
  className: "",
  html: `<div class="show-pin"><div class="show-pin-body"></div><div class="show-pin-dot"></div></div>`,
  iconSize: [26, 34],
  iconAnchor: [13, 32],
  tooltipAnchor: [0, -30],
});

/**
 * The selected stop's pin, marked as such.
 *
 * A second `divIcon` rather than a class toggled on the first: Leaflet renders
 * an icon's HTML once per marker from the instance it is handed, so mutating
 * the shared one would have to be pushed into every marker by hand. Two icons
 * and a ternary is the whole mechanism. `show-pin--selected` is styled beside
 * `show-pin` in globals.css.
 */
const selectedPinIcon = L.divIcon({
  className: "",
  html: `<div class="show-pin show-pin--selected"><div class="show-pin-body"></div><div class="show-pin-dot"></div></div>`,
  iconSize: [26, 34],
  iconAnchor: [13, 32],
  tooltipAnchor: [0, -30],
});

/**
 * Fly the map to whatever the rail beside it has selected.
 *
 * A child of `MapContainer` rather than a prop on it, because the map instance
 * only exists inside that subtree and `useMap` is how react-leaflet hands it
 * out. `flyTo` rather than `setView`, so a selection reads as travelling
 * between two cities rather than as a cut; and the zoom is held at whatever the
 * visitor had — taking their zoom away every time they pick a stop is the kind
 * of help nobody asked for.
 */
/**
 * LAT AND LNG AS TWO NUMBERS, not one tuple, and that is load-bearing.
 *
 * A `[lat, lng]` array built in the parent's render is a new object on every
 * render, so as an effect dependency it changes every time regardless of where
 * it points — which defeated the first-run guard below on the very next render
 * and flew the map to the default selection anyway. Primitives compare by
 * value, so the effect now runs when the *place* changes and at no other time.
 */
function FlyToSelected({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  /**
   * THE FIRST SELECTION IS NOT A NAVIGATION.
   *
   * The rail opens with its first stop chosen, so that it is never a column of
   * cards with nothing picked and no links showing — but that choice is a
   * default, not something the visitor did. Flying to it on mount threw the map
   * to one city at z6 and took the other four off screen, so the tab opened on
   * a close-up of Goa instead of on the tour. The India-wide framing holds
   * until somebody actually picks a stop.
   *
   * A REMEMBERED PLACE, NOT A "SKIP THE FIRST RUN" FLAG. That was the obvious
   * guard and it does not work: React's StrictMode runs every effect twice in
   * development, a ref survives between the two, so the second pass sailed
   * past the flag and flew to the default anyway. Recording *where* it last
   * flew makes the check idempotent — a second pass with the same coordinates
   * is not a move, however many times it runs.
   *
   * `undefined` means "nothing recorded yet" and is distinct from `null`,
   * which means "recorded, and it was no selection".
   */
  const flownTo = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const place = lat === null || lng === null ? null : `${lat},${lng}`;

    if (flownTo.current === undefined) {
      flownTo.current = place;
      return;
    }
    if (place === null || place === flownTo.current) return;

    flownTo.current = place;
    map.flyTo([lat as number, lng as number], Math.max(map.getZoom(), 6), { duration: 0.7 });
  }, [map, lat, lng]);

  return null;
}

/**
 * Tell Leaflet when its box changed shape.
 *
 * Leaflet measures its container once, at init, and thereafter only re-measures
 * on a *window* resize — it has no idea the element around it moved. That was
 * survivable while this map was the whole tab; it is not now that it is one
 * column of a grid that appears when a tab is switched to. A map initialised
 * against a stale box draws its centre in the wrong place and mis-projects
 * every pin with it, which looks exactly like the wrong coordinates.
 *
 * Two mount-time calls rather than one: the first catches the common case, the
 * second covers a container still settling behind a transition. The observer
 * then handles everything after that.
 */
function KeepMapSized() {
  const map = useMap();

  useEffect(() => {
    const fix = () => map.invalidateSize({ animate: false });
    fix();
    const settle = setTimeout(fix, 250);

    const box = map.getContainer();
    const observer = new ResizeObserver(fix);
    observer.observe(box);

    return () => {
      clearTimeout(settle);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

export function IndiaShowsMap({
  shows,
  selectedId = null,
  onSelect,
}: {
  shows: Show[];
  /** Which stop the rail beside the map is showing, if any. */
  selectedId?: string | null;
  /**
   * Report a pin press back to the rail. Optional: with no handler a pin keeps
   * the behaviour it had before there was anything beside the map to select
   * into, and opens the venue in Google Maps.
   */
  onSelect?: (id: string) => void;
}) {
  const selected = shows.find((s) => s.id === selectedId);
  // Leaflet takes [lat, lng]; the content file stores [lng, lat].
  const selectedLat = selected ? selected.mapCoords[1] : null;
  const selectedLng = selected ? selected.mapCoords[0] : null;

  return (
    <MapContainer
      center={INDIA_CENTER}
      zoom={INITIAL_ZOOM}
      minZoom={4}
      maxZoom={18}
      scrollWheelZoom
      className="w-full h-full"
    >
      {/*
        ESRI, NOT CARTO. The `voyager` tiles still return 200 and a valid PNG,
        but CARTO now stamps "API KEY REQUIRED / carto.com/basemaps/apikey"
        across the bitmap itself when no key is sent — nothing errors, nothing
        logs, the words are simply in the picture.
        World Light Gray Base is keyless and unwatermarked. It trades
        voyager's colour for grey, which on this persona sits perfectly well
        inside a Win98 frame; a free CARTO key would bring the colour back with
        no other change. See `pending-items.md`.
      */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution='Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a> &mdash; Esri, DeLorme, NAVTEQ'
        // Esri's grey canvases are cut to z16. `maxNativeZoom` tells Leaflet
        // to stop *requesting* there and upscale the z16 tile for z17-18
        // instead — without it, zooming past 16 asks for tiles that do not
        // exist and the map goes blank at exactly the moment somebody is
        // trying to look closely at a venue.
        maxNativeZoom={16}
        maxZoom={18}
        zIndex={1}
      />
      {/*
        THE LABELS. Esri's Canvas basemaps are shipped as TWO services and the
        map above is only the first of them:

          ..._Base       geometry — landmass, water, roads. JPEG. NO TEXT.
          ..._Reference  place names ONLY, on transparent PNG.

        Loading the base alone is why this map had no city names on it. Nothing
        was failing and nothing was rate-limited — a base tile simply has no
        text drawn on it, by design. The reference layer is the other half of
        the same free, keyless service.

        `zIndex` is set explicitly on both rather than left to insertion order:
        Leaflet puts every TileLayer in the same pane, and a labels layer that
        loses the stacking race is invisible in exactly the way that sends you
        looking at the tile provider again.
      */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={16}
        maxZoom={18}
        zIndex={2}
      />
      <KeepMapSized />
      <FlyToSelected lat={selectedLat} lng={selectedLng} />

      {shows.map((show) => (
        <Marker
          key={show.id}
          position={[show.mapCoords[1], show.mapCoords[0]]}
          icon={show.id === selectedId ? selectedPinIcon : pinIcon}
          eventHandlers={{
            // With a rail beside the map, a pin's job is to select — the venue
            // link lives on the selected card, one press away, where it is
            // labelled. Without one, the pin is the only control there is and
            // keeps opening Google Maps directly.
            click: () =>
              onSelect
                ? onSelect(show.id)
                : window.open(show.mapsUrl, "_blank", "noopener,noreferrer"),
          }}
        >
          <Tooltip permanent direction="top" className="show-pin-badge" offset={[0, -28]}>
            {show.city.en}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
