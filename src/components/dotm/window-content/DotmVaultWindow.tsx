"use client";

import { useRef, useState } from "react";
import { ConstellationSky } from "@/components/shared/ConstellationSky";
import LetterGlitch from "@/components/shared/LetterGlitch";

const VAULT_CODE = "2048";
const GLITCH_COLORS = ["#ff0033", "#c90020", "#ffffff", "#8f0016", "#450008"];

export function DotmVaultWindow() {
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
    <div className="relative h-full min-h-0 w-full overflow-hidden select-none">
      <LetterGlitch
        glitchColors={GLITCH_COLORS}
        glitchSpeed={45}
        centerVignette={true}
        outerVignette={true}
        smooth={true}
        className="absolute inset-0"
      />

      <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col items-center gap-4 w-full max-w-[280px]"
        >
          <p className="font-chrome text-white/85 text-xs tracking-[0.4em] uppercase">
            The Vault
          </p>

          <div className="relative w-full">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              style={{
                color: "transparent",
                WebkitTextFillColor: "transparent",
                caretColor: "#ffffff",
                textShadow: "none",
                opacity: 1,
              }}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
                if (denied) setDenied(false);
              }}
              placeholder="4-digit code"
              aria-label="4-digit vault code"
              className={`dotm-dark-field h-12 w-full border bg-[#0b0b0b] px-3 text-center font-chrome text-lg tracking-[0.3em] outline-none ${
                denied ? "border-[#ff0033]" : "border-white/25 focus:border-[#ff0033]"
              }`}
            />
            {code.length > 0 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center pl-[0.3em] font-sans text-xl tracking-[0.3em] text-white"
              >
                {"•".repeat(code.length)}
              </span>
            )}
          </div>

          {denied && (
            <p className="font-chrome text-xs tracking-[0.35em] text-[#ff0033]">
              ACCESS DENIED
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 font-chrome text-sm tracking-[0.28em] text-white bg-[#ff0033] hover:bg-[#c90020] active:translate-y-px transition-colors"
          >
            ENTER THE VOID
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowForgot((v) => !v)}
              className="font-body text-xs text-white/55 underline hover:text-white/90"
            >
              Forgot?
            </button>

            {showForgot && (
              <div
                role="status"
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 whitespace-nowrap rounded-full bg-white text-black text-xs font-chrome px-4 py-2 shadow-lg"
              >
                DOTM ka TIME
                <span className="absolute left-1/2 -translate-x-1/2 top-full -mt-1.5 w-3 h-3 bg-white rotate-45" />
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default DotmVaultWindow;
