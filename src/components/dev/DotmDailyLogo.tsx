import Image from "next/image";

/**
 * White "DOTM DAILY" horned devil wordmark for the DEV boot screen (top-right,
 * replacing the old N404 mark). Real brand artwork recolored white-on-
 * transparent at build time → public/images/dev/dotm-daily-white.png.
 */
export function DotmDailyLogo({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/images/dev/dotm-daily-white.png"
      alt="DOTM DAILY"
      width={302}
      height={357}
      priority
      className={`w-full h-auto ${className}`}
    />
  );
}
