/**
 * THE STORY WALL — the Finding Peace carousel, slide by slide.
 *
 * These are the sequential carousel films as delivered: a cover that counts
 * the record's pieces, then one jigsaw piece per track, each carrying the
 * theme word that piece stands for. The arrow printed on every slide is the
 * reason the wall draws arrows between them too — the sequence is part of the
 * artwork, not something the layout invented.
 *
 * Every title and theme word here is transcribed from the slide it belongs
 * to. Nothing is inferred from `tracks.ts`: the carousel is its own edit and
 * pairs songs with words that appear nowhere else, so guessing at the mapping
 * would be putting words in the artist's mouth.
 *
 * The delivered masters ran 51–96 MB apiece at 12–25 Mbps — broadcast bitrate
 * for a 1080-square social clip. They are re-encoded into
 * `public/videos/story/` at roughly 1.3 MB each, with a poster frame pulled
 * at 1.2s so the wall paints before a byte of video is fetched.
 */

export interface StorySlide {
  id: string;
  /** Position in the carousel, from 1. Drawn as the oversized numeral. */
  order: number;
  /** The slide's headline, exactly as printed on it. */
  title: string;
  /** The word at the foot of the slide. */
  theme: string;
  src: string;
  poster: string;
  /**
   * Which entrance this slide uses. Each is distinct, so the wall reveals as
   * a sequence of separate moments rather than one motion repeated five
   * times.
   */
  motion: "rise" | "swipe-left" | "wipe" | "swipe-right" | "focus";
}

/**
 * The record this carousel belongs to.
 *
 * The title, and only the title. A kicker and a blurb above and below it were
 * two pieces of explanation stacked on a wall whose whole argument is the
 * artwork — and both said the same thing the slides say better by being there.
 */
export const STORY_RELEASE = {
  title: "Finding Peace",
} as const;

export const storySlides: StorySlide[] = [
  {
    id: "cover",
    order: 1,
    title: "Four Pieces Till Now",
    theme: "Finding Peace",
    src: "/videos/story/1.mp4",
    poster: "/videos/story/1.jpg",
    motion: "rise",
  },
  {
    id: "let-them-say",
    order: 2,
    title: "Let Them Say",
    theme: "ST9IC",
    src: "/videos/story/2.mp4",
    poster: "/videos/story/2.jpg",
    motion: "swipe-left",
  },
  {
    id: "no-blessings",
    order: 3,
    title: "No Blessings",
    theme: "DISLOYALTY",
    src: "/videos/story/3.mp4",
    poster: "/videos/story/3.jpg",
    motion: "wipe",
  },
  {
    id: "badside",
    order: 4,
    title: "Badside",
    theme: "FRIEND8HIP",
    src: "/videos/story/4.mp4",
    poster: "/videos/story/4.jpg",
    motion: "swipe-right",
  },
  {
    id: "us-bhai-us",
    order: 5,
    title: "Us Bhai Us",
    theme: "ADULTHOOD",
    src: "/videos/story/5.mp4",
    poster: "/videos/story/5.jpg",
    motion: "focus",
  },
];
