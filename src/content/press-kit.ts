/**
 * EPK content. Journalists, promoters and brand teams all pull from here, so
 * anything unverified is left empty rather than guessed, and any download
 * whose file is not actually in `public/` is flagged `available: false` so
 * the UI disables it instead of serving a 404.
 */

export interface PressFeature {
  outlet: string;
  headline: string;
  url: string;
  /** `YYYY-MM-DD`, or empty while unconfirmed. */
  date: string;
}

export interface PressDownload {
  id: string;
  label: string;
  description: string;
  href: string;
  filename: string;
  /** False until the file exists in public/ — the UI disables these. */
  available: boolean;
}

export interface PressPhoto {
  src: string;
  alt: string;
  credit: string;
}

export interface PressFact {
  label: string;
  value: string;
}

export const pressKit = {
  name: "DOTM",
  tagline: "Devil on the mic",

  bio: {
    short:
      "DOTM is an independent artist, composer and producer working across melodic, classical, phonk, trap and new-school hip-hop in Hindi and English.",
    long: [
      "DOTM is an independent artist, composer, lyricist and producer whose work moves between melodic writing, classical influence, phonk, trap and new-school hip-hop, in Hindi and English.",
      "The catalogue spans the Therapy Session, It's OK and Finding Peace bodies of work, alongside singles including Bhala Kyun, DND Trip and Gaddi Rok.",
      "Beyond releases, DOTM has worked with brands and platforms including Nothing's CMF line, MTV, Saregama, Spotify, Hero and TuneCore.",
    ],
  },

  /** Empty values are hidden by the UI rather than rendered blank. */
  facts: [
    { label: "Based in", value: "" },
    { label: "Languages", value: "Hindi, English" },
    { label: "Genres", value: "Melodic, Classical, Phonk, Trap, New-school" },
    { label: "Roles", value: "Composer / Lyricist / Rapper / Producer" },
    { label: "Years active", value: "3" },
    { label: "Booking", value: "dotmoriginal@gmail.com" },
  ] as PressFact[],

  achievements: [
    "MTV Hustle — Season 04",
    "Campaign face for Nothing / CMF",
    "Catalogue distributed via TuneCore",
  ],

  /** Populate as coverage lands. Empty renders an explicit empty state. */
  pressFeatures: [] as PressFeature[],

  photos: [
    { src: "/images/dotm/logo.jpg", alt: "DOTM portrait", credit: "" },
    { src: "/images/dev/login-user.jpg", alt: "DOTM portrait, alternate", credit: "" },
  ] as PressPhoto[],

  logos: [
    { src: "/images/dev/dotm-daily-white.png", alt: "DOTM wordmark, white" },
    { src: "/images/dotm/logo.jpg", alt: "DOTM logo mark" },
  ],

  downloads: [
    {
      id: "full",
      label: "Full press kit",
      description: "Bio, photos, logos and credits in one PDF",
      href: "/presskit/DOTM-Press-Kit.pdf",
      filename: "DOTM Press Kit.pdf",
      available: true,
    },
    {
      id: "photos",
      label: "Hi-res photos",
      description: "Print-resolution press shots",
      href: "/presskit/DOTM-Photos.zip",
      filename: "DOTM Photos.zip",
      available: false,
    },
    {
      id: "bio",
      label: "Artist bio",
      description: "Short and long-form copy, ready to paste",
      href: "/presskit/DOTM-Bio.pdf",
      filename: "DOTM Bio.pdf",
      available: false,
    },
    {
      id: "logos",
      label: "Logo pack",
      description: "Wordmark and logo mark, light and dark",
      href: "/presskit/DOTM-Logos.zip",
      filename: "DOTM Logos.zip",
      available: false,
    },
  ] as PressDownload[],
};
