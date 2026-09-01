import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { PersonaProvider } from "@/components/providers/PersonaProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { getLocaleFromCookie, getPersonaFromCookie } from "@/lib/session";
import "./globals.css";

/**
 * EVERY FACE IS SERVED FROM THIS REPO. Read this before reaching for
 * `next/font/google` again.
 *
 * These eight were Google fonts until the dev log was read. It carried 11,072
 * copies of "Failed to download <face> from Google Fonts. Using a fallback
 * font instead." — one per family per compile, on a machine that could not
 * reach fonts.googleapis.com. `next/font/google` fetches at build time and
 * falls back silently when it cannot, so a site whose entire premise is two
 * typographic costumes had been rendering in neither, and nothing on screen
 * said so.
 *
 * `next/font/local` reads off disk, so there is no network to fail: the build
 * behaves identically offline, on CI, and on a plane. The files are vendored
 * by `npm run fetch:fonts` (latin subset only) and committed.
 *
 * THE VARIABLE NAMES ARE UNCHANGED, deliberately. `globals.css` maps five of
 * them onto the three persona tokens and the DOTM door reads `--font-anton`
 * through `getComputedStyle` to hand canvas a real family name. Renaming
 * would have been a silent breakage in both.
 */
const vt323 = localFont({
  variable: "--font-vt323",
  src: [{ path: "../../assets/fonts/vt323-400.woff2", weight: "400", style: "normal" }],
  display: "swap",
});
const plexMono = localFont({
  variable: "--font-plex-mono",
  src: [
    { path: "../../assets/fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../../assets/fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "../../assets/fonts/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
});
const spaceMono = localFont({
  variable: "--font-space-mono",
  src: [
    { path: "../../assets/fonts/space-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../../assets/fonts/space-mono-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});
const inter = localFont({
  variable: "--font-inter",
  src: [
    { path: "../../assets/fonts/inter-400.woff2", weight: "400", style: "normal" },
    { path: "../../assets/fonts/inter-500.woff2", weight: "500", style: "normal" },
    { path: "../../assets/fonts/inter-600.woff2", weight: "600", style: "normal" },
    { path: "../../assets/fonts/inter-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});
// DOTM persona: devil-themed yet elegant — ornate engraved display for
// headlines, engraved caps for chrome, high-contrast serif for body.
const cinzelDecorative = localFont({
  variable: "--font-cinzel-decorative",
  src: [
    { path: "../../assets/fonts/cinzel-decorative-400.woff2", weight: "400", style: "normal" },
    { path: "../../assets/fonts/cinzel-decorative-700.woff2", weight: "700", style: "normal" },
    { path: "../../assets/fonts/cinzel-decorative-900.woff2", weight: "900", style: "normal" },
  ],
  display: "swap",
});
const cormorant = localFont({
  variable: "--font-cormorant",
  src: [
    { path: "../../assets/fonts/cormorant-garamond-400.woff2", weight: "400", style: "normal" },
    { path: "../../assets/fonts/cormorant-garamond-500.woff2", weight: "500", style: "normal" },
    { path: "../../assets/fonts/cormorant-garamond-600.woff2", weight: "600", style: "normal" },
    { path: "../../assets/fonts/cormorant-garamond-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
});
const cinzel = localFont({
  variable: "--font-cinzel",
  src: [
    { path: "../../assets/fonts/cinzel-400.woff2", weight: "400", style: "normal" },
    { path: "../../assets/fonts/cinzel-500.woff2", weight: "500", style: "normal" },
    { path: "../../assets/fonts/cinzel-600.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
});

/**
 * Anton, for the DOTM door.
 *
 * It was already the artist's typeface here — `scripts/build-video-media.mjs`
 * sets the headline in it with ffmpeg, from `assets/fonts/Anton-Regular.ttf`.
 * That TTF stays where it is: ffmpeg cannot read woff2, so the build-time and
 * browser copies of the same face are two files by necessity rather than by
 * oversight.
 */
const anton = localFont({
  variable: "--font-anton",
  src: [{ path: "../../assets/fonts/anton-400.woff2", weight: "400", style: "normal" }],
  display: "swap",
});

/**
 * THE TWO PERSONA DISPLAY FACES.
 *
 * Pixelpurl dresses DEV and King dresses DOTM, across the desktops and
 * every window on them — icon titles, window titles, filenames, buttons,
 * headings, taskbar, dock. `globals.css` wires them to the persona tokens
 * under `.persona-desktop`, which is what keeps them off the boot screens:
 * `/enter` and both `/choose-face` doors are outside that wrapper and keep
 * the faces they were built in.
 *
 * `adjustFontFallback: false` on both. Next otherwise synthesises a metric-
 * matched fallback from the file, and for a display face that means a
 * system-font stand-in stretched to impersonate it — which on Pixelpurl, a
 * bitmap face with unusual metrics, renders as smeared Arial for the first
 * frame rather than as nothing.
 */
/**
 * NO `size-adjust` ON PIXELPURL ANY MORE.
 *
 * It carried 112% for a while, to lift a bitmap face that draws small for its
 * em. Together with the per-component sizes that went up alongside it, the DEV
 * desktop ended up visibly overscaled, so both are reverted: the glyphs render
 * at their nominal size again and the components are back at the numbers they
 * held before.
 *
 * Kept as a note rather than deleted silently, because `size-adjust` is the
 * right tool if this is ever wanted again — it scales the outlines inside an
 * unchanged em box, so the whole type scale moves at once with nothing left to
 * keep in step, and unlike a CSS `font-size` multiple it cannot compound when
 * one styled element sits inside another.
 */
const pixelpurl = localFont({
  variable: "--font-pixelpurl",
  src: [{ path: "../../assets/fonts/pixelpurl.ttf", weight: "400", style: "normal" }],
  display: "swap",
  adjustFontFallback: false,
});

/**
 * King (`KIN668.TTF`), DOTM's display face.
 *
 * REPLACES LONEDRUIDA EVERYWHERE. That one carried a PERSONAL USE ONLY licence
 * and would have had to be bought out before this shipped; this is the face
 * chosen instead. `lonedruida.ttf` is left in `assets/fonts/` rather than
 * deleted — nothing references it now, and the file never reaches the browser.
 *
 * NO `size-adjust`. Lonedruida needed 118% because it drew small for its em.
 * King does not, and a correction copied across without measuring is how a
 * face ends up wrong in the other direction.
 */
const king = localFont({
  variable: "--font-king",
  // A REPAIRED WOFF2, NOT THE DELIVERED TTF — and the repair was one field.
  //
  // `KIN668.TTF` serves perfectly well (200, correct sfnt header) and Chrome
  // refuses it anyway. `document.fonts` reported the face as `error`, and the
  // console said why:
  //
  //     OTS parsing error: cmap: Languages should be 0 (1)
  //
  // Its `cmap` subtable declares `language = 1`. The spec reserves that field
  // for Macintosh-platform subtables and requires 0 everywhere else, so the
  // sanitiser throws the whole font out — and the DOTM desktop silently fell
  // back to Cormorant, which looks enough like a design decision that it could
  // have shipped unnoticed.
  //
  // The file in `assets/fonts/king.woff2` is the same typeface with that field
  // set to 0, rebuilt through fontTools. To redo it from a fresh delivery:
  //
  //     pyftsubset KIN668.TTF --unicodes='*' --no-hinting --recalc-bounds \
  //       --drop-tables+=kern,DSIG --output-file=king-sub.ttf
  //     # then, in fontTools: for t in f["cmap"].tables: t.language = 0
  //     # and save with f.flavor = "woff2"
  //
  // The pass also drops the legacy `kern` table and the hinting, and takes the
  // file from 126KB to 29KB. `king.ttf` is kept beside it as the source of
  // record.
  src: [{ path: "../../assets/fonts/king.woff2", weight: "400", style: "normal" }],
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "THE CLUSTER — devilonthemic",
  description: "DOTM. Two faces. One cluster.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [persona, locale, messages] = await Promise.all([
    getPersonaFromCookie(),
    getLocaleFromCookie(),
    getMessages(),
  ]);

  return (
    <html
      lang={locale}
      data-persona={persona ?? "dev"}
      className={`${vt323.variable} ${plexMono.variable} ${spaceMono.variable} ${inter.variable} ${cinzelDecorative.variable} ${cormorant.variable} ${cinzel.variable} ${anton.variable} ${pixelpurl.variable} ${king.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {/* Identity sits inside persona, and telemetry inside identity.
              That order is the dependency: the recorder tags a visit with the
              face being worn and with who is wearing it, and both have to be
              readable by the time it opens one. */}
          <PersonaProvider initialPersona={persona} initialLocale={locale}>
            <AuthProvider>
              <AnalyticsProvider>{children}</AnalyticsProvider>
            </AuthProvider>
          </PersonaProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
