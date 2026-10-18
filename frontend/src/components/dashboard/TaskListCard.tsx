import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { ArrowRightIcon } from "@/components/icons";
import type { Task } from "@/lib/api";
import { formatDate, isOverdue } from "@/lib/format";
import { PriorityBadge, StatusBadge } from "@/components/tasks/TaskBadges";

type Props = {
  title: string;
  subtitle: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: "indigo" | "red";
  tasks: Task[];
  emptyText: string;
  viewAllHref: string;
  currentUserId: string;
};

const ICON_TONES = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400",
  red: "bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-400",
};

export default function TaskListCard({
  title,
  subtitle,
  icon: Icon,
  tone,
  tasks,
  emptyText,
  viewAllHref,
  currentUserId,
}: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(79,70,229,0.18)] dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${ICON_TONES[tone]}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold text-zinc-900 dark:text-white">{title}</h2>
          <p className="text-sm text-zinc-500 sm:truncate dark:text-zinc-400">{subtitle}</p>
        </div>
        <Link
          href={viewAllHref}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          View all
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </header>

      {tasks.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-zinc-200 px-5 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          {emptyText}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {tasks.map((task) => {
            const overdue = isOverdue(task);
            const assignee = task.assignedTo
              ? task.assignedTo._id === currentUserId
                ? "You"
                : task.assignedTo.name
              : "Unassigned";
            return (
              <li
                key={task._id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 px-4 py-3.5 transition hover:border-indigo-200 hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:gap-4 dark:border-zinc-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/tasks?task=${task._id}`}
                    className="block truncate font-semibold text-zinc-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400"
                  >
                    {task.title}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-500">
                    Assignee: {assignee}
                    <span className="mx-1.5">&middot;</span>
                    <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
                      {overdue ? "Overdue: " : "Due: "}
                      {formatDate(task.dueDate)}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
