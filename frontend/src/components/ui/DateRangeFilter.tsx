"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, ChevronDownIcon, XIcon } from "@/components/icons";
import { toDateInput, todayInput } from "@/lib/format";
import { useFloating } from "./floating";

/** Days are local "YYYY-MM-DD" strings; an empty side means open-ended. */
export type DateRange = { from: string; to: string };

const day = (y: number, m: number, d: number) => toDateInput(new Date(y, m, d).toISOString());

/** Quick picks for a due-date filter, computed from today's local date. */
function presets(): { key: string; label: string; range: DateRange }[] {
  const n = new Date();
  const [y, m, d] = [n.getFullYear(), n.getMonth(), n.getDate()];
  const monday = d - ((n.getDay() + 6) % 7);
  return [
    { key: "today", label: "Today", range: { from: todayInput(), to: todayInput() } },
    { key: "tomorrow", label: "Tomorrow", range: { from: day(y, m, d + 1), to: day(y, m, d + 1) } },
    { key: "week", label: "This week", range: { from: day(y, m, monday), to: day(y, m, monday + 6) } },
    { key: "next7", label: "Next 7 days", range: { from: todayInput(), to: day(y, m, d + 6) } },
    { key: "month", label: "This month", range: { from: day(y, m, 1), to: day(y, m + 1, 0) } },
    { key: "past", label: "Before today", range: { from: "", to: day(y, m, d - 1) } },
  ];
}

const short = (v: string) => {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/** "Today", "18 Oct – 25 Oct", "From 18 Oct", "Until 25 Oct", or "" when unset. */
export function describeRange({ from, to }: DateRange) {
  if (!from && !to) return "";
  const preset = presets().find((p) => p.range.from === from && p.range.to === to);
  if (preset) return preset.label;
  if (from && to) return from === to ? short(from) : `${short(from)} – ${short(to)}`;
  return from ? `From ${short(from)}` : `Until ${short(to)}`;
}

export const dateFieldClass =
  "mt-1 h-10 w-full min-w-0 rounded-xl border border-line bg-surface/70 px-3 text-[13px] font-medium text-fg tabular-nums [color-scheme:light] focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:outline-none dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100";

/**
 * Date-range filter: a trigger that shows the current range and a glass panel
 * with one-tap presets plus a custom from/to. Changes apply immediately.
 */
export default function DateRangeFilter({
  value,
  onChange,
  label,
  className = "",
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Field name shown on the trigger, e.g. "Due date". */
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const style = useFloating(triggerRef, open, { width: 320 });

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isSet = !!(value.from || value.to);
  const summary = describeRange(value);
  const invalid = !!(value.from && value.to && value.from > value.to);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label} filter${isSet ? `: ${summary}` : ""}`}
        onClick={() => setOpen((o) => !o)}
        className={`group inline-flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border bg-surface/60 pr-9 pl-3 text-left text-[13.5px] font-medium backdrop-blur-md transition-all duration-200 hover:bg-surface/90 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:outline-none ${
          isSet
            ? "border-brand-400/60 text-brand-700 shadow-[0_0_0_3px_rgba(34,197,94,0.10)] dark:text-brand-300"
            : "border-line text-fg"
        } ${open ? "border-brand-500 ring-2 ring-brand-500/25" : ""}`}
      >
        <CalendarIcon className={`h-4 w-4 ${isSet ? "text-brand-600 dark:text-brand-400" : "text-muted"}`} />
        <span className="min-w-0 flex-1 truncate">
          {isSet ? (
            summary
          ) : (
            <>
              {label}: <span className="text-muted">Any time</span>
            </>
          )}
        </span>
      </button>
      {/* Clear sits beside the trigger (not inside it) so it stays a separate control. */}
      {isSet ? (
        <button
          type="button"
          onClick={() => onChange({ from: "", to: "" })}
          aria-label={`Clear ${label.toLowerCase()} filter`}
          className="absolute top-1/2 right-2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-hover hover:text-fg"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      ) : (
        <ChevronDownIcon
          className={`pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      )}

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={`${label} filter`}
            style={style}
            className="glass-menu dropdown-in w-80 rounded-2xl p-4 text-left"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
              <CalendarIcon className="h-3.5 w-3.5 text-brand-500" />
              {label}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {presets().map((p) => {
                const on = p.range.from === value.from && p.range.to === value.to;
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange(p.range)}
                    className={`rounded-lg border px-2.5 py-2 text-[12.5px] font-medium transition ${
                      on
                        ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-500/15 dark:text-brand-300"
                        : "border-line bg-surface/50 text-slate-700 hover:border-brand-300 hover:bg-hover dark:text-slate-200 dark:hover:border-brand-700"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="my-4 flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
              <span className="h-px flex-1 bg-line" />
              Custom range
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="block min-w-0 text-xs font-medium text-muted">
                From
                <input
                  type="date"
                  value={value.from}
                  max={value.to || undefined}
                  onChange={(e) => onChange({ ...value, from: e.target.value })}
                  className={dateFieldClass}
                />
              </label>
              <label className="block min-w-0 text-xs font-medium text-muted">
                To
                <input
                  type="date"
                  value={value.to}
                  min={value.from || undefined}
                  onChange={(e) => onChange({ ...value, to: e.target.value })}
                  className={dateFieldClass}
                />
              </label>
            </div>
            {invalid && <p className="mt-2 text-xs text-red-600 dark:text-red-400">“From” must be on or before “To”.</p>}

            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <button
                type="button"
                onClick={() => onChange({ from: "", to: "" })}
                disabled={!isSet}
                className="rounded-lg px-2 py-1.5 text-[13px] font-medium text-muted hover:bg-hover hover:text-fg disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
