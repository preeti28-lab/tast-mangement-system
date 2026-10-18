"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import TaskListCard from "@/components/dashboard/TaskListCard";
import FormAlert from "@/components/auth/FormAlert";
import { CheckCircleIcon, ClockIcon, InboxIcon, PencilIcon, PlusIcon } from "@/components/icons";
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Hello, {firstName}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Here&apos;s what&apos;s happening with your tasks today.
          </p>
        </div>
        <Link
          href="/tasks?new=1"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <PlusIcon className="h-4 w-4" />
          New task
        </Link>
      </div>

      {error ? (
        <FormAlert message={error} />
      ) : !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Assigned to me"
              value={data.stats.assignedToMe}
              href="/tasks?view=assigned"
              icon={InboxIcon}
              tone="indigo"
            />
            <StatCard
              label="Created by me"
              value={data.stats.createdByMe}
              href="/tasks?view=created"
              icon={PencilIcon}
              tone="sky"
            />
            <StatCard
              label="Overdue"
              value={data.stats.overdue}
              href="/tasks?view=overdue"
              icon={ClockIcon}
              tone="red"
            />
            <StatCard
              label="Completed"
              value={data.stats.completed}
              href="/tasks?status=completed"
              icon={CheckCircleIcon}
              tone="emerald"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <TaskListCard
                title="Recent tasks"
                tasks={data.recentTasks}
                emptyText="No tasks yet. Create your first task to get started."
                viewAllHref="/tasks"
                currentUserId={user._id}
              />
            </div>
            <div className="xl:col-span-2">
              <TaskListCard
                title="Overdue tasks"
                tasks={data.overdueTasks}
                emptyText="Nothing overdue. Nice work!"
                viewAllHref="/tasks?view=overdue"
                currentUserId={user._id}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
