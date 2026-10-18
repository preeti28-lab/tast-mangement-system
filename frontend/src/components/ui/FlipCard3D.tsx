"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

type Props = {
  front: ReactNode;
  back: ReactNode;
  /** "hover" flips on mouse hover / keyboard focus (tap on touch); "click" toggles on click or Enter/Space. */
  trigger?: "hover" | "click";
  direction?: "horizontal" | "vertical";
  /** Faces are absolutely positioned, so the card needs an explicit height. */
  height?: CSSProperties["height"];
  width?: CSSProperties["width"];
  className?: string;
  /** Replace the default face styling (e.g. to reuse an existing card look). */
  frontClassName?: string;
  backClassName?: string;
  /** Accessible name for the card when trigger="click". */
  label?: string;
  /** Make a hover card itself tabbable (when no link/button inside would give it focus). */
  focusable?: boolean;
};

const faceBase = "absolute inset-0 overflow-hidden rounded-2xl [backface-visibility:hidden]";

export const flipFrontClass =
  "flex flex-col items-center justify-center gap-2 border border-zinc-200/70 bg-gradient-to-br from-white to-zinc-50 p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(79,70,229,0.18)] dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950";

export const flipBackClass =
  "flex flex-col items-center justify-center gap-2 border border-indigo-400/50 bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-center text-white shadow-xl shadow-indigo-500/30 dark:border-indigo-300/30 dark:from-indigo-600 dark:to-violet-700";

/**
 * Pure CSS 3D flip card: two faces on a preserve-3d body that rotates 180°
 * around the Y (horizontal) or X (vertical) axis. Touch taps toggle the card,
 * keyboard focus inside a hover card flips it so links on the back stay reachable.
 */
export default function FlipCard3D({
  front,
  back,
  trigger = "hover",
  direction = "horizontal",
  height = 300,
  width = "100%",
  className = "",
  frontClassName = flipFrontClass,
  backClassName = flipBackClass,
  label,
  focusable = false,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  const axis = direction === "vertical" ? "rotateX" : "rotateY";
  const toggle = () => setFlipped((f) => !f);

  const events =
    trigger === "click"
      ? {
          role: "button",
          tabIndex: 0,
          "aria-pressed": flipped,
          "aria-label": label,
          onClick: toggle,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          },
        }
      : {
          tabIndex: focusable ? 0 : undefined,
          onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setFlipped(true),
          onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && setFlipped(false),
          // Touch has no hover: a tap toggles the card, except taps on links/buttons on the back.
          onPointerUp: (e: React.PointerEvent) => {
            if (e.pointerType === "mouse") return;
            if (flipped && (e.target as HTMLElement).closest("a, button")) return;
            toggle();
          },
          // Keyboard focus only — a tap also focuses, and onPointerUp already handles taps.
          onFocus: (e: React.FocusEvent) => (e.target as HTMLElement).matches(":focus-visible") && setFlipped(true),
          onBlur: (e: React.FocusEvent) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setFlipped(false);
          },
        };

  return (
    <div
      className={`rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950 ${
        trigger === "click" ? "cursor-pointer select-none" : ""
      } ${className}`}
      style={{ perspective: "1100px", width, height }}
      {...events}
    >
      <div
        className="relative h-full w-full transition-transform duration-700 [transition-timing-function:cubic-bezier(0.4,0.2,0.2,1)] motion-reduce:duration-0"
        style={{ transformStyle: "preserve-3d", transform: `${axis}(${flipped ? 180 : 0}deg)` }}
      >
        <div className={`${faceBase} ${frontClassName}`}>
          {front}
        </div>
        <div className={`${faceBase} ${backClassName}`} style={{ transform: `${axis}(180deg)` }}>
          {back}
        </div>
      </div>
    </div>
  );
}
