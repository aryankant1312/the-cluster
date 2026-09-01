"use client";

/**
 * "THE EYE IS SHUT — OPEN IT WHEN YOU GET THERE."
 *
 * DOTM's two doors blink across a navigation: the lids close on the page being
 * left and part on the page being arrived at. Those are two different React
 * trees, so the second one has to be told that it is opening rather than
 * simply appearing.
 *
 * A MODULE VARIABLE, NOT `sessionStorage`. Next's client-side navigation
 * replaces the tree without replacing the document, so the JavaScript heap —
 * and everything at module scope in it — survives the trip intact. That gives
 * exactly the lifetime wanted: the flag lives as long as one page load, so a
 * hard reload of `/dotm` lands on a desktop with no eyelids on it, which is
 * correct. Somebody who reloads did not walk through a door.
 *
 * It is also the only kind of flag that can be read *during render*. A value
 * fetched in an effect arrives one frame late, and one frame late here means a
 * frame of the desktop visible before the lids cover it — the exact flash the
 * blink exists to prevent.
 *
 * PEEK AND DISARM ARE SEPARATE ON PURPOSE. A single read-and-clear call would
 * be wrong in a `useState` initializer: StrictMode invokes those twice in
 * development, so the second call would find the flag already spent and the
 * blink would never play. Peeking is idempotent and safe to render with;
 * clearing happens once, from an effect.
 *
 * This used to have a sibling, `lib/auth-gate.ts`, holding the door's other
 * one-shot: a per-document flag saying whether anybody had signed in during
 * this page load. That flag sat beside the session and made a signed-in
 * visitor prove themselves again on every reload, so it is gone and the
 * session decides alone. This one stays — it carries a blink across a route
 * boundary, which is a piece of choreography rather than a gate.
 */

/** Reset by every full document load, which is the point. */
let armed = false;

/** The lids just closed here. Whatever renders next should open them. */
export function armBlink(): void {
  armed = true;
}

/** Is an opening blink owed? Safe to call during render, and repeatedly. */
export function isBlinkArmed(): boolean {
  return armed;
}

/** Spend it. Called once, from an effect, by whoever played the blink. */
export function disarmBlink(): void {
  armed = false;
}
