import { NextResponse } from "next/server";
import {
  currentUser,
  demoModeEnabled,
  hasGoogleCredentials,
  hasMailer,
  parsePersona,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who is signed in, and what the sign-in panel should offer.
 *
 * The two questions are answered together on purpose. The panel has to know
 * whether its Google button starts a real round trip or the local stand-in,
 * and whether a one-time code will arrive by mail or only in the server log —
 * and it needs to know before it renders, or it spends a frame offering
 * something it cannot do.
 *
 * `google: false, demo: true` is the unconfigured state, and the panel says so
 * out loud rather than showing a button that quietly does something else.
 * Pasting real credentials into the environment flips it with no code change;
 * that is the whole design.
 *
 * Only the four fields the interface actually draws are returned. The row also
 * carries timestamps and a Google subject id, and none of that has any
 * business in a browser.
 */
export async function GET(request: Request) {
  /**
   * Scoped to the door that asked.
   *
   * The panel is mounted at one entrance and wants to know whether *that*
   * entrance is already satisfied. Answering with the other door's session
   * would light up a Continue button in front of a gate that is still shut.
   *
   * An unrecognised or missing persona answers `user: null` rather than 400:
   * this endpoint's other job is telling the panel what it may offer, and a
   * panel that cannot render because it forgot a query parameter is worse than
   * one that renders asking for a sign-in.
   */
  const persona = parsePersona(new URL(request.url).searchParams.get("persona"));
  const user = persona ? await currentUser(persona) : null;

  return NextResponse.json(
    {
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture,
          }
        : null,
      google: hasGoogleCredentials(),
      demo: demoModeEnabled(),
      mailer: hasMailer(),
    },
    // Never cached, anywhere. A signed-in identity cached by a CDN is an
    // identity served to the next person through it.
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
