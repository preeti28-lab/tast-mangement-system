"use client";

import { useEffect, useState } from "react";
import FormAlert from "@/components/auth/FormAlert";
import { DataTable } from "@/components/analytics/charts";
import { AreaChart, ChartLegend, DonutChart, SERIES_COLORS } from "@/components/analytics/premium-charts";
import KpiTile from "@/components/analytics/KpiTile";
import TopPerformer from "@/components/analytics/TopPerformer";
import DataGrid from "@/components/ui/DataGrid";
import { teamReportColumns } from "@/components/team/TeamInsights";
import WeekComparison from "@/components/analytics/WeekComparison";
import TaskFunnel from "@/components/analytics/TaskFunnel";
import CompletionCohorts from "@/components/analytics/CompletionCohorts";
import BreakdownCard from "@/components/analytics/BreakdownCard";
import InsightsStrip from "@/components/analytics/InsightsStrip";
import NeonGrid3D from "@/components/ui/NeonGrid3D";
import { ActivityIcon, ChartIcon, CheckCircleIcon, ClockIcon, ListIcon } from "@/components/icons";
import { PageHeader, SectionCard, tabClass, tabListClass } from "@/components/ui/Surface";
import { useTasksChanged } from "@/lib/taskEvents";
import { useUser } from "@/components/layout/UserContext";
import { analyticsApi, type Analytics } from "@/lib/api";
import { can } from "@/lib/permissions";
import { CardsSkeleton } from "@/components/ui/Loader";

type Scope = "me" | "team";

const weekLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

export default function AnalyticsView() {
  const { user } = useUser();
  const staff = can(user, "analytics.team");
  const [scope, setScope] = useState<Scope>(staff ? "team" : "me");
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Analytics; error?: string } | null>(null);
  useTasksChanged(() => setRefresh((n) => n + 1));

  const key = `${scope}#${refresh}`;
  useEffect(() => {
    let cancelled = false;
    analyticsApi
      .get(scope)
      .then((data) => !cancelled && setResult({ key, data }))
      .catch((err: Error) => !cancelled && setResult({ key, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [key, scope]);

  const data = result?.data;
  const labels = data ? data.trend.map((t) => weekLabel(t.weekStart)) : [];
  const throughput = data
    ? [
        { key: "created", label: "Created", color: SERIES_COLORS.created, values: data.trend.map((t) => t.created) },
        { key: "completed", label: "Completed", color: SERIES_COLORS.completed, values: data.trend.map((t) => t.completed) },
      ]
    : [];
  const thisWeek = data?.trend.at(-1) ?? { completed: 0, overdue: 0 };
  const lastWeek = data?.trend.at(-2) ?? { completed: 0, overdue: 0 };
  const avgDays =
    data?.summary.avgCompletionDays == null ? "—" : data.summary.avgCompletionDays < 1 ? "<1d" : `${data.summary.avgCompletionDays}d`;

  return (
    <div className="w-full space-y-6">
      <NeonGrid3D className="min-h-44 sm:min-h-48">
        <div className="flex h-full min-h-44 items-end gap-8 bg-gradient-to-r from-app/85 via-app/40 to-transparent p-6 sm:min-h-48 sm:p-8">
          <div className="min-w-0 flex-1">
            <PageHeader
              title="Analytics"
              subtitle={scope === "team" ? "Everyone's tasks across the team." : "Tasks you created or are assigned to."}
              actions={
                staff && (
                  <div role="tablist" aria-label="Analytics scope" className={`pointer-events-auto ${tabListClass}`}>
                    {(["team", "me"] as Scope[]).map((s) => (
                      <button
                        key={s}
                        role="tab"
                        aria-selected={scope === s}
                        onClick={() => setScope(s)}
                        className={tabClass(scope === s)}
                      >
                        {s === "team" ? "Team" : "Just me"}
                      </button>
                    ))}
                  </div>
                )
              }
            />
          </div>
        </div>
      </NeonGrid3D>

      {result?.error ? (
        <FormAlert message={result.error} />
      ) : !data ? (
        <CardsSkeleton />
      ) : (
        <div className={`space-y-6 transition-opacity ${result?.key !== key ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
            <KpiTile
              icon={ChartIcon}
              tone="brand"
              label="Completion rate"
              value={`${data.summary.completionRate}%`}
              hint={`${data.summary.completed} of ${data.summary.total} tasks completed`}
              meter={data.summary.completionRate}
              meterColor={SERIES_COLORS.completed}
            />
            <KpiTile
              icon={CheckCircleIcon}
              tone="emerald"
              label="Completed on time"
              value={`${data.summary.onTimeRate}%`}
              hint="Of completed tasks with a due date"
              meter={data.summary.onTimeRate}
              meterColor="#10b981"
            />
            <KpiTile
              icon={ActivityIcon}
              tone="sky"
              label="Completed per week"
              value={thisWeek.completed}
              hint={`Avg. ${avgDays} from creation to done`}
              trend={data.trend.map((t) => t.completed)}
              trendColor={SERIES_COLORS.completed}
              delta={{ value: thisWeek.completed - lastWeek.completed, label: "vs last wk", upIsGood: true }}
            />
            <KpiTile
              icon={ClockIcon}
              tone="red"
              label="Overdue now"
              value={data.summary.overdue}
              hint={`${data.summary.open} open tasks`}
              trend={data.trend.map((t) => t.overdue)}
              trendColor={SERIES_COLORS.overdue}
              delta={{ value: thisWeek.overdue - lastWeek.overdue, label: "vs last wk", upIsGood: false }}
            />
          </div>

          <InsightsStrip data={data} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <SectionCard bodyClassName="mt-5"
              icon={ChartIcon}
              tone="brand"
              title="Throughput"
              subtitle="Tasks created vs. completed per week, last 8 weeks"
              className="xl:col-span-2"
              action={<ChartLegend series={throughput} />}
            >
              <AreaChart ariaLabel="Tasks created and completed per week" labels={labels} series={throughput} height={280} />
              <DataTable
                columns={["Week of", "Created", "Completed"]}
                rows={data.trend.map((t) => [weekLabel(t.weekStart), t.created, t.completed])}
              />
            </SectionCard>

            <SectionCard bodyClassName="mt-5" icon={CheckCircleIcon} tone="emerald" title="Status mix" subtitle="Where every task stands today">
              <DonutChart
                ariaLabel="Tasks by status"
                centerLabel="total tasks"
                slices={[
                  { key: "todo", label: "To do", value: data.byStatus.todo, color: "#94a3b8" },
                  { key: "in_progress", label: "In progress", value: data.byStatus.in_progress, color: "#0ea5e9" },
                  { key: "completed", label: "Completed", value: data.byStatus.completed, color: SERIES_COLORS.completed },
                ]}
              />
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <SectionCard bodyClassName="mt-5"
              icon={ClockIcon}
              tone="red"
              title="Overdue trend"
              subtitle="Open tasks past their due date at the end of each week"
              className="xl:col-span-2"
            >
              <AreaChart
                ariaLabel="Overdue tasks at the end of each week"
                labels={labels}
                series={[{ key: "overdue", label: "Overdue", color: SERIES_COLORS.overdue, values: data.trend.map((t) => t.overdue) }]}
                height={240}
              />
              <DataTable columns={["Week of", "Overdue"]} rows={data.trend.map((t) => [weekLabel(t.weekStart), t.overdue])} />
            </SectionCard>

            <BreakdownCard
              icon={ListIcon}
              tone="amber"
              title="By priority"
              subtitle="Where the effort is going"
              items={[
                { label: "High", value: data.byPriority.high, color: "bg-red-500 dark:bg-red-400" },
                { label: "Medium", value: data.byPriority.medium, color: "bg-amber-400 dark:bg-amber-300" },
                { label: "Low", value: data.byPriority.low, color: "bg-emerald-400 dark:bg-emerald-300" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <WeekComparison trend={data.trend} />
            <TaskFunnel data={data} />
          </div>

          {scope === "team" && <TopPerformer perUser={data.perUser} />}

          {data.cohorts && <CompletionCohorts cohorts={data.cohorts} />}

          {scope === "team" && (
            <DataGrid
              title="Completed tasks per user"
              subtitle="Based on tasks assigned to each person"
              columns={teamReportColumns}
              rows={data.perUser}
              rowKey={(row) => row.user._id}
              initialSort={{ key: "completed", dir: "desc" }}
              exportName="completed-per-user"
            />
          )}
        </div>
      )}
    </div>
  );
}
