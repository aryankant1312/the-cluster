"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import styles from "./FlowingMenu.module.css";

export interface FlowingMenuItem {
  id: string;
  number: string;
  text: string;
  tags: readonly string[];
  image: string;
}

interface FlowingMenuProps {
  items: readonly FlowingMenuItem[];
  onSelect: (id: string) => void;
  speed?: number;
}

export function FlowingMenu({ items, onSelect, speed = 15 }: FlowingMenuProps) {
  return (
    <div className={styles.menuWrap}>
      <nav className={styles.menu} aria-label="Services">
        {items.map((item) => (
          <MenuItem key={item.id} {...item} speed={speed} onSelect={onSelect} />
        ))}
      </nav>
    </div>
  );
}

function MenuItem({
  id,
  number,
  text,
  tags,
  image,
  speed,
  onSelect,
}: FlowingMenuItem & { speed: number; onSelect: (id: string) => void }) {
  const itemRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const marqueeInnerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const [repetitions, setRepetitions] = useState(4);

  useEffect(() => {
    const calculateRepetitions = () => {
      const content = marqueeInnerRef.current?.querySelector<HTMLElement>(`.${styles.marqueePart}`);
      if (!content || content.offsetWidth === 0) return;
      setRepetitions(Math.max(4, Math.ceil(window.innerWidth / content.offsetWidth) + 2));
    };
    calculateRepetitions();
    window.addEventListener("resize", calculateRepetitions);
    return () => window.removeEventListener("resize", calculateRepetitions);
  }, [text, image]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const inner = marqueeInnerRef.current;
      const content = inner?.querySelector<HTMLElement>(`.${styles.marqueePart}`);
      if (!inner || !content || content.offsetWidth === 0) return;
      animationRef.current?.kill();
      animationRef.current = gsap.to(inner, {
        x: -content.offsetWidth,
        duration: speed,
        ease: "none",
        repeat: -1,
      });
    }, 50);
    return () => {
      window.clearTimeout(timer);
      animationRef.current?.kill();
    };
  }, [image, repetitions, speed, text]);

  const nearestEdge = (event: React.MouseEvent) => {
    const rect = itemRef.current?.getBoundingClientRect();
    if (!rect) return "bottom";
    return event.clientY - rect.top < rect.height / 2 ? "top" : "bottom";
  };

  const enter = (event: React.MouseEvent) => {
    if (!marqueeRef.current || !marqueeInnerRef.current) return;
    const edge = nearestEdge(event);
    gsap.timeline({ defaults: { duration: 0.6, ease: "expo.out" } })
      .set(marqueeRef.current, { y: edge === "top" ? "-101%" : "101%" }, 0)
      .set(marqueeInnerRef.current, { y: edge === "top" ? "101%" : "-101%" }, 0)
      .to([marqueeRef.current, marqueeInnerRef.current], { y: "0%" }, 0);
  };

  const leave = (event: React.MouseEvent) => {
    if (!marqueeRef.current || !marqueeInnerRef.current) return;
    const edge = nearestEdge(event);
    gsap.timeline({ defaults: { duration: 0.6, ease: "expo.out" } })
      .to(marqueeRef.current, { y: edge === "top" ? "-101%" : "101%" }, 0)
      .to(marqueeInnerRef.current, { y: edge === "top" ? "101%" : "-101%" }, 0);
  };

  return (
    <div className={styles.item} ref={itemRef}>
      <button
        type="button"
        className={styles.itemLink}
        onClick={() => onSelect(id)}
        onMouseEnter={enter}
        onMouseLeave={leave}
        onFocus={(event) => enter(event as unknown as React.MouseEvent)}
        onBlur={(event) => leave(event as unknown as React.MouseEvent)}
      >
        <span className={styles.number}>{number}</span>
        <span>
          <strong className={styles.title}>{text}</strong>
          <small className={styles.tags}>{tags.join(" / ")}</small>
        </span>
        <span className={styles.arrow} aria-hidden="true">↗</span>
      </button>
      <div className={styles.marquee} ref={marqueeRef} style={{ backgroundColor: "#D22B2B" }} aria-hidden="true">
        <div className={styles.marqueeInnerWrap}>
          <div className={styles.marqueeInner} ref={marqueeInnerRef}>
            {Array.from({ length: repetitions }, (_, index) => (
              <div className={styles.marqueePart} key={index}>
                <span>{text}</span>
                <span className={styles.marqueeImage} style={{ backgroundImage: `url(${image})` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
