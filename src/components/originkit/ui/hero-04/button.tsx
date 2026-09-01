// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "ghost" | "glass";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const BASE_CLASS =
  "inline-flex min-h-[52px] touch-manipulation items-center justify-center font-tight text-[16px] font-medium tracking-[-0.48px] text-white transition-[opacity,transform] duration-200 ease [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90";

export const Button = ({
  variant = "ghost",
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) => {
  if (variant === "glass") {
    return (
      <div
        className={`group transition-all duration-200 ease rounded-[12px] bg-[rgba(18,18,18,0.5)] p-[6px] backdrop-blur-[2px] mix-blend-luminosity ${className}`}
      >
        <button
          type={type}
          className={`${BASE_CLASS} h-[40px] w-full rounded-[8px] border border-white/40 bg-[linear-gradient(180deg,rgba(30,30,30,0.9)_0%,rgba(12,12,12,0.95)_100%)] px-6 shadow-[inset_0_0_8px_rgba(248,248,248,0.25)] cursor-pointer hover:border-white/30 transition-all duration-200 ease`}
          {...props}
        >
          {children}
        </button>
      </div>
    );
  }

  return (
    <button
      type={type}
      className={`${BASE_CLASS} h-[52px] rounded-[12px] border border-white/10 bg-white/[0.02] px-6 cursor-pointer hover:border-white/30 transition-all duration-200 ease ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
