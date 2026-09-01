export interface LocalizedString {
  en: string;
  hi: string;
}

export type Persona = "dev" | "dotm";

export interface SiteSettings {
  countdownTarget: string;
  featureFlags: {
    vaultUnlocked: boolean;
    t24hTriggerEnabled: boolean;
  };
}

export interface CopyPool {
  countdownLines: LocalizedString[];
  entryLine: LocalizedString;
  dotmEntryLine: LocalizedString;
  personaFlavor: {
    dev: LocalizedString[];
    dotm: LocalizedString[];
  };
}

export interface Show {
  id: string;
  city: LocalizedString;
  country: string;
  venue: string | null;
  date: string | null;
  isPast: boolean;
  /** [longitude, latitude] */
  mapCoords: [number, number];
  mapsUrl: string;
  instagramUrl: string | null;
  /**
   * Where "GET TICKETS" points, on an upcoming show.
   *
   * Null is a supported and meaningful state, not a gap: the button still
   * renders with the same label so the tile keeps its shape, and it renders
   * disabled. A live-looking ticket button that goes nowhere is worse than a
   * greyed one that says why, and a site announcing a date it cannot sell is
   * worse than both.
   *
   * Absent on past shows, where it would only be a dead link.
   */
  ticketsUrl?: string | null;
}

export interface VoteCity {
  id: string;
  name: string;
  votes: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: LocalizedString;
  note: LocalizedString | null;
  instagramHandle: string;
  fallbackImage: string;
}
