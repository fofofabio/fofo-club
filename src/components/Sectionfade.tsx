"use client";
import type React from "react";
import { createElement, useEffect, useMemo, useRef } from "react";
type SectionFadeProps<T extends keyof React.JSX.IntrinsicElements = "div"> = {
  as?: T;                         // polymorphic element
  className?: string;
  children: React.ReactNode;
  /** Reveal only once (default) or toggle in/out on scroll */
  once?: boolean;                 // default: true
  /** Intersection threshold(s) */
  threshold?: number | number[];  // default: 0.15
  /** Root margin / viewport offset (e.g., "0px 0px -15% 0px") */
  offset?: string;                // default: "0px 0px -10% 0px"
  /** Extra class names for base + in states (use your globals by default) */
  baseClass?: string;             // default: "fc-section"
  inClass?: string;               // default: "fc-section-in"
  /** Optional initial delay in ms (applies as inline style) */
  delay?: number;                 // default: 0
  /** Callback when it first reveals */
  onReveal?: () => void;
  /** Force-disable all observer logic (always in) */
  disabled?: boolean;
} & React.JSX.IntrinsicElements[T];

export default function SectionFade<T extends keyof React.JSX.IntrinsicElements = "div">({
  as,
  className = "",
  children,
  once = true,
  threshold = 0.15,
  offset = "0px 0px -10% 0px",
  baseClass = "fc-section",
  inClass = "fc-section-in",
  delay = 0,
  onReveal,
  disabled = false,
  ...rest
}: SectionFadeProps<T>) {
  const Tag = (as || "div") as any;
  const ref = useRef<HTMLElement | null>(null);
  const revealedOnceRef = useRef(false);

  const reduceMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;

    // Base state
    el.classList.add(baseClass);

    // Reduced motion or disabled → show immediately
    if (reduceMotion || disabled) {
      el.classList.add(inClass);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isIn = entry.isIntersecting;

          if (isIn) {
            if (!revealedOnceRef.current) {
              onReveal?.();
            }
            el.classList.add(inClass);
            revealedOnceRef.current = true;
            if (once) {
              io.unobserve(el);
            }
          } else if (!once) {
            el.classList.remove(inClass);
          }
        });
      },
      { root: null, rootMargin: offset, threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [baseClass, inClass, once, threshold, offset, onReveal, reduceMotion, disabled]);

  // Add initial delay inline (keeps Tailwind simple)
  const style = delay ? { transitionDelay: `${delay}ms` } : undefined;

  return createElement(
    Tag,
    { ref, className, style, ...rest },
    children
  );
}
