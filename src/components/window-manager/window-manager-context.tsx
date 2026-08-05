"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface WindowManagerState {
  order: string[];
  minimized: Set<string>;
}

interface WindowManagerValue {
  openIds: string[];
  isOpen: (id: string) => boolean;
  isMinimized: (id: string) => boolean;
  isFront: (id: string) => boolean;
  zIndexOf: (id: string) => number;
  openWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  focusWindow: (id: string) => void;
}

const WindowManagerContext = createContext<WindowManagerValue | null>(null);

export function WindowManagerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WindowManagerState>({
    order: [],
    minimized: new Set(),
  });

  const openWindow = useCallback((id: string) => {
    setState((prev) => {
      if (prev.order.includes(id)) {
        const minimized = new Set(prev.minimized);
        minimized.delete(id);
        return {
          order: [...prev.order.filter((w) => w !== id), id],
          minimized,
        };
      }
      return { order: [...prev.order, id], minimized: prev.minimized };
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setState((prev) => ({
      order: prev.order.filter((w) => w !== id),
      minimized: prev.minimized,
    }));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setState((prev) => ({
      order: prev.order,
      minimized: new Set(prev.minimized).add(id),
    }));
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setState((prev) => {
      const minimized = new Set(prev.minimized);
      minimized.delete(id);
      return { order: [...prev.order.filter((w) => w !== id), id], minimized };
    });
  }, []);

  const focusWindow = useCallback((id: string) => {
    setState((prev) => ({
      order: prev.order.includes(id)
        ? [...prev.order.filter((w) => w !== id), id]
        : [...prev.order, id],
      minimized: prev.minimized,
    }));
  }, []);

  const value: WindowManagerValue = {
    openIds: state.order,
    isOpen: (id) => state.order.includes(id),
    isMinimized: (id) => state.minimized.has(id),
    isFront: (id) => state.order[state.order.length - 1] === id,
    zIndexOf: (id) => 100 + state.order.indexOf(id),
    openWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    focusWindow,
  };

  return (
    <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>
  );
}

export function useWindowManager() {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) throw new Error("useWindowManager must be used within WindowManagerProvider");
  return ctx;
}
