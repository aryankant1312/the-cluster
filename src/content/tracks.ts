import type { StaticImageData } from "next/image";
import bhalaKyun from "../../public/images/covers/bhala-kyun.png";
import dndTrip from "../../public/images/covers/dnd-trip-player.jpg";
import gaddiRok from "../../public/images/covers/gaddi-rok.jpg";
import ekaki from "../../public/images/covers/ekaki.png";
import noBlessings from "../../public/images/covers/no-blessings.jpg";
import goliBaari from "../../public/images/covers/goli-baari.jpg";

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: StaticImageData;
  /** Local file under /public/audio, or null until a master is uploaded. */
  audioSrc: string | null;
  /** Plain-text lyrics, filled in later; null shows a placeholder. */
  lyrics: string | null;
}

export const tracks: Track[] = [
  {
    id: "bhala-kyun",
    title: "Bhala Kyun",
    artist: "DOTM",
    thumbnail: bhalaKyun,
    audioSrc: null,
    lyrics: null,
  },
  {
    id: "dnd-trip",
    title: "DND Trip",
    artist: "DOTM",
    thumbnail: dndTrip,
    audioSrc: null,
    lyrics: null,
  },
  {
    id: "gaddi-rok",
    title: "Gaddi Rok",
    artist: "DOTM x Prahaar",
    thumbnail: gaddiRok,
    audioSrc: null,
    lyrics: null,
  },
  {
    id: "ekaki",
    title: "एकाकी",
    artist: "DOTM",
    thumbnail: ekaki,
    audioSrc: null,
    lyrics: null,
  },
  {
    id: "no-blessings",
    title: "No Blessings",
    artist: "DOTM",
    thumbnail: noBlessings,
    audioSrc: null,
    lyrics: null,
  },
  {
    id: "goli-baari",
    title: "Goli Baari",
    artist: "DOTM",
    thumbnail: goliBaari,
    audioSrc: null,
    lyrics: null,
  },
];
