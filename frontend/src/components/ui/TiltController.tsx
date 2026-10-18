"use client";

import { useEffect } from "react";

// Max tilt for a small card; bigger cards (tables, forms) tilt proportionally less.
const MAX_DEG = 7;
const FULL_TILT_SIZE = 340;

const VARS = ["--tilt-x", "--tilt-y", "--glare-x", "--glare-y"];

// One delegated listener drives every `.tilt-3d` card (see globals.css), so cards
// stay plain class strings and no component needs its own mouse handlers.
export default function TiltController() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    // Cards that are faces of a 3D scene (e.g. flip cards) already own their transform.
    const inScene = new WeakMap<HTMLElement, boolean>();
    const isInScene = (el: HTMLElement) => {
      let value = inScene.get(el);
      if (value === undefined) {
        value = !!el.parentElement && getComputedStyle(el.parentElement).transformStyle === "preserve-3d";
        inScene.set(el, value);
      }
      return value;
    };

    let active: HTMLElement | null = null;
    let frame = 0;

    const reset = (el: HTMLElement) => {
      el.removeAttribute("data-tilting");
      VARS.forEach((v) => el.style.removeProperty(v));
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const card = (e.target as Element | null)?.closest?.<HTMLElement>(".tilt-3d") ?? null;
      if (card !== active) {
        if (active) reset(active);
        active = card;
      }
      if (!card || isInScene(card)) return;

      const { clientX, clientY } = e;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const px = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
        const py = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
        const deg = MAX_DEG * Math.min(1, FULL_TILT_SIZE / Math.max(r.width, r.height));
        card.style.setProperty("--tilt-x", `${((0.5 - py) * deg).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${((px - 0.5) * deg).toFixed(2)}deg`);
        card.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`);
        card.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`);
        card.setAttribute("data-tilting", "");
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(frame);
      if (active) reset(active);
      active = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      onLeave();
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return null;
}
