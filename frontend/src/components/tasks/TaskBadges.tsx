import type { TaskPriority, TaskStatus } from "@/lib/api";

const STATUS_STYLES: Record<TaskStatus, { label: string; className: string }> = {
  todo: {
    label: "To do",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
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
  low: { label: "Low", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  medium: { label: "Medium", className: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300" },
  high: { label: "High", className: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300" },
};

const pill = "inline-flex items-center whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium leading-none";

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return <span className={`${pill} ${className}`}>{label}</span>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, className } = PRIORITY_STYLES[priority];
  return (
    <span className={`${pill} gap-1.5 ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
