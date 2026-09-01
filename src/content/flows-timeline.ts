/**
 * THE FOUR FLOWS — the second carousel, slide by slide.
 *
 * A separate post from the Finding Peace sequence in `story-carousel.ts`, and
 * a separate kind of thing: that one is five films about a record, this one is
 * a cover plus four verses, each printed over the track it belongs to.
 *
 * The artwork threads a dashed line through all five slides — it leaves the
 * right edge of one at the same height it enters the left edge of the next.
 * The timeline that draws these is built around that line rather than around a
 * generic rail, because the sequence is already in the artwork; the layout
 * only has to agree with it.
 *
 * Every verse here is transcribed from the slide it is printed on, in the
 * order it appears. Nothing is pulled from `tracks.ts` or from the `.lrc`
 * sheets: these are the bars the post chose to pull, which is not the same as
 * the song, and the line breaks are the designer's rather than the
 * transcriber's. The social call-to-action at the foot of the Ekaki slide is
 * left out — it asked a question of an Instagram audience and answering it
 * here is not possible.
 */

export interface FlowSlide {
  id: string;
  /** Position in the carousel, from 1. Drawn as the oversized numeral. */
  order: number;
  /** The track, exactly as the slide sets it. */
  title: string;
  /** Web-sized copy of the delivered 1080² master. */
  src: string;
  /** Bars printed above the cover art on the slide. */
  verseAbove: string[];
  /** Bars printed below it. One slide has none. */
  verseBelow: string[];
}

/**
 * The cover, which is a title card rather than a station on the line.
 *
 * The title is set as a lockup rather than as a line of text — one oversized
 * F serving both words, with "our" and "lows" stacked against it — so the
 * three words carry the card on their own. The paragraph that used to sit
 * under them explained the format of a carousel to someone already looking at
 * it unrolled, which is the one reader who does not need telling.
 */
export const FLOWS_COVER = {
  title: "The Four Flows",
  src: "/images/story/flows/1.webp",
} as const;

export const flowSlides: FlowSlide[] = [
  {
    id: "ekaki",
    order: 1,
    title: "Ekaki",
    src: "/images/story/flows/2.webp",
    verseAbove: [
      "No doubt mujhe pyaar deta crowd",
      "Mere maa baap proud par thha ek time",
      "Bolte te thhe kya krna hai bete bta mujhe",
      "Bhadak uthe kalam meri samay dedo zara mujhe",
      "Kala meri kalam mein kal ab main banu kalakaar",
      "Jaana faar mujhe tabhi khada aaj saamne mic ke",
      "Bina saanse thaamke bs ab kaam pe dhyaan hai",
    ],
    verseBelow: [],
  },
  {
    id: "hellfire",
    order: 2,
    title: "Hellfire",
    src: "/images/story/flows/3.webp",
    verseAbove: [
      "Theka liya win saari back to back",
      "Haan baate fenk ne se pehle karle facts toh check",
      "I am here to grab the bag hai mera koi nahi backup",
      "Bars anti vacs you better pack the bag",
      "Fir baitha cab mein sochiyo while I bang the gang",
    ],
    verseBelow: [
      "Main vijay prapt kar tu bank ko scam",
      "Akeli kalam meri weapon abhi ginega tu karam",
      "Mite kalank with the rubber toote palang",
      "When I break bad",
    ],
  },
  {
    id: "no-blessings",
    order: 3,
    title: "No Blessings",
    src: "/images/story/flows/4.webp",
    verseAbove: [
      "Kaisa gya din mera pooch na",
      "Ek aur gaana likha pyaar mein",
      "Dera majboori mein ye soochhna",
    ],
    verseBelow: [
      "Jhoot nhi bola tujhe kiya tera use na",
      "Chori pakdi gayee",
      "Ladka hai galat magar ladki sahi",
      "Kaayde ki baat pe main palta ni aur",
      "Faayde ki raat vo ucchhalti rahi",
    ],
  },
  {
    id: "count-down",
    order: 4,
    title: "Count Down",
    src: "/images/story/flows/5.webp",
    verseAbove: [
      "Sober baitha paper padhte pull up perfect timing",
      "Har vakt likhu bars law abiding aaye din taaki I win",
      "Kiya code crack how to fight with the python main leviathan",
      "Bulky rhyming hai bhaari fuck the license ab baari meri",
      "While I'm drivin'em crazy kaayde ki baate karein bhedi",
    ],
    verseBelow: [
      "Faayde ginaa re pehli nazar mein hi daayre mein aa bane disciple",
      "Kinaare kare rival hain saare mere rifle hai haath mein",
      "Aur eye full of rage homicidal ye task hai decide kar le dekh",
      "Battle fight kar na tek matthha fucking with the pace",
      "Gotta face invasive put that grace in the grave",
    ],
  },
];

/**
 * Alt text for a slide.
 *
 * The verse is *in* the image, so a screen reader told only "Ekaki slide" is
 * told nothing. The opening bars go into the description instead, which is
 * what a sighted visitor takes from the same glance.
 */
export function flowAlt(slide: FlowSlide): string {
  const opening = slide.verseAbove.slice(0, 2).join(" / ");
  return `${slide.title} — carousel slide. ${opening}…`;
}
