"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMotionValue, animate } from "framer-motion";

type Direction = "clockwise" | "anticlockwise";
type Stack = "firstOnTop" | "lastOnTop";
type Fit = "cover" | "contain";

interface Ring {
  radiusX: number;
  radiusY: number;
  tilt: boolean;
  repeat: number;
}

interface ImageItem {
  image?: { src?: string; srcSet?: string; alt?: string } | string;
  focusY?: number;
}

interface Transition {
  type?: string;
  stiffness?: number;
  damping?: number;
  mass?: number;
  ease?: string;
  duration?: number;
}

/** Where a card sits relative to the ring's centre, in px. */
export interface CardPosition {
  x: number;
  y: number;
  /** Unit vector from the centre out through the card. */
  ux: number;
  uy: number;
}

/**
 * Imperative controls, for a caller that needs to drive the ring rather than
 * only watch it.
 */
export interface RingHandle {
  /**
   * Spin like a wheel of fortune and settle with `index` under a marker at
   * twelve o'clock.
   *
   * The landing card is chosen first and the final angle derived from it,
   * rather than reading a winner off wherever a physics simulation happened
   * to stop. Left to chance the ring settles with a card straddling the
   * marker often enough to look broken, and "which one did it pick?" is
   * exactly the question this must never raise.
   */
  spinTo: (index: number, options?: { turns?: number; duration?: number }) => void;
  /** How many distinct cards there are, for picking a random landing index. */
  count: () => number;
  isSpinning: () => boolean;
}

interface CircleImageProps {
  images?: ImageItem[];
  ring?: Ring;
  fit?: Fit;
  cardWidth?: number;
  cardHeight?: number;
  rounded?: number;
  transition?: Transition;
  direction?: Direction;
  stack?: Stack;
  drag?: boolean;
  style?: React.CSSProperties;
  onCardClick?: (index: number, image: ImageItem) => void;
  /**
   * Fires with the hovered card, or `null` on leave. `position` is where that
   * card sits at the moment of hover — the ring has already halted by then,
   * so the value stays true while the pointer rests there, which is what
   * lets a caller park a label just outside that card.
   */
  onCardHover?: (index: number | null, position: CardPosition | null) => void;
  /** Pixels a hovered card lifts outward along its own radius. 0 disables. */
  popOut?: number;
  /** Halts rotation from outside. Hover already halts it on its own. */
  paused?: boolean;
  /** Card to mark as current — drawn lifted and at full opacity. */
  activeIndex?: number | null;
  /** Receives the imperative handle once mounted. */
  apiRef?: React.RefObject<RingHandle | null>;
  /** Fires with the landing index when a `spinTo` finishes. */
  onSpinEnd?: (index: number) => void;
}

const DEFAULT_IMAGES: ImageItem[] = [
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/859c75ea-953e-489e-be61-91a03a35d700/w=800",
    },
    focusY: 40,
  },
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/7d4d2641-d6a8-4fef-e85c-b12ed100d500/w=800",
    },
    focusY: 0,
  },
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/bd541261-75be-469c-7dc0-dae0ce81c400/w=800",
    },
    focusY: 0,
  },
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/8e0d22a8-ac82-4893-90d8-3403f80ec600/w=800",
    },
    focusY: 0,
  },
  {
    image: {
      src: "https://imagedelivery.net/IEUjvl3YUlxY-MrTpOAWDQ/f8b3688c-11d0-425c-0b6f-66f133322c00/w=800",
    },
    focusY: 50,
  },
];

const DEFAULT_RING: Ring = { radiusX: 200, radiusY: 200, tilt: true, repeat: 6 };

const DEFAULT_TRANSITION: Transition = {
  type: "tween",
  stiffness: 800,
  damping: 60,
  mass: 1,
  ease: "linear",
  duration: 25,
};

const DEFAULT_FOCUS_Y = 50;

const TILT_ON = 1;

const roundedRadius = (rounded: number, width: number, height: number) => {
  const step = Math.min(20, Math.max(0, rounded)) / 20;
  if (step <= 0) return 0;
  return `${(width / 2) * step}px / ${(height / 2) * step}px`;
};

function resolveImageSrc(item: unknown): string | undefined {
  const image = (item as ImageItem)?.image;
  if (!image) return undefined;
  if (typeof image === "string") return image.trim() || undefined;
  return image.src || undefined;
}

function resolveSrcSet(item: unknown): string | undefined {
  const image = (item as ImageItem)?.image;
  if (!image || typeof image === "string") return undefined;
  return image.srcSet || undefined;
}

function focusOf(item: unknown): number {
  const value = (item as ImageItem)?.focusY;
  const n = typeof value === "number" ? value : DEFAULT_FOCUS_Y;
  return Math.min(100, Math.max(0, n));
}

export default function CircleImage({
  images = DEFAULT_IMAGES,
  ring = DEFAULT_RING,
  fit = "cover",
  cardWidth = 200,
  cardHeight = 200,
  rounded = 20,
  transition = DEFAULT_TRANSITION,
  direction = "anticlockwise",
  stack = "lastOnTop",
  drag = true,
  style,
  onCardClick,
  onCardHover,
  popOut = 0,
  paused = false,
  activeIndex = null,
  apiRef,
  onSpinEnd,
}: CircleImageProps) {
  const radiusX = ring?.radiusX ?? DEFAULT_RING.radiusX;
  const radiusY = ring?.radiusY ?? DEFAULT_RING.radiusY;
  const tilt = ring?.tilt ?? DEFAULT_RING.tilt;
  const repeat = ring?.repeat ?? DEFAULT_RING.repeat;

  const cardRadius = roundedRadius(rounded, cardWidth, cardHeight);

  const reach = tilt ? Math.hypot(cardWidth, cardHeight) : 0;
  const spanX = reach || cardWidth;
  const spanY = reach || cardHeight;
  const boxWidth = radiusX * 2 + spanX;
  const boxHeight = radiusY * 2 + spanY;

  const imagesKey = JSON.stringify(images?.length ? images : DEFAULT_IMAGES);
  const cards = useMemo(() => {
    const list = (JSON.parse(imagesKey) as unknown[]).filter((image) =>
      resolveImageSrc(image)
    );
    if (list.length === 0) return [];
    const times = Math.max(1, Math.round(repeat));
    const out: unknown[] = [];
    for (let r = 0; r < times; r++) out.push(...list);
    return out;
  }, [imagesKey, repeat]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const angle = useMotionValue(0);
  const animationRef = useRef<any>(null);

  const draggingRef = useRef(false);
  const dragStartAngleRef = useRef(0);
  const dragStartPointerRef = useRef(0);
  const velocityRef = useRef(0);
  const lastTimeRef = useRef(0);

  /**
   * Hover is held twice over. The placement loop runs on every animation
   * frame and reads the ref, which never makes it re-close over a changing
   * value; the card markup reads the state, because shadow and dimming are
   * render output. They are written together and never diverge.
   */
  const hoveredRef = useRef<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  /** True for the length of a `spinTo`. Suppresses idle spin, hover and drag. */
  const spinningRef = useRef(false);
  /** Backstop timer for a `spinTo` whose animation never reports in. */
  const spinSettleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeRef = useRef<number | null>(activeIndex);
  const popOutRef = useRef(popOut);

  /**
   * The two loops that write directly to card elements. Both are defined
   * inside the placement effect and reached through refs, so every DOM write
   * happens after commit rather than during render.
   */
  const placeRef = useRef<(current: number) => void>(() => {});
  const easeRef = useRef<(on: boolean) => void>(() => {});

  const liveRef = useRef({ direction, transition, drag, paused });
  // Mirrored into a ref after commit rather than during render: the values
  // are read by the rotation loop and by pointer handlers, both of which run
  // after paint, and writing a ref mid-render is what React warns about.
  useEffect(() => {
    liveRef.current = { direction, transition, drag, paused };
  });

  const geometry = useMemo(
    () => ({
      rx: radiusX,
      ry: radiusY,
      tangent: tilt ? TILT_ON : 0,
    }),
    [radiusX, radiusY, tilt]
  );

  const pointerAngle = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.atan2(
      clientY - (rect.top + rect.height / 2),
      clientX - (rect.left + rect.width / 2)
    );
  };

  const spin = () => {
    const live = liveRef.current;
    // A hovered card is one the visitor is reading. Turning it out from
    // under the pointer is the whole reason hover halts the ring.
    if (draggingRef.current || live.paused || hoveredRef.current !== null) return;
    // A wheel-of-fortune spin owns the ring until it settles.
    if (spinningRef.current) return;

    animationRef.current?.stop();
    const sign = live.direction === "anticlockwise" ? -1 : 1;
    animationRef.current = animate(
      angle,
      angle.get() + Math.PI * 2 * sign,
      { ...live.transition, repeat: Infinity } as any
    );
  };

  const onDragStart = (clientX: number, clientY: number) => {
    if (!liveRef.current.drag || spinningRef.current) return;
    draggingRef.current = true;
    animationRef.current?.stop();
    dragStartAngleRef.current = angle.get();
    dragStartPointerRef.current = pointerAngle(clientX, clientY);
    velocityRef.current = 0;
    lastTimeRef.current = performance.now();
  };

  const onDragMove = (clientX: number, clientY: number) => {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dt = now - lastTimeRef.current;
    lastTimeRef.current = now;

    const swept = pointerAngle(clientX, clientY) - dragStartPointerRef.current;
    const target = dragStartAngleRef.current + swept;
    if (dt > 0) velocityRef.current = (target - angle.get()) / dt;
    angle.set(target);
  };

  const onDragEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    if (liveRef.current.drag && Math.abs(velocityRef.current) > 0.03) {
      animationRef.current = animate(angle, angle.get(), {
        type: "inertia",
        velocity: velocityRef.current * 1000,
        power: 0.8,
        timeConstant: 700,
        restDelta: 0.01,
        onComplete: spin,
      } as any);
    } else {
      spin();
    }
  };

  useEffect(() => {
    spin();
    return () => animationRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, JSON.stringify(transition), cards.length]);

  useEffect(() => {
    const onMove = (event: MouseEvent) =>
      draggingRef.current && onDragMove(event.clientX, event.clientY);
    const onTouch = (event: TouchEvent) => {
      if (draggingRef.current && event.touches.length)
        onDragMove(event.touches[0].clientX, event.touches[0].clientY);
    };
    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchend", onDragEnd);
    window.addEventListener("touchmove", onTouch, { passive: false });
    return () => {
      window.removeEventListener("mouseup", onDragEnd);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchend", onDragEnd);
      window.removeEventListener("touchmove", onTouch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const place = (current: number) => {
      const count = cards.length;
      for (let i = 0; i < count; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;

        const at = current + (i * Math.PI * 2) / count;
        const cos = Math.cos(at);
        const sin = Math.sin(at);
        const facing = (at * 180) / Math.PI + 90;

        // A hovered card steps out along its own radius rather than simply
        // scaling up: scaling alone reads as the image zooming, while an
        // outward step reads as the sleeve being drawn from the stack.
        const lifted = hoveredRef.current === i;
        const current_ = activeRef.current === i;
        const out = lifted ? popOutRef.current : current_ ? popOutRef.current * 0.45 : 0;
        const scale = lifted ? 1.16 : current_ ? 1.06 : 1;

        const x = cos * (geometry.rx + out);
        const y = sin * (geometry.ry + out);

        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${
          facing * geometry.tangent
        }deg) scale(${scale})`;
        // Lift the hovered sleeve clear of its neighbours, which overlap it
        // at this ring density.
        el.style.zIndex = String(
          lifted ? cards.length + 20 : current_ ? cards.length + 10 : i,
        );
      }
    };

    /**
     * Transform is rewritten every frame while the ring turns, so a standing
     * CSS transition on it would smear the rotation. It is switched on only
     * around a hover, where the ring is already stopped.
     */
    const easeTransforms = (on: boolean) => {
      for (let i = 0; i < itemRefs.current.length; i++) {
        const el = itemRefs.current[i];
        if (el) el.style.transition = on ? "transform 240ms cubic-bezier(0.22,1,0.36,1)" : "";
      }
    };

    placeRef.current = place;
    easeRef.current = easeTransforms;
    place(angle.get());
    const unsubscribe = angle.on
      ? angle.on("change", place)
      : (angle as any).onChange(place);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, cards.length]);

  // The active card changes without the ring turning, so its lift has to be
  // applied on demand rather than waiting for the next frame of rotation.
  useEffect(() => {
    activeRef.current = activeIndex;
    popOutRef.current = popOut;
    placeRef.current(angle.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, popOut]);

  useEffect(() => {
    if (paused) animationRef.current?.stop();
    else spin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  /**
   * How many distinct sleeves there are, before `repeat` clones them. Callers
   * think in terms of their own list, so every index handed out is folded
   * back into that range.
   */
  const baseCount = Math.max(1, Math.round(cards.length / Math.max(1, Math.round(repeat))));

  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const positionOf = (index: number): CardPosition => {
    const at = angle.get() + (index * Math.PI * 2) / Math.max(1, cards.length);
    const ux = Math.cos(at);
    const uy = Math.sin(at);
    return { x: ux * (geometry.rx + popOut), y: uy * (geometry.ry + popOut), ux, uy };
  };

  const hoverCard = (index: number) => {
    if (hoveredRef.current === index || draggingRef.current || spinningRef.current) return;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    hoveredRef.current = index;
    animationRef.current?.stop();
    easeRef.current(true);
    placeRef.current(angle.get());
    setHoveredCard(index);
    onCardHover?.(index % baseCount, positionOf(index));
  };

  const unhoverCard = () => {
    if (hoveredRef.current === null) return;
    hoveredRef.current = null;
    easeRef.current(true);
    placeRef.current(angle.get());
    setHoveredCard(null);
    onCardHover?.(null, null);

    // Let the sleeve settle back into the ring before the ring starts
    // turning again — resuming mid-return reads as a stutter.
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      easeRef.current(false);
      spin();
    }, 260);
  };

  useEffect(
    () => () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    },
    [],
  );

  /**
   * Wheel-of-fortune spin, landing `index` under a marker at twelve o'clock.
   *
   * Screen coordinates put twelve o'clock at -PI/2, and card `i` sits at
   * `angle + i*2PI/count`, so the ring must finish at `-PI/2 - i*2PI/count`.
   * That target is then wound forward by whole turns until it is at least
   * `turns` revolutions away *in the direction the ring already turns* —
   * without that the shortest path is sometimes backwards, and a wheel that
   * reverses into its answer reads as rigged rather than lucky.
   *
   * A long ease-out rather than a physics decay: the two look the same, and
   * only this one is guaranteed to stop exactly where the pin is pointing.
   */
  const spinTo: RingHandle["spinTo"] = (index, options) => {
    if (spinningRef.current || cards.length === 0) return;

    const turns = options?.turns ?? 6;
    const duration = options?.duration ?? 5.2;
    const full = Math.PI * 2;
    const count = cards.length;

    spinningRef.current = true;
    hoveredRef.current = null;
    setHoveredCard(null);
    easeRef.current(false);
    animationRef.current?.stop();

    const from = angle.get();
    const sign = liveRef.current.direction === "anticlockwise" ? -1 : 1;
    let target = -Math.PI / 2 - (index * full) / count;

    if (sign < 0) {
      while (target > from - turns * full) target -= full;
    } else {
      while (target < from + turns * full) target += full;
    }

    /**
     * Landing the wheel, exactly once.
     *
     * `onComplete` is driven by requestAnimationFrame, which browsers suspend
     * outright in a backgrounded tab. A visitor who started a roll and looked
     * away came back to a wheel stuck on "Rolling" — and worse, to
     * `spinningRef` left true, which disables the roll button, hover and drag
     * for the rest of the session. The animation could never finish, so
     * nothing could ever clear it.
     *
     * A timer set past the animation's own length lands it regardless.
     * Whichever arrives first wins; `settled` makes the other a no-op. The
     * timer path also snaps the angle home, because a stalled animation left
     * it wherever the last frame put it.
     */
    let settled = false;
    const land = (snap: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(spinSettleRef.current);
      if (snap) {
        animationRef.current?.stop();
        angle.set(target);
        placeRef.current(target);
      }
      spinningRef.current = false;
      onSpinEnd?.(index % baseCount);
      spin();
    };

    clearTimeout(spinSettleRef.current);
    spinSettleRef.current = setTimeout(() => land(true), duration * 1000 + 400);

    animationRef.current = animate(angle, target, {
      duration,
      // Quick ramp, then a long tail that creeps to a stop.
      ease: [0.1, 0.75, 0.15, 1],
      onComplete: () => land(false),
    });
  };

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      spinTo,
      count: () => baseCount,
      isSpinning: () => spinningRef.current,
    };
    return () => {
      apiRef.current = null;
      clearTimeout(spinSettleRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRef, baseCount, cards.length]);

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        width: style?.width ?? boxWidth,
        height: style?.height ?? boxHeight,
        boxSizing: "border-box",
        position: "relative",
        overflow: "visible",
        cursor: drag ? "grab" : "default",
        userSelect: "none",
      }}
      onMouseDown={(e) => {
        if (e.button === 0) onDragStart(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        if (e.touches.length)
          onDragStart(e.touches[0].clientX, e.touches[0].clientY);
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1,
          height: 1,
        }}
      >
        {cards.map((image, index) => {
          const src = resolveImageSrc(image);
          const layer = stack === "firstOnTop" ? cards.length - index : index;
          const lifted = hoveredCard === index;
          const isActive = activeIndex !== null && index % baseCount === activeIndex;
          const interactive = Boolean(onCardClick || onCardHover);

          return (
            <div
              key={`${index}-${src}`}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: cardWidth,
                height: cardHeight,
                zIndex: layer,
                willChange: "transform",
              }}
            >
              <div
                onClick={(e) => {
                  if (!onCardClick || draggingRef.current) return;
                  e.stopPropagation();
                  onCardClick(index % baseCount, image as ImageItem);
                }}
                onMouseEnter={() => hoverCard(index)}
                onMouseLeave={unhoverCard}
                onFocus={() => hoverCard(index)}
                onBlur={unhoverCard}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: cardRadius,
                  overflow: "hidden",
                  cursor: "pointer",
                  pointerEvents: interactive ? "auto" : undefined,
                  // The lifted sleeve is the only one at full strength, so
                  // the ring reads as background the moment one is picked up.
                  boxShadow: lifted
                    ? "0 18px 38px -10px rgba(0,0,0,0.85)"
                    : isActive
                      ? "0 0 0 2px #ffd400, 0 10px 26px -10px rgba(0,0,0,0.8)"
                      : "none",
                  transition: "box-shadow 200ms ease-out, filter 200ms ease-out",
                  filter:
                    hoveredCard !== null && !lifted
                      ? "brightness(0.55) saturate(0.85)"
                      : "none",
                }}
              >
                {src ? (
                  <img
                    src={src}
                    srcSet={resolveSrcSet(image)}
                    alt=""
                    draggable={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: fit,
                      objectPosition:
                        fit === "cover" ? `center ${focusOf(image)}%` : "center",
                      display: "block",
                      pointerEvents: "none",
                    }}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}