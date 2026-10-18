"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cardFlatClass } from "./Surface";

// Loading states: a branded splash while the session loads, shimmer skeletons
// shaped like the page that's coming, and a small inline spinner.

const SPLASH_STEPS = ["Checking your session…", "Loading your workspace…", "Syncing your tasks…"];
export const LOGOUT_STEPS = ["Signing you out…", "Clearing your session…", "See you soon!"];

/** Full-screen splash shown while AppShell loads the current user, or (with `overlay`)
 *  on top of the app while logging out. */
export function AppLoader({ steps = SPLASH_STEPS, overlay = false }: { steps?: string[]; overlay?: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), overlay ? 700 : 1400);
    return () => clearInterval(id);
  }, [steps, overlay]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`isolate grid place-items-center overflow-hidden bg-app px-6 ${
        overlay ? "fixed inset-0 z-[100] animate-[fade-in_200ms_ease-out]" : "relative min-h-screen flex-1"
      }`}
    >
      <div className="glass-backdrop" aria-hidden="true">
        <span className="-top-32 right-[-8rem] h-[28rem] w-[28rem] bg-emerald-300 dark:bg-emerald-500" />
        <span className="top-1/3 -left-40 h-[26rem] w-[26rem] bg-sky-300 dark:bg-sky-600" />
        <span className="right-1/4 -bottom-40 h-[24rem] w-[24rem] bg-violet-300 dark:bg-violet-600" />
      </div>

      <div className="flex flex-col items-center text-center">
        {/* Logo mark inside an orbiting ring */}
        <div className="relative grid h-32 w-32 place-items-center">
          <span className="loader-orbit absolute inset-0 rounded-full" aria-hidden="true" />
          <span className="absolute inset-3 rounded-full bg-brand-500/15 blur-xl motion-safe:animate-pulse" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark, shown before the app hydrates */}
          <img
            src="/logo.png"
            alt=""
            width={80}
            height={80}
            className="relative h-20 w-20 object-contain drop-shadow-[0_18px_30px_rgba(22,163,74,0.45)] motion-safe:animate-[rise_500ms_ease-out_backwards]"
          />
        </div>

        <p className="mt-7 text-3xl font-bold tracking-tight">
          <span className="text-fg">Nex</span>
          <span className="text-brand-600 dark:text-brand-400">Task</span>
        </p>
        <p key={step} className="mt-2 h-5 animate-[rise_400ms_ease-out_backwards] text-sm text-muted">
          {steps[step]}
        </p>

        <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10" aria-hidden="true">
          <span className="loader-bar block h-full w-1/3 rounded-full bg-gradient-to-r from-brand-400 via-emerald-400 to-sky-400" />
        </div>
      </div>
    </div>
  );
}

/** Shimmering placeholder block. */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  // Default corner radius only when the caller didn't pick one (two rounded-* would clash).
  const radius = /\brounded/.test(className) ? "" : "rounded-lg";
  return <span className={`skeleton block ${radius} ${className}`} style={style} aria-hidden="true" />;
}

/** Placeholder for a page of stat tiles and chart cards (dashboard, analytics). */
export function CardsSkeleton({ tiles = 4, cards = 2 }: { tiles?: number; cards?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: tiles }, (_, i) => (
          <div key={i} className={`flex items-start gap-4 p-6 ${cardFlatClass}`}>
            <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-3 pt-1">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-8 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className={`p-6 ${cardFlatClass}`}>
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="mt-6 flex h-40 items-end gap-2">
              {[45, 70, 35, 85, 55, 95, 60, 75].map((h, j) => (
                <Skeleton key={j} className="flex-1 rounded-md" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Placeholder for a table card (tasks, activity, notifications, team). */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className={`overflow-hidden ${cardFlatClass}`}>
      <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <Skeleton className="h-9 w-full rounded-xl sm:w-72" />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5" style={{ width: `${60 - ((i * 13) % 25)}%` }} />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
            <Skeleton className="hidden h-6 w-24 rounded-lg md:block" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Small inline loader for modals and sections. */
export function InlineLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
      <span className="relative grid h-10 w-10 place-items-center">
        <span className="absolute inset-0 rounded-full border-[3px] border-brand-500/15" />
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-brand-500 border-r-brand-400" />
        <span className="h-2 w-2 rounded-full bg-brand-500 motion-safe:animate-ping" />
      </span>
      <span className="text-sm font-medium text-muted">{label}</span>
    </div>
  );
}
