import type { StaticImageData } from "next/image";
import trackIcon from "../../public/images/dev/music/track-icon.png";
// Two songs have no Spotify pressing, so `trackArtwork` can never resolve real
// album art for them and they fell back to the shared placeholder icon. Their
// sleeves are checked into the repo instead, imported statically so next/image
// gets the intrinsic dimensions and can emit a correctly sized srcset.
import letThemSayArt from "../../public/images/dev/music/let-them-say.png";
import goliBaariArt from "../../public/images/covers/goli-baari.jpg";
import { findCatalogueTrackById } from "./catalogue";

/**
 * The site's music catalogue.
 *
 * Titles match the Spotify release exactly — including its own inconsistent
 * capitalisation (KHUD DUKHI shouts, Lmnopqr does not), because that is what
 * a listener sees in their library and searches for.
 *
 * `spotifyId` points at the canonical pressing. Five songs were released
 * twice, once as a single and again on a compilation; the compilation
 * pressing wins, since that is the one reached from the album. Artwork and
 * durations resolve from it via `spotify-catalogue.json`, so nothing has to
 * be re-typed when a release is updated.
 *
 * Ids are permanent. They key `song-stories.ts`, the `.lrc` filenames and
 * saved audio paths — renaming one silently unlinks a song's lyrics.
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  /** Fallback art, used when the track has no Spotify pressing. */
  thumbnail: StaticImageData;
  /** Canonical Spotify track id, or null for anything unreleased there. */
  spotifyId: string | null;
  /** Local file under /public/audio, or null until a master is uploaded. */
  audioSrc: string | null;
  /** Plain-text lyrics, filled in later; null shows a placeholder. */
  lyrics: string | null;
}

export interface TrackFolder {
  id: string;
  title: string;
  trackIds: string[];
}

/**
 * Track ids whose master sits at `public/audio/<id>.mp3`.
 *
 * The delivered files were named for a human browsing a folder
 * ("6 - DOTM - PARANOID (prod. Vipreet).mp3"), which no URL should carry, so
 * each was copied to its permanent track id — see `scripts/sync-audio.mjs`,
 * which does that copy and matches the names against this file. Listing the
 * ids here rather than probing the filesystem keeps this module usable on the
 * client, where there is no filesystem to probe.
 *
 * Every song in the catalogue has its master now. Eleven of them did not
 * until recently: the files existed in the delivery folder but had never been
 * copied into `public/audio/`, so It's OK, 666 - The Beginning and half of
 * Finding peace played silence while their rows looked complete. The set
 * stays rather than being collapsed into "always true", because a song can
 * ship here before its master does, and the player disables its transport for
 * that record rather than pretending to play something.
 */
const WITH_AUDIO = new Set([
  "paranoid",
  "roll-no-666",
  "dnd-trip-mp3",
  "bhala-kyun-mp3",
  "touch-down-mp3",
  "gaddi-rok-mp3",
  "goli-baari-mp3",
  "let-them-say-mp3",
  "khud-dukhi-mp3",
  "25th-birthday-confession",
  "winnie-pooh",
  "dotm-mp3",
  "thak-thak-mp3",
  "lmnopqr-mp3",
  "count-down-mp3",
  "ikr",
  "sukoon",
  "ekaki",
  "no-blessings-track",
  "badside-track",
  "us-bhai-us-track",
  "selfish-log-track",
]);

/**
 * Sleeves for the songs Spotify cannot supply one for, keyed by track id.
 *
 * `trackArtwork` prefers the Spotify pressing wherever there is one, so this
 * only ever answers for a track with `spotifyId: null`. Anything absent here
 * keeps the shared placeholder icon.
 */
const ARTWORK: Record<string, StaticImageData> = {
  "let-them-say-mp3": letThemSayArt,
  "goli-baari-mp3": goliBaariArt,
};

function track(id: string, title: string, spotifyId: string | null = null): Track {
  return {
    id,
    title,
    artist: "DOTM",
    thumbnail: ARTWORK[id] ?? trackIcon,
    spotifyId,
    audioSrc: WITH_AUDIO.has(id) ? `/audio/${id}.mp3` : null,
    lyrics: null,
  };
}

/** Standalone singles, newest first. */
const TOP_LEVEL_TRACKS: Track[] = [
  track("paranoid", "Paranoid", "2nxoJReIpzgfk0ie11qGrH"),
  track("roll-no-666", "Roll No. 666", "69MnGhOIrinbUgsmAPnk3b"),
  track("dnd-trip-mp3", "DND Trip", "0i2csFCVtmh5QjootTbNKl"),
  track("bhala-kyun-mp3", "Bhala Kyun", "0PQCaJpJm0CLEkUW2V0uf2"),
  track("touch-down-mp3", "Touch Down", "5HJyjVyEv9q0NKQLUnOKmX"),
  track("gaddi-rok-mp3", "Gaddi Rok", "1OGy5wZGfhcc69PTD0v4QP"),
  // Not on Spotify — unreleased, or distributed elsewhere.
  track("goli-baari-mp3", "Goli Baari"),
  track("let-them-say-mp3", "Let Them Say"),
];

const THERAPY_SESSION_TRACKS: Track[] = [
  track("khud-dukhi-mp3", "KHUD DUKHI", "5QEw6o6RuhjY9ZRntOgiUs"),
  track("25th-birthday-confession", "25TH BDAY (confession)", "7cZw6MA964yF8zKWaPlVjV"),
  track("winnie-pooh", "WINNIE POOH", "3g05M1innp0qLh7PXipvuR"),
];

/** Four-track release that previously had no folder of its own. */
const BEGINNING_TRACKS: Track[] = [
  track("dotm-mp3", "D.O.T.M", "7Bc35m7l1FItYUMdMlg6Xm"),
  track("thak-thak-mp3", "Thak Thak", "2PWEcJFLFTi2IxHGYVJgvs"),
  track("lmnopqr-mp3", "Lmnopqr", "2Domib1xdgWCmAT6BXY3Rh"),
  track("count-down-mp3", "Count Down", "2IFIjwk1HYQ6xNP62Bugq5"),
];

const ITS_OK_TRACKS: Track[] = [
  track("ikr", "Ikr", "0HxWmfOtFlWIr4GQC1ovqV"),
  track("sukoon", "Sukoon", "4uYSCI9lrTX394J8GDOVUm"),
  track("ekaki", "Ekaki", "5EfTDrrETyZNIVCgaGTzdz"),
];

/**
 * A curated grouping rather than a Spotify release — each of these shipped
 * as its own single. Kept because it is a deliberate editorial choice.
 */
const FINDING_PEACE_TRACKS: Track[] = [
  track("no-blessings-track", "No Blessings", "7Du1SRFx1QNgzhgns6mSnr"),
  track("badside-track", "Badside", "7tiLshI8wxvvxjqVl3GghI"),
  track("us-bhai-us-track", "Us Bhai Us", "1AUiKfoOqxf2mP5qBMlupE"),
  track("selfish-log-track", "Selfish Log", "1yQpwl7t8EaIDcCwFaJ75N"),
];

export const folders: TrackFolder[] = [
  {
    id: "folder-therapy-session",
    title: "Therapy Session, Pt. 1",
    trackIds: THERAPY_SESSION_TRACKS.map((t) => t.id),
  },
  {
    id: "folder-666-the-beginning",
    title: "666 - The Beginning",
    trackIds: BEGINNING_TRACKS.map((t) => t.id),
  },
  {
    id: "folder-its-ok",
    title: "It's OK",
    trackIds: ITS_OK_TRACKS.map((t) => t.id),
  },
  {
    id: "folder-finding-peace",
    title: "Finding peace",
    trackIds: FINDING_PEACE_TRACKS.map((t) => t.id),
  },
];

/** Flat, index-addressable playlist - Previous/Next in the player walk this list in order. */
export const tracks: Track[] = [
  ...TOP_LEVEL_TRACKS,
  ...THERAPY_SESSION_TRACKS,
  ...BEGINNING_TRACKS,
  ...ITS_OK_TRACKS,
  ...FINDING_PEACE_TRACKS,
];

/** What the top level of the My Music window shows: singles, then folders. */
export const myMusicEntries: Array<
  { type: "track"; trackId: string } | { type: "folder"; folderId: string }
> = [
  ...TOP_LEVEL_TRACKS.map((t) => ({ type: "track" as const, trackId: t.id })),
  ...folders.map((f) => ({ type: "folder" as const, folderId: f.id })),
];

export function trackIndexById(id: string): number {
  return tracks.findIndex((t) => t.id === id);
}

export function trackById(id: string): Track | undefined {
  return tracks.find((t) => t.id === id);
}

/**
 * Real album art when the track has a Spotify pressing, otherwise the shared
 * placeholder icon. Both are valid `next/image` sources.
 */
export function trackArtwork(track: Track): string | StaticImageData {
  const meta = track.spotifyId ? findCatalogueTrackById(track.spotifyId) : undefined;
  return meta?.artworkUrl || track.thumbnail;
}

/** Duration in ms from the Spotify pressing, or null when unknown. */
export function trackDurationMs(track: Track): number | null {
  const meta = track.spotifyId ? findCatalogueTrackById(track.spotifyId) : undefined;
  return meta?.durationMs ?? null;
}
