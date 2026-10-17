import type { TaskPriority, TaskStatus } from "@/lib/api";

const STATUS_STYLES: Record<TaskStatus, { label: string; className: string }> = {
  todo: {
    label: "To do",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  in_progress: {
    label: "In progress",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
};

const PRIORITY_STYLES: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "text-zinc-500 dark:text-zinc-400" },
  medium: { label: "Medium", className: "text-amber-600 dark:text-amber-400" },
  high: { label: "High", className: "text-red-600 dark:text-red-400" },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, className } = PRIORITY_STYLES[priority];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
