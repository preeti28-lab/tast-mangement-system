"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/Surface";
import { popoverInputClass } from "@/components/ui/table";
import type { Task } from "@/lib/api";
import { formatDate, toDateInput, todayInput } from "@/lib/format";

export type ExportDateField = "createdAt" | "dueDate";

/** Days are local "YYYY-MM-DD" strings; an empty end means open-ended. */
export type ExportRange = { field: ExportDateField; from: string; to: string };

type Preset = "all" | "today" | "7d" | "30d" | "month" | "lastMonth" | "custom";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

const FIELDS: { value: ExportDateField; label: string }[] = [
  { value: "createdAt", label: "Created date" },
  { value: "dueDate", label: "Due date" },
];

const day = (d: Date) => toDateInput(d.toISOString());

function presetRange(preset: Exclude<Preset, "custom">): { from: string; to: string } {
  const now = new Date();
  const back = (days: number) => day(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days));
  switch (preset) {
    case "all":
      return { from: "", to: "" };
    case "today":
      return { from: todayInput(), to: todayInput() };
    case "7d":
      return { from: back(6), to: todayInput() };
    case "30d":
      return { from: back(29), to: todayInput() };
    case "month":
      return { from: day(new Date(now.getFullYear(), now.getMonth(), 1)), to: todayInput() };
    case "lastMonth":
      return {
        from: day(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: day(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
  }
}

/** Keeps tasks whose chosen date falls in the range (inclusive), sorted oldest first. */
export function filterTasksByDate(tasks: Task[], { field, from, to }: ExportRange) {
  const dayOf = (t: Task) => toDateInput(t[field]);
  const inRange = (t: Task) => {
    if (!from && !to) return true;
    const d = dayOf(t);
    if (!d) return false; // no due date can't fall inside a date range
    return (!from || d >= from) && (!to || d <= to);
  };
  // Tasks without the date (e.g. no due date) go last.
  return tasks.filter(inRange).sort((a, b) => (dayOf(a) || "9999").localeCompare(dayOf(b) || "9999"));
}

/** File-name suffix like "created-2026-10-01-to-2026-10-18"; empty for all time. */
export function rangeFileSuffix({ field, from, to }: ExportRange) {
  if (!from && !to) return "";
  const kind = field === "createdAt" ? "created" : "due";
  return from === to ? `${kind}-${from}` : `${kind}-${from || "start"}-to-${to || "today"}`;
}

const isoOf = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : undefined);

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onExport: (range: ExportRange) => void;
};

export default function ExportTasksDialog({ open, busy, onClose, onExport }: Props) {
  const [field, setField] = useState<ExportDateField>("createdAt");
  const [preset, setPreset] = useState<Preset>("all");
  const [custom, setCustom] = useState({ from: "", to: todayInput() });

  const range = preset === "custom" ? custom : presetRange(preset);
  const invalid = preset === "custom" && (!custom.from || !custom.to || custom.from > custom.to);
  const fieldLabel = field === "createdAt" ? "created" : "due";

  const summary = invalid
    ? "Pick a start and end date."
    : !range.from && !range.to
      ? "Every task in this view, with your current filters."
      : range.from === range.to
        ? `Tasks ${fieldLabel} on ${formatDate(isoOf(range.from))}.`
        : `Tasks ${fieldLabel} from ${formatDate(isoOf(range.from))} to ${formatDate(isoOf(range.to))}.`;

  return (
    <Modal open={open} title="Export tasks" onClose={onClose} size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!invalid) onExport({ field, ...range });
        }}
        className="space-y-5"
      >
        <fieldset>
          <legend className="text-sm font-semibold text-fg">Filter by</legend>
          <div role="radiogroup" aria-label="Date field" className="well-3d mt-2 grid grid-cols-2 gap-1 rounded-xl p-1.5">
            {FIELDS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={field === f.value}
                onClick={() => setField(f.value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  field === f.value ? "raised-3d text-brand-700 dark:text-brand-300" : "text-slate-600 hover:text-fg dark:text-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-fg">Date range</legend>
          <div role="radiogroup" aria-label="Date range" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={preset === p.value}
                onClick={() => setPreset(p.value)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  p.value === "custom" ? "col-span-2 sm:col-span-3" : ""
                } ${
                  preset === p.value
                    ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-500/10 dark:text-brand-300"
                    : "border-line bg-surface text-slate-700 hover:border-brand-300 hover:bg-hover dark:text-slate-200 dark:hover:border-brand-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block min-w-0 text-xs font-medium text-muted">
                From
                <input
                  type="date"
                  value={custom.from}
                  max={custom.to || undefined}
                  onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                  className={`mt-1 ${popoverInputClass} py-2`}
                  required
                />
              </label>
              <label className="block min-w-0 text-xs font-medium text-muted">
                To
                <input
                  type="date"
                  value={custom.to}
                  min={custom.from || undefined}
                  onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                  className={`mt-1 ${popoverInputClass} py-2`}
                  required
                />
              </label>
              {custom.from && custom.to && custom.from > custom.to && (
                <p className="col-span-2 text-xs text-red-600 dark:text-red-400">“From” must be on or before “To”.</p>
              )}
            </div>
          )}
        </fieldset>

        <p className="rounded-xl bg-hover/70 px-3 py-2.5 text-xs text-muted">
          {summary}
          {!invalid && field === "dueDate" && (range.from || range.to) ? " Tasks without a due date are left out." : ""}
          {!invalid && " Rows are sorted by date."}
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="submit" disabled={busy || invalid} className={primaryButtonClass}>
            {busy ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
