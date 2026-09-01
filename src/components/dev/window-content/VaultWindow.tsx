"use client";

import { useRef, useState } from "react";
import { ConstellationSky } from "@/components/shared/ConstellationSky";
import { FaultyTerminalBackground } from "@/components/shared/FaultyTerminalBackground";

const VAULT_CODE = "2048";

// Module-level: the background reads these as scalars, and hoisting them
// keeps every render handing over the same identities.
const GRID_MUL: [number, number] = [2, 1];

export function VaultWindow() {
  const [code, setCode] = useState("");
  const [denied, setDenied] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (code.trim() === VAULT_CODE) {
      setDenied(false);
      setUnlocked(true);
      return;
    }
    setDenied(true);
    setCode("");
    inputRef.current?.focus();
  };

  // Past the code is the sky. The Vault opens filled, so the table gets the
  // whole window and the constellation you draw is the only thing in it.
  if (unlocked) {
    return <ConstellationSky />;
  }

  return (
    <div className="relative w-full h-full min-h-[420px] select-none">
      <FaultyTerminalBackground
        scale={1.6}
        gridMul={GRID_MUL}
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
        pageLoadAnimation
        brightness={1}
        className="absolute inset-0"
      />

      <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col items-center gap-4 w-full max-w-[340px]"
        >
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (denied) setDenied(false);
            }}
            placeholder="4-digit code"
            aria-label="4-digit vault code"
            className={`win98-border w-full bg-white px-4 py-3 text-center font-chrome text-2xl tracking-[0.3em] text-black outline-none placeholder:text-black/40 ${
              denied ? "ring-2 ring-danger" : ""
            }`}
          />

          {denied && (
            <p className="font-chrome text-sm tracking-widest text-danger">ACCESS DENIED</p>
          )}

          <button
            type="submit"
            className="win98-border win98-press w-full bg-[#c0c0c0] py-3 font-chrome text-lg tracking-[0.2em] text-black active:translate-y-px"
          >
            enter the VOID
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowForgot((v) => !v)}
              aria-expanded={showForgot}
              className="font-body text-sm text-white/70 underline hover:text-white"
            >
              Forgot?
            </button>

            {/* Hint sits below the trigger, so the arrow points back up at it. */}
            {showForgot && (
              <div
                role="status"
                className="absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-black px-5 py-2.5 font-chrome text-sm text-white shadow-lg ring-1 ring-white/20"
              >
                DOTM ka TIME
                <span className="absolute left-1/2 bottom-full -mb-1.5 -translate-x-1/2 w-3 h-3 rotate-45 bg-black" />
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default VaultWindow;
