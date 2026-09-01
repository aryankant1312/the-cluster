import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * The boot sequence (/enter -> choose-face -> choose-face/[persona] ->
 * [persona]) is only part of the SPA's client-side history the first time
 * someone clicks through it. A hard refresh (or a bookmarked/typed URL) on
 * any deeper route otherwise renders that route directly and skips the intro
 * entirely. `sec-fetch-mode: navigate` is set by the browser only for real
 * document navigations (address bar, bookmark, refresh) - Next's own
 * client-side transitions (Link/router.push) fetch RSC payloads instead and
 * never set it - so this reliably restarts the intro on every fresh load
 * without disturbing in-app navigation.
 */
/**
 * Routes that must survive a typed URL or a refresh. `/admin` is a tool
 * rather than part of the experience — bouncing it through the intro would
 * make it unreachable, since the boot flow deliberately has no link to it.
 *
 * `/api` IS NOT A PAGE, AND EXEMPTING IT IS WHAT MAKES GOOGLE SIGN-IN WORK.
 * The matcher below only skips paths containing a dot, so every route handler
 * fell through to the redirect — and two of them are reached by a real
 * document navigation rather than by `fetch`. `SignInPanel` sends the browser
 * to `/api/auth/google` with `window.location.href` (it has to: that handler
 * 302s to accounts.google.com, and `router.push` cannot follow a cross-origin
 * redirect), and Google returns the visitor to `/api/auth/google/callback` as
 * a top-level cross-site navigation. Both carry `sec-fetch-mode: navigate`,
 * so both were answered `307 -> /enter`: the round trip died on the way out
 * and would have died again on the way back. Verified by hand against a
 * running dev server before this entry existed. Nothing else here needs the
 * exemption — every other route handler is reached by `fetch`, which does not
 * set that header.
 *
 * `/choose-face` is exempt for a second, narrower reason: it is where Google
 * puts the visitor down. The callback redirects to the path they left from,
 * and without this that redirect was itself bounced to `/enter` — so signing
 * in with Google replayed the entire intro before returning them to the door
 * they had just satisfied. Exempting it costs nothing, because the door is a
 * gate in its own right: reaching it directly still gets you no further than
 * reaching it the long way round.
 */
const EXEMPT = ["/enter", "/admin", "/api", "/choose-face"];

/**
 * The two desktops, the door each sends you back to, and the cookie each one
 * looks for.
 *
 * ONE COOKIE PER DESKTOP. There used to be a single unscoped session and this
 * table only needed a destination; now DEV and DOTM are separate sign-ins and
 * checking the wrong name would wave somebody into a desktop they have never
 * signed into. The names are restated here for the same reason `SESSION_COOKIE`
 * was — see the note below.
 */
const GATED: Record<string, { door: string; cookie: string }> = {
  "/dotm": { door: "/choose-face/dotm", cookie: "cluster_session_dotm" },
  "/dev": { door: "/choose-face/dev", cookie: "cluster_session_dev" },
};

/**
 * The cookie names are written out above rather than imported.
 *
 * `lib/auth.ts` is `server-only` and reaches for `node:crypto`; proxy runs on
 * the edge runtime, where neither is available. Two shared strings are not
 * worth an import that cannot exist — but they do have to stay in step with
 * `SESSION_COOKIES` there, and a mismatch fails open into an extra redirect
 * rather than into an open door: the layouts still refuse.
 */

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isBrowserNavigation = request.headers.get("sec-fetch-mode") === "navigate";
  const isExempt = EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  /**
   * THE ROOT IS ANSWERED HERE, ONCE, FOR EVERY KIND OF REQUEST.
   *
   * `/` was being redirected to `/enter` twice over, by two mechanisms that
   * disagreed about which requests they covered. A document navigation fell
   * through to the `/enter` rule at the bottom of this file; an RSC navigation
   * skipped that rule — it carries no `sec-fetch-mode: navigate` — and was
   * answered instead by `redirect("/enter")` inside `app/page.tsx`.
   *
   * Two redirects for one route is one too many, and the second was visibly
   * wrong: an RSC request for `/` came back `307` pointing at `/?_rsc`, the
   * same URL with its payload parameter emptied. A client router handed that
   * ends up with its history and its rendered tree describing different
   * routes — which is what leaves the landing page on screen wearing controls
   * that belong somewhere else, the reported "stale play button that neither
   * responds nor glows until you press reload".
   *
   * Handling it before either branch gives both kinds of request the same
   * single hop to the same place, and `app/page.tsx` is never reached. That
   * file keeps its `redirect` as a backstop for anything that bypasses proxy;
   * it is simply no longer the thing doing the work.
   */
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/enter", request.url));
  }

  /**
   * A GATED ROUTE IS ANSWERED HERE AND NOWHERE ELSE, and the `next()` on the
   * satisfied branch is the whole of the login-loop fix.
   *
   * This used to redirect only the visitor *without* the cookie and then fall
   * through — which meant the visitor *with* one dropped into the "restart the
   * intro on every fresh load" rule below, because `/dev` and `/dotm` are not
   * in `EXEMPT`, and was bounced to `/enter`. Every hard navigation to a
   * desktop was answered `307 -> /enter`: a refresh on `/dev`, a bookmark, and
   * the last hop of signing in. The visitor walked the whole boot sequence
   * again, was asked to sign in again at the end of it, and landed back at
   * `/enter` again. That is the loop, and it was never the desktops' own code.
   *
   * Both answers now leave this branch. A cookie means the desktop renders; no
   * cookie means the door. Neither can reach the `/enter` rule any more.
   *
   * Presence of the cookie, not its validity: verifying the signature needs
   * the secret and `node:crypto`, and Next's own guidance is explicit that
   * proxy is for cheap redirects rather than for authorization. The real check
   * runs in each persona's layout, which is a server component and can resolve
   * the session against the database — see the note there. A forged or expired
   * cookie gets past this line and is turned away there, at the door rather
   * than at `/enter`.
   *
   * ONE COOKIE PER FACE. Signing in at DEV does not open DOTM: each desktop
   * is its own entrance and its own session, and the first visit to the second
   * door asks once. After that neither asks again for thirty days.
   */
  const gate = GATED[pathname];
  if (isBrowserNavigation && gate) {
    return request.cookies.get(gate.cookie)
      ? NextResponse.next()
      : NextResponse.redirect(new URL(gate.door, request.url));
  }

  if (isBrowserNavigation && !isExempt) {
    return NextResponse.redirect(new URL("/enter", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|presskit/|.*\\..*).*)"],
};
