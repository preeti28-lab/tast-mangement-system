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
  ListIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  UserIcon,
} from "@/components/icons";
import { SectionHeader, cardClass, SectionCard } from "@/components/ui/Surface";
import { useUser } from "@/components/layout/UserContext";
import { useTasksChanged } from "@/lib/taskEvents";
import { dashboardApi, type DashboardData, type TaskPriority } from "@/lib/api";
import { can } from "@/lib/permissions";
import { CardsSkeleton } from "@/components/ui/Loader";

const STATUS_COLORS = { todo: "#94a3b8", in_progress: "#0ea5e9", completed: SERIES_COLORS.completed };

const PRIORITY_ROWS: { key: TaskPriority; label: string; bar: string }[] = [
  { key: "high", label: "High", bar: "bg-red-500" },
  { key: "medium", label: "Medium", bar: "bg-amber-400" },
  { key: "low", label: "Low", bar: "bg-emerald-400" },
];

/** Horizontal bars for the priority mix; each links to the filtered task list. */
function PriorityBars({ counts }: { counts: Record<TaskPriority, number> }) {
  const total = PRIORITY_ROWS.reduce((n, r) => n + counts[r.key], 0);
  return (
    <ul className="space-y-3">
      {PRIORITY_ROWS.map((r) => {
        const n = counts[r.key];
        const share = total ? Math.round((n / total) * 100) : 0;
        return (
          <li key={r.key}>
            <Link href={`/tasks?priority=${r.key}`} className="group block rounded-lg">
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 font-medium text-fg group-hover:text-brand-700 dark:group-hover:text-brand-300">
                  <span className={`h-2 w-2 rounded-full ${r.bar}`} aria-hidden="true" />
                  {r.label}
                </span>
                <span className="tabular-nums text-muted">
                  <span className="font-semibold text-fg">{n}</span> · {share}%
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-hover">
                <div className={`h-full rounded-full ${r.bar} transition-[width] duration-700 ease-out`} style={{ width: `${share}%` }} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

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
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  const weekLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const trend = data?.trend ?? [];
  const created = trend.map((t) => t.created);
  const completedWeekly = trend.map((t) => t.completed);
  const thisWeek = trend.at(-1);
  const lastWeek = trend.at(-2);
  const stats = data?.stats;
  const completionRate = stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const inProgress = data?.byStatus?.in_progress ?? 0;
  const todo = data?.byStatus?.todo ?? 0;
  const dueSoon = stats?.dueSoon ?? data?.upcomingTasks?.length ?? 0;
  const activity = [
    { key: "created", label: "Created", color: SERIES_COLORS.created, values: created },
    { key: "completed", label: "Completed", color: SERIES_COLORS.completed, values: completedWeekly },
  ];

  // One-line summary of what needs attention, shown under the greeting.
  const summary = !stats
    ? "Here's what's happening with your tasks today."
    : stats.total === 0
      ? "No tasks yet. Create your first one to get started."
      : [
          stats.overdue ? `${stats.overdue} overdue` : null,
          dueSoon ? `${dueSoon} due in the next 7 days` : null,
          inProgress ? `${inProgress} in progress` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "You're all caught up. Nice work!";

  return (
    <div className="w-full space-y-6">
      <WireframeTerrain3D className="min-h-44">
        <div className="flex h-full min-h-44 flex-col justify-end gap-4 bg-gradient-to-r from-app/90 via-app/50 to-transparent p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">{today}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              Hello, {firstName}{" "}
              <span
                role="img"
                aria-label="waving hand"
                className="inline-block origin-[70%_70%] motion-safe:animate-[wave_1.8s_ease-in-out_1]"
              >
                👋
              </span>
            </h2>
            <p className="mt-1.5 text-sm text-muted sm:text-base">{summary}</p>
          </div>
          <Link
            href="/tasks?new=1"
            className="btn-3d btn-3d-brand pointer-events-auto inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <PlusIcon className="h-5 w-5" />
            New task
          </Link>
        </div>
      </WireframeTerrain3D>

      {error ? (
        <FormAlert message={error} />
      ) : !data || !stats ? (
        <CardsSkeleton />
      ) : (
        <>
          {/* Key numbers: 2 per row on tablets, 3 on laptops, all 6 in one row on wide screens */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
            <KpiTile
              href="/tasks"
              icon={ListIcon}
              tone="violet"
              label="Total tasks"
              value={stats.total}
              hint={`${completionRate}% completed`}
              meter={completionRate}
              meterColor={SERIES_COLORS.completed}
            />
            <KpiTile
              href="/tasks?view=assigned"
              icon={UserIcon}
              tone="brand"
              label="Assigned to me"
              value={stats.assignedToMe}
              hint="On your plate right now"
              trend={created.length ? created : undefined}
              trendColor={SERIES_COLORS.created}
            />
            <KpiTile
              href="/tasks?view=created"
              icon={PencilIcon}
              tone="sky"
              label="Created by me"
              value={stats.createdByMe}
              hint="Tasks you've set up"
            />
            <KpiTile
              href="/tasks?status=in_progress"
              icon={PlayIcon}
              tone="amber"
              label="In progress"
              value={inProgress}
              hint={`${todo} still to do`}
              meter={stats.total ? (inProgress / stats.total) * 100 : 0}
              meterColor={STATUS_COLORS.in_progress}
            />
            <KpiTile
              href="/tasks?view=overdue"
              icon={ClockIcon}
              tone="red"
              label="Overdue"
              value={stats.overdue}
              hint={stats.overdue ? "Past due, tackle these first" : "All caught up"}
              meter={stats.total ? (stats.overdue / stats.total) * 100 : 0}
              meterColor={SERIES_COLORS.overdue}
            />
            <KpiTile
              href="/tasks?status=completed"
              icon={CheckCircleIcon}
              tone="emerald"
              label="Completed"
              value={stats.completed}
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
              <section className={`flex min-w-0 flex-col p-5 sm:p-6 xl:col-span-2 ${cardClass}`}>
                <SectionHeader
                  icon={ChartIcon}
                  tone="brand"
                  title="My activity"
                  subtitle="Tasks created vs. completed per week"
                  action={<ChartLegend series={activity} />}
                />
                <div className="mt-5 flex-1">
                  <AreaChart ariaLabel="Your tasks created and completed per week" labels={trend.map((t) => weekLabel(t.weekStart))} series={activity} height={280} />
                </div>
              </section>
              <SectionCard className="flex min-w-0 flex-col" icon={CheckCircleIcon} tone="emerald" title="Task breakdown" subtitle="By status and priority">
                <div className="mt-5">
                  <DonutChart
                    ariaLabel="Your tasks by status"
                    centerLabel="your tasks"
                    slices={[
                      { key: "todo", label: "To do", value: data.byStatus.todo, color: STATUS_COLORS.todo },
                      { key: "in_progress", label: "In progress", value: data.byStatus.in_progress, color: STATUS_COLORS.in_progress },
                      { key: "completed", label: "Completed", value: data.byStatus.completed, color: STATUS_COLORS.completed },
                    ]}
                  />
                </div>
                {data.byPriority && (
                  <div className="mt-6 border-t border-line pt-5">
                    <p className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">Priority</p>
                    <PriorityBars counts={data.byPriority} />
                  </div>
                )}
              </SectionCard>
            </div>
          )}

          {/* What needs doing next: deadlines beside the to-do deck, same height */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <UpcomingDeadlines tasks={data.upcomingTasks ?? []} />
            </div>
            <div className="min-w-0">
              <FocusDeck currentUserId={user._id} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
          </div>

          {data.topPerformers && (
            <TopPerformerCard rows={data.topPerformers} currentUserId={user._id} showAnalyticsLink={can(user, "analytics.team")} />
          )}
        </>
      )}
    </div>
  );
}
