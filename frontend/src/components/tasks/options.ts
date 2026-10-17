import type { TaskPriority, TaskSort, TaskStatus, TaskView } from "@/lib/api";

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
];

export const SORT_OPTIONS: { value: TaskSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "due_asc", label: "Due date (soonest)" },
  { value: "due_desc", label: "Due date (latest)" },
  { value: "updated", label: "Recently updated" },
];

export const selectClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
