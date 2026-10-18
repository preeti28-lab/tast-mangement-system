"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";

/**
 * Fixed-position coordinates for a panel anchored under (or, without room, above)
 * a trigger. Rendered through a portal, the panel escapes `overflow` clipping of
 * table wrappers and cards. Follows the trigger on scroll and resize.
 */
export function useFloating(
  anchor: RefObject<HTMLElement | null>,
  open: boolean,
  { width, gap = 6, align = "start" }: { width?: number; gap?: number; align?: "start" | "end" } = {}
) {
  const [style, setStyle] = useState<CSSProperties>({ position: "fixed", top: -9999, left: -9999 });

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = anchor.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.max(width ?? 0, r.width);
      const vw = document.documentElement.clientWidth;
      // "end" lines the panel's right edge up with the trigger's (menus at the right of a bar).
      const wanted = align === "end" ? r.right - w : r.left;
      const left = Math.min(Math.max(8, wanted), vw - w - 8);
      const below = window.innerHeight - r.bottom;
      // Open upward only when there's clearly more room above.
      const up = below < 260 && r.top > below;
      setStyle({
        position: "fixed",
        left,
        minWidth: w,
        maxWidth: vw - 16,
        zIndex: 70,
        ...(up ? { bottom: window.innerHeight - r.top + gap } : { top: r.bottom + gap }),
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [anchor, open, width, gap, align]);

  return style;
}
