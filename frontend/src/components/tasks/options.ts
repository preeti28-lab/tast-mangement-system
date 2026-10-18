import type { TaskPriority, TaskRecurrence, TaskSort, TaskStatus, TaskView } from "@/lib/api";

export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const VIEW_OPTIONS: { value: TaskView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "assigned", label: "Assigned to me" },
  { value: "created", label: "Created by me" },
  { value: "overdue", label: "Overdue" },
  { value: "team", label: "All team tasks" },
];

export const RECURRENCE_OPTIONS: { value: TaskRecurrence; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export const SORT_OPTIONS: { value: TaskSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "due_asc", label: "Due date (soonest)" },
  { value: "due_desc", label: "Due date (latest)" },
  { value: "updated", label: "Recently updated" },
];

export const selectClass =
  "rounded-xl border border-slate-200 bg-surface px-3.5 py-2.5 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:text-fg";
