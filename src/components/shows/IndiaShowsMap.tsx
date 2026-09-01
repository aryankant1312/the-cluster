"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
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

export function IndiaShowsMap({ shows }: { shows: Show[] }) {
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
      {shows.map((show) => (
        <Marker
          key={show.id}
          position={[show.mapCoords[1], show.mapCoords[0]]}
          icon={pinIcon}
          eventHandlers={{
            click: () => window.open(show.mapsUrl, "_blank", "noopener,noreferrer"),
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
