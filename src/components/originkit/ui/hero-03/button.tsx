// Delivered by Originkit · stack: nextjs · styling: tailwind
"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "nav";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "relative h-[42px] overflow-clip rounded-lg border border-solid border-white/20 bg-[#1d1d1d] px-5 text-[14px] font-medium tracking-[-0.28px] text-white shadow-[0px_2px_6px_0px_rgba(0,0,0,0.22)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:shadow-[inset_0px_4px_4px_0px_rgba(255,255,255,0.25)] ipad:h-[55px] ipad:rounded-[11px] ipad:px-[27px] ipad:text-[18px] ipad:tracking-[-0.36px] desktop-sm:h-10 desktop-sm:rounded-lg desktop-sm:px-5 desktop-sm:text-[14px] desktop-sm:tracking-[-0.28px]",
  secondary:
    "h-[42px] rounded-lg border border-solid border-[#c8c8c8] bg-transparent px-4 py-3 text-[14px] font-medium tracking-[-0.28px] text-[#1d1d1d] transition-[border-color,opacity,transform] duration-200 ease ipad:h-[55px] ipad:rounded-[11px] ipad:px-[22px] ipad:py-0 ipad:text-[18px] ipad:tracking-[-0.36px] desktop-sm:h-10 desktop-sm:rounded-lg desktop-sm:px-4 desktop-sm:py-3 desktop-sm:text-[14px] desktop-sm:tracking-[-0.28px] [@media(hover:hover)_and_(pointer:fine)]:hover:border-[#1d1d1d] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-100",
  nav: "h-9 overflow-clip rounded-lg border border-solid border-black/20 bg-black px-5 text-[14px] font-medium tracking-[-0.28px] text-white shadow-[0px_2px_6px_0px_rgba(0,0,0,0.22)] transition-[background-color,opacity,transform] duration-200 ease [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#2a2a2a] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-100",
};

export const Button = ({
  variant = "primary",
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) => {
  return (
    <button
      type={type}
      className={`inline-flex min-h-9 touch-manipulation items-center justify-center font-tight transition-[opacity,transform] duration-200 ease [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1d] active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 ${VARIANT_CLASS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
