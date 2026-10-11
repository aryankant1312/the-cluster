/** Shared Shoot at Site content. Unknown facts stay empty until supplied. */
export interface ShootSiteMedia {
  id: string;
  kind: "image" | "video";
  src: string;
  alt: string;
  credit?: string;
}

export interface ShootSiteProperty {
  id: string;
  name: string;
  city: string | null;
  date: string | null;
  story: string | null;
  /** Website-exclusive media is public, not password protected. */
  media: ShootSiteMedia[];
  publicLinks: { label: string; url: string }[];
}

export interface ShootSiteTrack {
  id: string;
  title: string;
  /** Catalogue artwork, not a claim about the shoot location. */
  artwork: string;
  musicVideoUrl: string | null;
  propertyIds: string[];
}

export const shootSiteTracks: ShootSiteTrack[] = [
  { id: "bhala-kyun-mp3", title: "Bhala Kyun", artwork: "/images/track-cards/bhala-kyun.jpg", musicVideoUrl: null, propertyIds: [] },
  { id: "dnd-trip-mp3", title: "DND Trip", artwork: "/images/track-cards/dnd-trip.jpg", musicVideoUrl: null, propertyIds: [] },
  { id: "badside-track", title: "Badside", artwork: "/images/track-cards/badside.jpg", musicVideoUrl: null, propertyIds: [] },
  { id: "paranoid", title: "Paranoid", artwork: "", musicVideoUrl: null, propertyIds: [] },
  { id: "gaddi-rok-mp3", title: "Gaddi Rok", artwork: "/images/track-cards/gaddi-rok.jpg", musicVideoUrl: null, propertyIds: [] },
  { id: "selfish-log-track", title: "Selfish Log", artwork: "/images/track-cards/selfish-log.jpg", musicVideoUrl: null, propertyIds: [] },
  { id: "thak-thak-mp3", title: "Thak Thak", artwork: "", musicVideoUrl: null, propertyIds: [] },
];

/** Add real properties here, then reference their IDs on the relevant tracks. */
export const shootSiteProperties: ShootSiteProperty[] = [];
