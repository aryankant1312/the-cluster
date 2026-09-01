"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import type { Show } from "@/content/types";

const INDIA_CENTER: [number, number] = [22.6, 79.0];
const INITIAL_ZOOM = 4.5;

function makePin(selected: boolean) {
  const size = selected ? 30 : 22;
  const ring = selected
    ? "box-shadow:0 0 0 3px rgba(255,255,255,0.85),0 0 16px 4px rgba(180,0,26,0.9);"
    : "box-shadow:0 2px 6px rgba(0,0,0,0.6);";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      <div style="position:absolute;inset:0;background:#e11d2a;border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);${ring}"></div>
      <div style="position:absolute;top:50%;left:50%;width:${selected ? 8 : 6}px;height:${selected ? 8 : 6}px;background:#fff;border-radius:50%;transform:translate(-50%,-50%);"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

function FlyTo({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 11, { duration: 1.1 });
  }, [coords, map]);
  return null;
}

export function DotmShowsMap({
  shows,
  selectedId,
  onSelect,
  onHover,
}: {
  shows: Show[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const selected = shows.find((s) => s.id === selectedId) ?? null;
  const flyCoords: [number, number] | null = selected
    ? [selected.mapCoords[1], selected.mapCoords[0]]
    : null;

  return (
    <MapContainer
      center={INDIA_CENTER}
      zoom={INITIAL_ZOOM}
      minZoom={4}
      maxZoom={18}
      scrollWheelZoom
      zoomControl={false}
      className="w-full h-full bg-[#0b0b0d]"
    >
      {/*
        ESRI, NOT CARTO — AND THE REASON IS NOT A BROKEN URL.
        `basemaps.cartocdn.com` still answers 200 with a valid PNG, so nothing
        here ever errored and nothing appeared in the console. What changed is
        the bitmap: CARTO now renders "API KEY REQUIRED / carto.com/basemaps/
        apikey" diagonally across every tile it serves unkeyed. The watermark
        is baked into the image, which is why no amount of reading network
        responses or console output would have found it.
        Esri's World Dark Gray Base is keyless, unwatermarked, and already the
        near-black canvas this persona wants. Attribution is required and is
        below. If the CARTO styling is ever wanted back, a free CARTO key
        restores it with no other change — see `pending-items.md`.
      */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
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
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={16}
        maxZoom={18}
        zIndex={2}
      />
      <FlyTo coords={flyCoords} />
      {shows.map((show) => (
        <Marker
          key={show.id}
          position={[show.mapCoords[1], show.mapCoords[0]]}
          icon={makePin(show.id === selectedId)}
          eventHandlers={{
            click: () => onSelect(show.id),
            mouseover: () => onHover(show.id),
            mouseout: () => onHover(null),
          }}
        />
      ))}
    </MapContainer>
  );
}
