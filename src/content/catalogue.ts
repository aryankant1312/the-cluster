import catalogue from "./spotify-catalogue.json";

/**
 * The imported Spotify catalogue.
 *
 * This sits alongside `tracks.ts` rather than replacing it: `tracks.ts` is
 * the hand-curated structure of the site (which folders exist, what order
 * things appear in), while this is the factual metadata — real titles,
 * durations, artwork, ISRCs — pulled from Spotify by
 * `npm run import:catalogue`.
 *
 * Ships empty. Everything degrades to null/empty until that runs, so nothing
 * breaks before the credentials arrive.
 */

export interface CatalogueTrack {
  spotifyId: string;
  title: string;
  durationMs: number;
  trackNumber: number;
  discNumber: number;
  explicit: boolean;
  albumId: string;
  albumName: string;
  /** `YYYY-MM-DD`, or `YYYY` for older releases with imprecise dates. */
  releaseDate: string;
  artworkUrl: string;
  isrc: string;
  /** Withdrawn for newer Spotify apps; null is the expected value. */
  previewUrl: string | null;
}

export interface CatalogueAlbum {
  id: string;
  name: string;
  albumType: string;
  releaseDate: string;
  totalTracks: number;
  artworkUrl: string;
  url: string;
}

export const catalogueArtist = catalogue.artist;
export const catalogueAlbums = catalogue.albums as CatalogueAlbum[];
export const catalogueTracks = catalogue.tracks as CatalogueTrack[];
export const catalogueFetchedAt = catalogue.fetchedAt;

export const isCatalogueEmpty = catalogueTracks.length === 0;

/** Strips punctuation, file extensions and casing so titles compare fairly. */
function normalise(title: string): string {
  return title
    .toLowerCase()
    .replace(/\.mp3$/i, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Links a hand-written `tracks.ts` entry to its Spotify record by title.
 * Exact normalised match first, then a containment check, because the local
 * titles carry things like ".mp3" that the real metadata never will.
 */
export function findCatalogueTrack(title: string): CatalogueTrack | undefined {
  const target = normalise(title);
  if (!target) return undefined;

  return (
    catalogueTracks.find((t) => normalise(t.title) === target) ??
    catalogueTracks.find((t) => {
      const candidate = normalise(t.title);
      return candidate.includes(target) || target.includes(candidate);
    })
  );
}

/** Direct lookup by Spotify id — the link `tracks.ts` uses. */
export function findCatalogueTrackById(spotifyId: string): CatalogueTrack | undefined {
  return catalogueTracks.find((t) => t.spotifyId === spotifyId);
}

/** `187000` → `"3:07"`. */
export function msToClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
