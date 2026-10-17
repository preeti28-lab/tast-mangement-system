import Link from "next/link";
import type { Task } from "@/lib/api";
import { formatDate, isOverdue } from "@/lib/format";
import { PriorityBadge, StatusBadge } from "@/components/tasks/TaskBadges";

type Props = {
  title: string;
  tasks: Task[];
  emptyText: string;
  viewAllHref: string;
  currentUserId: string;
};

export default function TaskListCard({ title, tasks, emptyText, viewAllHref, currentUserId }: Props) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="font-semibold text-zinc-900 dark:text-white">{title}</h2>
        <Link href={viewAllHref} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          View all
        </Link>
      </header>

      {tasks.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-500">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {tasks.map((task) => {
            const overdue = isOverdue(task);
            const assignee = task.assignedTo
              ? task.assignedTo._id === currentUserId
                ? "You"
                : task.assignedTo.name
              : "Unassigned";
            return (
              <li key={task._id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/tasks?task=${task._id}`}
                    className="block truncate font-medium text-zinc-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400"
                  >
                    {task.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Assignee: {assignee}
                    <span className="mx-1.5">&middot;</span>
                    <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
                      {overdue ? "Overdue: " : "Due: "}
                      {formatDate(task.dueDate)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
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
