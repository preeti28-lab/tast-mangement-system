"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import TaskListCard from "@/components/dashboard/TaskListCard";
import FocusDeck from "@/components/dashboard/FocusDeck";
import FormAlert from "@/components/auth/FormAlert";
import WireframeTerrain3D from "@/components/ui/WireframeTerrain3D";
import {
  CheckCircleIcon,
  ClockIcon,
  DocumentIcon,
  PencilIcon,
  PlusIcon,
  UserIcon,
} from "@/components/icons";
import { Spinner } from "@/components/layout/AppShell";
import { useUser } from "@/components/layout/UserContext";
import { useTasksChanged } from "@/lib/taskEvents";
import { dashboardApi, type DashboardData } from "@/lib/api";

export default function DashboardView() {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  // Refresh the numbers when a new notification arrives or offline changes sync.
  useTasksChanged(() => setRefresh((n) => n + 1));

  useEffect(() => {
    dashboardApi
      .get()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [refresh]);

  const firstName = user.name.split(" ")[0];

  /** Back-of-card copy: a big share-of-total figure plus a one-line nudge. */
  const share = (count: number, text: string) => {
    const total = data?.stats.total ?? 0;
    const pct = total ? Math.round((count / total) * 100) : 0;
    return (
      <>
        <span className="block text-3xl font-bold leading-none tracking-tight tabular-nums text-white">
          {pct}%
        </span>
        <span className="mt-1.5 block">
          of {total} task{total === 1 ? "" : "s"} &middot; {text}
        </span>
      </>
    );
  };

  return (
    <div className="w-full space-y-7">
      <WireframeTerrain3D className="min-h-56 sm:min-h-64">
        <div className="flex h-full min-h-56 flex-col justify-end gap-5 bg-gradient-to-r from-white/85 via-white/40 to-transparent p-6 sm:min-h-64 sm:flex-row sm:items-end sm:justify-between sm:p-8 dark:from-zinc-950/85 dark:via-zinc-950/40">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              Hello, {firstName}{" "}
              <span
                role="img"
                aria-label="waving hand"
                className="inline-block origin-[70%_70%] motion-safe:animate-[wave_1.8s_ease-in-out_1]"
              >
                👋
              </span>
            </h2>
            <p className="mt-2 text-base text-zinc-500 sm:text-lg dark:text-zinc-400">
              Here&apos;s what&apos;s happening with your tasks today.
            </p>
          </div>
          <Link
            href="/tasks?new=1"
            className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/35"
          >
            <PlusIcon className="h-5 w-5" />
            New task
          </Link>
        </div>
      </WireframeTerrain3D>

      {error ? (
        <FormAlert message={error} />
      ) : !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Assigned to me"
              value={data.stats.assignedToMe}
              href="/tasks?view=assigned"
              icon={UserIcon}
              tone="indigo"
              back={share(data.stats.assignedToMe, "on your plate right now.")}
              backLinkLabel="Open my tasks"
            />
            <StatCard
              label="Created by me"
              value={data.stats.createdByMe}
              href="/tasks?view=created"
              icon={PencilIcon}
              tone="sky"
              back={share(
                data.stats.createdByMe,
                "that you created and handed out.",
              )}
              backLinkLabel="See tasks I created"
            />
            <StatCard
              label="Overdue"
              value={data.stats.overdue}
              href="/tasks?view=overdue"
              icon={ClockIcon}
              tone="red"
              back={share(
                data.stats.overdue,
                data.stats.overdue
                  ? "are past due — tackle these first."
                  : "overdue. You are all caught up!",
              )}
              backLinkLabel="Review overdue"
            />
            <StatCard
              label="Completed"
              value={data.stats.completed}
              href="/tasks?status=completed"
              icon={CheckCircleIcon}
              tone="emerald"
              back={share(data.stats.completed, "done and dusted. Keep it up!")}
              backLinkLabel="See completed"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            <div>
              <TaskListCard
                title="Recent tasks"
                subtitle="Your most recent task activity."
                icon={DocumentIcon}
                tone="indigo"
                tasks={data.recentTasks}
                emptyText="No tasks yet. Create your first task to get started."
                viewAllHref="/tasks"
                currentUserId={user._id}
              />
            </div>
            <div>
              <TaskListCard
                title="Overdue tasks"
                subtitle="Tasks that need your attention."
                icon={ClockIcon}
                tone="red"
                tasks={data.overdueTasks}
                emptyText="Nothing overdue. Nice work!"
                viewAllHref="/tasks?view=overdue"
                currentUserId={user._id}
              />
            </div>
            <div className="lg:col-span-2 2xl:col-span-1">
              <FocusDeck currentUserId={user._id} />
            </div>
          </div>

        </>
      )}
    </div>
  );
}
