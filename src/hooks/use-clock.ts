"use client";

import { useEffect, useState } from "react";

export function useClock(): string {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const format = () =>
      new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
      });
    setTime(format());
    const interval = setInterval(() => setTime(format()), 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  return time ?? "";
}
