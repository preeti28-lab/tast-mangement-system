import type { Task } from "./api";

export function formatDate(value?: string) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Due dates are picked as calendar days in the user's local timezone and stored
// as the end of that day, so a task due "today" only becomes overdue after midnight.
const pad = (n: number) => String(n).padStart(2, "0");

/** ISO timestamp -> "YYYY-MM-DD" in local time (for <input type="date">). */
export function toDateInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayInput() {
  return toDateInput(new Date().toISOString());
}

/** "YYYY-MM-DD" -> ISO timestamp at the start or end of that local day. */
export function dateInputToIso(value: string, edge: "start" | "end") {
  const [y, m, d] = value.split("-").map(Number);
  const date =
    edge === "start" ? new Date(y, m - 1, d, 0, 0, 0, 0) : new Date(y, m - 1, d, 23, 59, 59, 999);
  return date.toISOString();
}

export function isOverdue(task: Pick<Task, "dueDate" | "status">) {
  return !!task.dueDate && task.status !== "completed" && new Date(task.dueDate) < new Date();
}

export function timeAgo(value: string) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (seconds >= size) return rtf.format(-Math.floor(seconds / size), unit);
  }
  return "just now";
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** "17 Oct 2026, 2:30 pm" — for tables where both date and time matter. */
export function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
