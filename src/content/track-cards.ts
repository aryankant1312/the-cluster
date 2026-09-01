/**
 * Track cards shown as landscape art frames on the DOTM desktop hallway. The
 * thumbnails already carry their own titles, so no text label is rendered.
 * Each card maps to a track that plays in the music player (mapping provided
 * later — add a `trackId` and wire it in DesktopHallway's onClick).
 */
export interface TrackCard {
  id: string;
  img: string;
}

export const trackCards: TrackCard[] = [
  { id: "bhala-kyun", img: "/images/track-cards/bhala-kyun.jpg" },
  { id: "goli-baari", img: "/images/track-cards/goli-baari.jpg" },
  { id: "let-them-say", img: "/images/track-cards/let-them-say.jpg" },
  { id: "dnd-trip", img: "/images/track-cards/dnd-trip.jpg" },
  { id: "us-bhai-us", img: "/images/track-cards/us-bhai-us.jpg" },
  { id: "badside", img: "/images/track-cards/badside.jpg" },
  { id: "gaddi-rok", img: "/images/track-cards/gaddi-rok.jpg" },
  { id: "finding-peace", img: "/images/track-cards/finding-peace.jpg" },
  { id: "selfish-log", img: "/images/track-cards/selfish-log.jpg" },
  { id: "lts", img: "/images/track-cards/lts.jpg" },
];
