import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { SectionHeader, cardClass } from "@/components/ui/Surface";
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
    <section className={`p-5 ${cardClass}`}>
      <SectionHeader
        icon={Icon}
        tone={tone}
        title={title}
        subtitle={subtitle}
        action={
          <Link
            href={viewAllHref}
            className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
            View all
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />

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
