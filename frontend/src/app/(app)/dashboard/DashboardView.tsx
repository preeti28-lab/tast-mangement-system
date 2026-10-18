"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import KpiTile from "@/components/analytics/KpiTile";
import { AreaChart, ChartLegend, DonutChart, SERIES_COLORS } from "@/components/analytics/premium-charts";
import UpcomingDeadlines from "@/components/dashboard/UpcomingDeadlines";
import TaskListCard from "@/components/dashboard/TaskListCard";
import FocusDeck from "@/components/dashboard/FocusDeck";
import TopPerformerCard from "@/components/dashboard/TopPerformerCard";
import FormAlert from "@/components/auth/FormAlert";
import WireframeTerrain3D from "@/components/ui/WireframeTerrain3D";
import {
  ChartIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentIcon,
  PencilIcon,
  PlusIcon,
  UserIcon,
} from "@/components/icons";
import { SectionHeader, cardClass } from "@/components/ui/Surface";
import { Spinner } from "@/components/layout/AppShell";
import { useUser } from "@/components/layout/UserContext";
import { useTasksChanged } from "@/lib/taskEvents";
import { dashboardApi, type DashboardData } from "@/lib/api";
import { isStaff } from "@/lib/permissions";

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

  const weekLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const trend = data?.trend ?? [];
  const created = trend.map((t) => t.created);
  const completedWeekly = trend.map((t) => t.completed);
  const thisWeek = trend.at(-1);
  const lastWeek = trend.at(-2);
  const completionRate = data?.stats.total ? Math.round((data.stats.completed / data.stats.total) * 100) : 0;
  const activity = [
    { key: "created", label: "Created", color: SERIES_COLORS.created, values: created },
    { key: "completed", label: "Completed", color: SERIES_COLORS.completed, values: completedWeekly },
  ];

  return (
    <div className="w-full space-y-7">
      <WireframeTerrain3D className="min-h-56 sm:min-h-64">
        <div className="flex h-full min-h-56 flex-col justify-end gap-5 bg-gradient-to-r from-app/85 via-app/40 to-transparent p-6 sm:min-h-64 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
              Hello, {firstName}{" "}
              <span
                role="img"
                aria-label="waving hand"
                className="inline-block origin-[70%_70%] motion-safe:animate-[wave_1.8s_ease-in-out_1]"
              >
                👋
              </span>
            </h2>
            <p className="mt-2 text-base text-muted sm:text-lg">
              Here&apos;s what&apos;s happening with your tasks today.
            </p>
          </div>
          <Link
            href="/tasks?new=1"
            className="btn-3d btn-3d-brand pointer-events-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700"
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              href="/tasks?view=assigned"
              icon={UserIcon}
              tone="brand"
              label="Assigned to me"
              value={data.stats.assignedToMe}
              hint="On your plate right now"
              trend={created.length ? created : undefined}
              trendColor={SERIES_COLORS.created}
            />
            <KpiTile
              href="/tasks?view=created"
              icon={PencilIcon}
              tone="sky"
              label="Created by me"
              value={data.stats.createdByMe}
              hint={`${data.stats.total} tasks you're involved in`}
            />
            <KpiTile
              href="/tasks?view=overdue"
              icon={ClockIcon}
              tone="red"
              label="Overdue"
              value={data.stats.overdue}
              hint={data.stats.overdue ? "Past due, tackle these first" : "All caught up"}
              meter={data.stats.total ? (data.stats.overdue / data.stats.total) * 100 : 0}
              meterColor={SERIES_COLORS.overdue}
            />
            <KpiTile
              href="/tasks?status=completed"
              icon={CheckCircleIcon}
              tone="emerald"
              label="Completed"
              value={data.stats.completed}
              hint={`${completionRate}% of your tasks`}
              trend={completedWeekly.length ? completedWeekly : undefined}
              trendColor={SERIES_COLORS.completed}
              delta={
                thisWeek && lastWeek
                  ? { value: thisWeek.completed - lastWeek.completed, label: "vs last wk", upIsGood: true }
                  : undefined
              }
            />
          </div>

          {trend.length > 0 && data.byStatus && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <section className={`min-w-0 p-5 sm:p-6 xl:col-span-2 ${cardClass}`}>
                <SectionHeader
                  icon={ChartIcon}
                  tone="brand"
                  title="My activity"
                  subtitle="Tasks created vs. completed per week"
                  action={<ChartLegend series={activity} />}
                />
                <div className="mt-5">
                  <AreaChart ariaLabel="Your tasks created and completed per week" labels={trend.map((t) => weekLabel(t.weekStart))} series={activity} height={250} />
                </div>
              </section>
              <section className={`min-w-0 p-5 sm:p-6 ${cardClass}`}>
                <SectionHeader icon={CheckCircleIcon} tone="emerald" title="My status mix" subtitle="Where your tasks stand" />
                <div className="mt-6">
                  <DonutChart
                    ariaLabel="Your tasks by status"
                    centerLabel="your tasks"
                    slices={[
                      { key: "todo", label: "To do", value: data.byStatus.todo, color: "#94a3b8" },
                      { key: "in_progress", label: "In progress", value: data.byStatus.in_progress, color: "#0ea5e9" },
                      { key: "completed", label: "Completed", value: data.byStatus.completed, color: SERIES_COLORS.completed },
                    ]}
                  />
                </div>
              </section>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            <div className="min-w-0">
              <TaskListCard
                title="Recent tasks"
                subtitle="Your most recent task activity."
                icon={DocumentIcon}
                tone="brand"
                tasks={data.recentTasks}
                emptyText="No tasks yet. Create your first task to get started."
                viewAllHref="/tasks"
                currentUserId={user._id}
              />
            </div>
            <div className="min-w-0">
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
            <div className="min-w-0 lg:col-span-2 2xl:col-span-1">
              <UpcomingDeadlines tasks={data.upcomingTasks ?? []} />
            </div>
          </div>

          <FocusDeck currentUserId={user._id} />

          {data.topPerformers && (
            <TopPerformerCard rows={data.topPerformers} currentUserId={user._id} showAnalyticsLink={isStaff(user)} />
          )}
        </>
      )}
    </div>
  );
}
