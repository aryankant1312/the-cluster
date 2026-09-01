"use client";

/**
 * ClusterWall — the shared Cluster Wall experience (identical for DEV & DOTM).
 * Phase 1: a black-and-white FaultyTerminal CRT loading screen; double-clicking
 * anywhere transitions into Phase 2: a GSAP masonry gallery of the art.
 * A transparent click-catcher above the canvas makes the double-click reliable
 * even inside a draggable window (it stops the drag from stealing the pointer).
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { FaultyTerminalBackground } from "./FaultyTerminalBackground";
import { MasonryGallery } from "./MasonryGallery";
import { clusterWallItems } from "@/content/cluster-wall";

export function ClusterWall({ skipIntro = false }: { skipIntro?: boolean }) {
  const [entered, setEntered] = useState(skipIntro);

  return (
    <div className="w-full h-full bg-black text-white">
      {!entered ? (
        <div key="loading" className="relative w-full h-full min-h-[420px] select-none">
          <FaultyTerminalBackground
            scale={1.6}
            gridMul={[2, 1]}
            digitSize={1.2}
            timeScale={0.4}
            scanlineIntensity={0.7}
            glitchAmount={1.2}
            flickerAmount={0.6}
            noiseAmp={1}
            chromaticAberration={0}
            dither={0.4}
            curvature={0.14}
            tint="#ffffff"
            mouseReact
            mouseStrength={0.35}
            pageLoadAnimation
            brightness={1}
            className="absolute inset-0"
          />
          {/* click-catcher: reliably receives the double-click and keeps the
              window drag from swallowing it */}
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={() => setEntered(true)}
          />
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none px-6 text-center">
            <p
              className="font-mono font-bold text-white text-3xl sm:text-5xl tracking-[0.4em]"
              style={{
                WebkitTextStroke: "2px #000",
                textShadow:
                  "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 20px rgba(255,255,255,0.6)",
              }}
            >
              CLUSTER
            </p>
          </div>
        </div>
      ) : (
        <motion.div
          key="wall"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="p-4 sm:p-6"
          style={{ background: "radial-gradient(circle at 50% 40%, #0d0d0d, #000)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-white text-sm tracking-[0.4em]">CLUSTER</p>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/30 bg-[#D4AF37]/10 rounded-full px-2 py-0.5">
              {clusterWallItems.length} PIECES
            </span>
          </div>
          <MasonryGallery
            items={clusterWallItems}
            animateFrom="bottom"
            blurToFocus
            stagger={0.07}
            scaleOnHover
            hoverScale={0.97}
            colorShiftOnHover
          />
        </motion.div>
      )}
    </div>
  );
}

export default ClusterWall;
