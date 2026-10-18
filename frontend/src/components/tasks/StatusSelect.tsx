"use client";

import type { TaskStatus } from "@/lib/api";
import { STATUS_OPTIONS } from "./options";

const TONES: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

type Props = {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
};

// Inline status picker styled like the status badge.
export default function StatusSelect({ value, onChange, disabled }: Props) {
  return (
    <select
      aria-label="Change status"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      onClick={(e) => e.stopPropagation()}
      className={`cursor-pointer rounded-full border-0 py-0.5 pl-2.5 pr-7 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-wait disabled:opacity-60 ${TONES[value]}`}
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
