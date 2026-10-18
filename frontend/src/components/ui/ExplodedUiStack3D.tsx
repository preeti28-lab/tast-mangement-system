"use client";

import { useState, type ReactNode } from "react";

const BARS = [40, 70, 52, 90, 64];

/**
 * Exploded UI stack: a mini NexTask screen that pulls apart into its layers
 * (backdrop, task card, progress chart, header, new-task button) on hover,
 * keyboard focus or tap. Built for the indigo auth side panel.
 */
export default function ExplodedUiStack3D({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  const z = (zOpen: number) => ({ transform: `translateZ(${open ? zOpen : 0}px)` });
  const layer = "transition-transform duration-[600ms] [transition-timing-function:cubic-bezier(0.3,1.15,0.4,1)] motion-reduce:duration-0";

  const tag = (label: string): ReactNode => (
    <span
      className={`absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full whitespace-nowrap rounded-md bg-slate-900/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300 transition-opacity duration-300 ${
        open ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden="true"
    >
      {label}
    </span>
  );

  return (
    <div
      role="img"
      aria-label="Layers of a NexTask screen: background, task card, progress chart, header and new-task button"
      tabIndex={0}
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
      onPointerUp={(e) => e.pointerType !== "mouse" && setOpen((o) => !o)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      className={`relative grid h-[280px] w-full cursor-pointer select-none place-items-center overflow-hidden rounded-3xl border border-white/15 bg-white/[0.07] backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${className}`}
      style={{ perspective: "1100px" }}
    >
      <div
        style={{ transform: "rotateX(48deg) rotateZ(32deg)", transformStyle: "preserve-3d" }}
        className="relative -mt-4 h-[170px] w-[135px]"
      >
        {/* layer 0 — backdrop */}
        <div
          style={z(0)}
          className={`${layer} absolute inset-[-14px] rounded-3xl bg-gradient-to-br from-brand-400 to-emerald-600 ring-1 ring-white/25 shadow-[0_40px_60px_-18px_rgba(5,46,22,0.6)]`}
        >
          {tag("background")}
        </div>

        {/* layer 1 — task card */}
        <div
          style={z(44)}
          className={`${layer} absolute inset-0 rounded-2xl border border-white/50 bg-white/95 shadow-xl dark:border-slate-600 dark:bg-slate-800`}
        >
          <span className="absolute inset-x-3 top-10 space-y-2">
            {["w-3/4", "w-1/2"].map((w, i) => (
              <span key={w} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-sm border ${i === 0 ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-500"}`} />
                <span className={`block h-1.5 ${w} rounded bg-slate-200 dark:bg-slate-600`} />
              </span>
            ))}
          </span>
          {tag("task card")}
        </div>

        {/* layer 2 — progress chart */}
        <div
          style={z(88)}
          className={`${layer} absolute inset-x-3 bottom-4 flex h-[56px] items-end gap-1 rounded-xl border border-white/60 bg-white p-2 shadow-lg dark:border-slate-500 dark:bg-slate-700`}
        >
          {BARS.map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} className="w-full flex-1 rounded-t bg-gradient-to-t from-brand-500 to-emerald-300" />
          ))}
          {tag("progress")}
        </div>

        {/* layer 3 — header */}
        <div
          style={z(126)}
          className={`${layer} absolute inset-x-3 top-2.5 flex h-6 items-center gap-1.5 rounded-lg bg-slate-900 px-2 shadow-lg dark:bg-black`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="h-1.5 w-10 rounded bg-white/40" />
          {tag("header")}
        </div>

        {/* layer 4 — new task button */}
        <div
          style={z(168)}
          className={`${layer} absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[15px] font-black text-white shadow-[0_14px_24px_-8px_rgba(16,185,129,0.8)]`}
        >
          +{tag("new task")}
        </div>
      </div>

      <p className="pointer-events-none absolute bottom-3 text-[10.5px] font-bold uppercase tracking-[0.18em] text-brand-200/80">
        {open ? "the anatomy of a screen" : "hover — explode the UI"}
      </p>
    </div>
  );
}
