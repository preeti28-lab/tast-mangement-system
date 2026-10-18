import Link from "next/link";
import { ArrowRightIcon, ClockIcon } from "@/components/icons";
import { SectionHeader, cardClass } from "@/components/ui/Surface";
import type { Task } from "@/lib/api";
import { EmptyNote } from "@/components/ui/Tile";

const PRIORITY_DOT: Record<Task["priority"], string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

function dueIn(iso: string) {
  const days = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  if (days <= 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

/** Next 7 days of deadlines as a timeline: a calendar chip, title, priority dot and "due in". */
export default function UpcomingDeadlines({ tasks }: { tasks: Task[] }) {
  return (
    <section className={`flex h-full flex-col p-5 ${cardClass}`}>
      <SectionHeader
        icon={ClockIcon}
        tone="amber"
        title="Upcoming deadlines"
        subtitle="Due in the next 7 days."
        action={
          <Link href="/tasks" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
            View all <ArrowRightIcon className="h-4 w-4" />
          </Link>
        }
      />
      {tasks.length === 0 ? (
        <EmptyNote className="mt-5 grid flex-1 place-items-center">Nothing due this week. Enjoy the breathing room.</EmptyNote>
      ) : (
        <ol className="relative mt-5 space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[1.4rem] before:w-px before:bg-line">
          {tasks.map((task) => {
            const due = new Date(task.dueDate as string);
            const soon = dueIn(task.dueDate as string);
            const urgent = soon === "Due today" || soon === "Due tomorrow";
            return (
              <li key={task._id}>
                <Link
                  href={`/tasks?task=${task._id}`}
                  className="group relative flex items-center gap-3 rounded-xl p-1.5 pr-3 transition-colors hover:bg-hover"
                >
                  <span
                    className={`relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-center leading-none ring-4 ring-surface ${
                      urgent ? "bg-amber-500 text-white" : "bg-brand-50 text-brand-700 dark:bg-brand-400/10 dark:text-brand-300"
                    }`}
                  >
                    <span>
                      <span className="block text-base font-bold">{due.getDate()}</span>
                      <span className="block text-[9px] font-semibold uppercase tracking-wide opacity-80">
                        {due.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg group-hover:text-brand-700 dark:group-hover:text-brand-300">
                      {task.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} aria-hidden="true" />
                      <span className="capitalize">{task.priority}</span>
                      <span aria-hidden="true">·</span>
                      <span className={urgent ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>{soon}</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
