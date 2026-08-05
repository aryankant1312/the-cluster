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
  mapCoords: [number, number];
}

export interface TeamMember {
  id: string;
  name: string;
  role: LocalizedString;
  note: LocalizedString | null;
  instagramHandle: string;
  fallbackImage: string;
}
