import { useEffect, useRef, useState } from "react";

/**
 * Single-fire viewport reveal. Pairs with `.ap-reveal` CSS class.
 * Sets `is-visible` once, then disconnects the observer.
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
          break;
        }
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
  }, [options]);

  return { ref, visible } as const;
}

/**
 * Count-up on first intersection. Respects prefers-reduced-motion.
 */
export function useCountUp(target: number, durationMs = 1200) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || target <= 0) {
      setValue(target);
      return;
    }

    let raf = 0;
    let start = 0;
    let startedFrom = 0;

    const tick = (t: number) => {
      if (!start) {
        start = t;
        startedFrom = 0;
      }
      const progress = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startedFrom + (target - startedFrom) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            raf = requestAnimationFrame(tick);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs]);

  return { ref, value } as const;
}
