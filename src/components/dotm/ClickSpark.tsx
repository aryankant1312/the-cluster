"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";

/**
 * ClickSpark — a DOTM-scoped adaptation of ReactBits' canvas click effect.
 *
 * The canvas is fixed to the viewport so clicks still line up inside dragged,
 * maximized and fullscreen windows. It never accepts pointer events, and the
 * wrapper listens in the capture phase, so the visual response cannot steal
 * or cancel the control that was actually clicked.
 *
 * Source: https://reactbits.dev/animations/click-spark
 */

interface Spark {
  x: number;
  y: number;
  angle: number;
  startedAt: number;
}

interface ClickSparkProps {
  children: ReactNode;
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
}

export function ClickSpark({
  children,
  sparkColor = "#ffffff",
  sparkSize = 12,
  sparkRadius = 24,
  sparkCount = 8,
  duration = 420,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const frameRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext("2d");
    context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      reducedMotionRef.current = motionQuery.matches;
    };

    syncMotionPreference();
    resizeCanvas();
    motionQuery.addEventListener("change", syncMotionPreference);
    window.addEventListener("resize", resizeCanvas);

    return () => {
      motionQuery.removeEventListener("change", syncMotionPreference);
      window.removeEventListener("resize", resizeCanvas);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [resizeCanvas]);

  function draw(timestamp: number) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      frameRef.current = null;
      return;
    }

    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    context.strokeStyle = sparkColor;
    context.lineWidth = 2;
    context.lineCap = "round";

    sparksRef.current = sparksRef.current.filter((spark) => {
      const progress = (timestamp - spark.startedAt) / duration;
      if (progress >= 1) return false;

      // ReactBits' ease-out curve: quick release, soft finish.
      const eased = progress * (2 - progress);
      const distance = eased * sparkRadius;
      const lineLength = sparkSize * (1 - eased);
      const cos = Math.cos(spark.angle);
      const sin = Math.sin(spark.angle);

      context.beginPath();
      context.moveTo(spark.x + distance * cos, spark.y + distance * sin);
      context.lineTo(
        spark.x + (distance + lineLength) * cos,
        spark.y + (distance + lineLength) * sin,
      );
      context.stroke();
      return true;
    });

    if (sparksRef.current.length > 0) {
      frameRef.current = requestAnimationFrame(draw);
    } else {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      frameRef.current = null;
    }
  }

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (reducedMotionRef.current || (event.clientX === 0 && event.clientY === 0)) return;

    const startedAt = performance.now();
    sparksRef.current.push(
      ...Array.from({ length: sparkCount }, (_, index) => ({
        x: event.clientX,
        y: event.clientY,
        angle: (Math.PI * 2 * index) / sparkCount,
        startedAt,
      })),
    );

    if (frameRef.current === null) frameRef.current = requestAnimationFrame(draw);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" onClickCapture={handleClick}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[500]"
      />
      {children}
    </div>
  );
}
