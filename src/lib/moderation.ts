/**
 * Light-touch guards for the fan wall.
 *
 * Posts publish immediately — the chosen model is auto-publish with a report
 * button and admin takedown — so these only stop the obvious junk. This is
 * deliberately not a content-policing system: it catches slurs and spam
 * volume, and everything else is handled by fans reporting and you removing.
 */

/**
 * Matched on word boundaries against a lowercased, punctuation-stripped copy
 * of the text, so "assess" and "Scunthorpe" are safe. Kept short on purpose:
 * a long list produces more false positives than it prevents abuse.
 */
const BLOCKED = [
  "fuck",
  "shit",
  "bitch",
  "bastard",
  "cunt",
  "slut",
  "whore",
  "faggot",
  "nigger",
  "retard",
  "rape",
  "chutiya",
  "madarchod",
  "behenchod",
  "bhosdike",
  "randi",
];

const URL_LIKE = /\bhttps?:\/\/|\bwww\./gi;

export function containsBlockedWord(text: string): boolean {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .some((word) => BLOCKED.includes(word));
}

/** Message bodies full of links are almost always spam rather than a fan note. */
export function looksLikeSpam(text: string): boolean {
  return (text.match(URL_LIKE)?.length ?? 0) >= 2;
}

/** How many posts one submitter may make, and over what window. */
export const RATE_LIMIT = {
  maxPosts: 3,
  windowMs: 10 * 60 * 1000,
} as const;

/** ISO timestamp marking the start of the current rate-limit window. */
export function rateLimitSince(): string {
  return new Date(Date.now() - RATE_LIMIT.windowMs).toISOString();
}
