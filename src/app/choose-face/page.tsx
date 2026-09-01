"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { usePersona } from "@/components/providers/PersonaProvider";
import {
  useSilhouetteHitTest,
  type SilhouetteLayer,
} from "@/hooks/use-silhouette-hit-test";
import { Blink, DOTM_CLOSE_MS } from "@/components/shared/Blink";
import { armBlink } from "@/lib/blink-gate";

type Face = "dev" | "dotm";

const DOTM_SILHOUETTE = "/images/silhouette-dotm-crisp.png";
const DEV_SILHOUETTE = "/images/silhouette-dev-crisp.png";

// Module-level so the hook's one-shot decode effect never sees a new identity.
const SILHOUETTES: SilhouetteLayer<Face>[] = [
  { id: "dotm", src: DOTM_SILHOUETTE },
  { id: "dev", src: DEV_SILHOUETTE },
];

/**
 * How fast the glow arrives and how fast it leaves.
 *
 * This was a single 0.35s both ways, and that number was most of what read as
 * "lag" — a third of a second is long enough that the highlight looks like it
 * is deciding rather than responding. 120ms is under the ~150ms threshold at
 * which a response still feels attached to the movement that caused it, and it
 * is still a fade rather than a flash.
 *
 * Out is slower than in on purpose. An instant disappearance makes a cursor
 * skimming past the edge of a silhouette strobe; letting it decay covers the
 * gap and reads as the glow fading rather than being switched off.
 */
const GLOW_IN_S = 0.12;
const GLOW_OUT_S = 0.2;

export default function ChooseFacePage() {
  const router = useRouter();
  const { choosePersona } = usePersona();
  const t = useTranslations("chooseFace");
  const stageRef = useRef<HTMLElement>(null);

  // Hover follows the alpha channel of the silhouette PNGs, so the glow only
  // fires inside the character outline — anywhere else on the sofa, the wall
  // or the floor is dead space.
  const { hovered, hitTestAt } = useSilhouetteHitTest(stageRef, SILHOUETTES);

  /**
   * Choosing DOTM shuts the eye before it moves.
   *
   * The lids close over the sofa, the navigation happens behind them, and the
   * door page parts them again on the other side — so the two screens are one
   * continuous look rather than a cut. `armBlink` is what tells the arriving
   * page it owes an opening; see `lib/blink-gate.ts`.
   *
   * DEV IS DELIBERATELY NOT BLINKED. Its boot sequence opens on a BIOS post
   * and does its own blink later, between the coin and the login. Closing an
   * eye here as well would put two blinks either side of a screen that is
   * pretending to be a machine starting up, which is one too many.
   *
   * The route is prefetched at the moment of the click rather than on hover:
   * the lids take 540ms to shut, which is ample for the payload to land, and
   * prefetching on hover would fetch both personas for every visitor who
   * swept the cursor across the sofa.
   */
  const [closing, setClosing] = useState<Face | null>(null);

  const commit = useCallback(
    (persona: Face) => {
      if (closing) return;
      choosePersona(persona);

      if (persona !== "dotm") {
        router.push(`/choose-face/${persona}`);
        return;
      }

      router.prefetch("/choose-face/dotm");
      setClosing(persona);
    },
    [closing, choosePersona, router],
  );

  const enterDotm = useCallback(() => {
    armBlink();
    router.push("/choose-face/dotm");
  }, [router]);

  return (
    <main
      ref={stageRef}
      className="relative min-h-screen overflow-hidden bg-black select-none"
      style={{ cursor: hovered ? "pointer" : "default" }}
      onClick={(e) => {
        // Hit-test the click itself rather than trusting the last hover, so a
        // touch tap (which never fires mousemove) still works.
        const hit = hitTestAt(e.clientX, e.clientY);
        if (hit) commit(hit);
      }}
    >
      {/* The sofa, alive.
          This was the still `sofa-bw.jpg`; it is the same shot, moving — the
          candle burns and the two of them breathe. The silhouette masks were
          traced from that still and both are 16:9, so the same `object-cover
          object-center` transform maps them onto the frame pixel for pixel and
          the hit-test needs no adjustment at all.

          `poster` is frame 0 of this very clip, so the first paint is the frame
          the loop starts on and a refused autoplay looks like a paused video
          rather than a black screen. `muted` is not a preference: an unmuted
          autoplay is refused by every browser. `playsInline` keeps iOS from
          taking the clip fullscreen and throwing its own controls over the
          choice. */}
      <video
        src="/videos/choose-face.mp4"
        poster="/images/choose-face-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        // Inert to the pointer so every mousemove and click reaches the stage
        // above it, which is where the alpha hit-test lives.
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* Constant subtle scrim — dims whole bg evenly so hovering silhouette glows pop */}
      <div className="absolute inset-0 pointer-events-none bg-black/35" />

      {/* DOTM Hover Glow (Red): Soft ambient backlight glow + ultra-sharp character cutout */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered === "dotm" ? 1 : 0 }}
        transition={{
          duration: hovered === "dotm" ? GLOW_IN_S : GLOW_OUT_S,
          ease: "easeOut",
        }}
        /* Promoted to its own compositor layer.

           Each of these carries two `drop-shadow()` filters over a
           full-viewport image, and an un-promoted layer re-rasterizes that
           blurred bitmap on the first frame of every opacity change — a
           fullscreen blur computed at exactly the moment the visitor is
           waiting to see something. `will-change: opacity` rasterizes it once,
           at mount, and leaves the fade to the compositor. */
        style={{ willChange: "opacity" }}
      >
        {/* Soft ambient back glow behind DOTM */}
        <div
          className="absolute inset-0 mix-blend-screen"
          style={{
            // Forces a backing surface, so the blur below is computed once
            // rather than per composited frame.
            transform: "translateZ(0)",
            filter:
              "drop-shadow(0 0 25px rgba(220, 38, 38, 0.75)) drop-shadow(0 0 55px rgba(185, 28, 28, 0.45))",
          }}
        >
          <Image
            src={DOTM_SILHOUETTE}
            alt=""
            fill
            className="object-cover object-center"
            sizes="100vw"
            loading="eager"
          />
        </div>
        {/* Crisp, ultra-sharp character details layer on top */}
        <Image
          src={DOTM_SILHOUETTE}
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          loading="eager"
        />
      </motion.div>

      {/* DEV Hover Glow (Electric Blue): Soft ambient backlight glow + ultra-sharp character cutout */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered === "dev" ? 1 : 0 }}
        transition={{
          duration: hovered === "dev" ? GLOW_IN_S : GLOW_OUT_S,
          ease: "easeOut",
        }}
        /* Promoted to its own compositor layer.

           Each of these carries two `drop-shadow()` filters over a
           full-viewport image, and an un-promoted layer re-rasterizes that
           blurred bitmap on the first frame of every opacity change — a
           fullscreen blur computed at exactly the moment the visitor is
           waiting to see something. `will-change: opacity` rasterizes it once,
           at mount, and leaves the fade to the compositor. */
        style={{ willChange: "opacity" }}
      >
        {/* Soft ambient back glow behind DEV */}
        <div
          className="absolute inset-0 mix-blend-screen"
          style={{
            // Forces a backing surface, so the blur below is computed once
            // rather than per composited frame.
            transform: "translateZ(0)",
            filter:
              "drop-shadow(0 0 25px rgba(0, 210, 255, 0.85)) drop-shadow(0 0 55px rgba(14, 165, 233, 0.5))",
          }}
        >
          <Image
            src={DEV_SILHOUETTE}
            alt=""
            fill
            className="object-cover object-center"
            sizes="100vw"
            loading="eager"
          />
        </div>
        {/* Crisp, ultra-sharp character details layer on top */}
        <Image
          src={DEV_SILHOUETTE}
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          loading="eager"
        />
      </motion.div>

      {/* Bottom labels — fade in on hover with Tanker typography & soft glow */}
      <div className="absolute inset-x-0 bottom-0 flex pointer-events-none z-30">
        <div className="flex-1 flex justify-center pb-12 sm:pb-16 px-4">
          <AnimatePresence>
            {hovered === "dotm" && (
              <motion.span
                key="dotm-label"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="font-tanker text-red-500 text-2xl sm:text-4xl tracking-widest text-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]"
              >
                {t("dotmLabel")}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex-1 flex justify-center pb-12 sm:pb-16 px-4">
          <AnimatePresence>
            {hovered === "dev" && (
              <motion.span
                key="dev-label"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="font-tanker text-cyan-400 text-2xl sm:text-4xl tracking-widest text-center drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]"
              >
                {t("devLabel")}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* The eye shutting on the way to the DOTM door. It reports in when the
          lids finish their travel, and that is where the navigation happens. */}
      {closing === "dotm" && (
        <Blink mode="close" durationMs={DOTM_CLOSE_MS} onDone={enterDotm} />
      )}

      {/* Pointer users pick a face by clicking the character itself. Keyboard
          and screen-reader users get these instead — off-screen until focused,
          then visible so a sighted keyboard user can see where they are. */}
      <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 gap-4">
        {SILHOUETTES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => commit(s.id)}
            className="sr-only focus:not-sr-only focus:relative focus:rounded-full focus:bg-black/80 focus:px-5 focus:py-2 focus:font-tanker focus:tracking-widest focus:text-[#F5F2E3] focus:outline-none focus:ring-2 focus:ring-white"
          >
            {t(s.id === "dotm" ? "dotmLabel" : "devLabel")}
          </button>
        ))}
      </div>
    </main>
  );
}
