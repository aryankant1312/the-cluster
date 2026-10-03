"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { DotmLoader } from "@/components/shared/DotmLoader";

type AcquireLoadGate = () => () => void;

const WindowLoadGateContext = createContext<AcquireLoadGate | null>(null);

/**
 * Own one loader for the lifetime of a window.
 *
 * Lazy-code fallbacks and data-heavy children acquire readiness gates from
 * this boundary instead of rendering their own loader videos. As one gate
 * hands off to the next, the same video element remains mounted and its play
 * head keeps moving—there is no frame-zero restart between code and data.
 */
export function WindowLoadBoundary({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const [registry] = useState(() => ({ gates: new Set<symbol>() }));
  // DotmLoader owns the initial one-second minimum itself. Descendant gates
  // only need to extend that interval when code or data is genuinely pending.
  const [pending, setPending] = useState(false);

  const acquire = useCallback<AcquireLoadGate>(() => {
    const token = Symbol("window-load-gate");
    registry.gates.add(token);
    setPending(true);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      registry.gates.delete(token);
      setPending(registry.gates.size > 0);
    };
  }, [registry]);

  return (
    <WindowLoadGateContext.Provider value={acquire}>
      {children}
      <DotmLoader show={pending} label={label} />
    </WindowLoadGateContext.Provider>
  );
}

/** Keep the owning window's single loader active while `pending` is true. */
export function useWindowLoadGate(pending: boolean) {
  const acquire = useContext(WindowLoadGateContext);

  useLayoutEffect(() => {
    if (!pending || !acquire) return;
    return acquire();
  }, [acquire, pending]);
}
