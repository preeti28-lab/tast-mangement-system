"use client";

import { useEffect, useState } from "react";
import FormAlert from "@/components/auth/FormAlert";
import { BarList, DataTable, Legend, LineChart } from "@/components/analytics/charts";
import { Spinner } from "@/components/layout/AppShell";
import { useTasksChanged } from "@/lib/taskEvents";
import { useUser } from "@/components/layout/UserContext";
import { analyticsApi, type Analytics } from "@/lib/api";
import { initials } from "@/lib/format";
import { isStaff } from "@/lib/permissions";

type Scope = "me" | "team";

const weekLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-semibold text-zinc-900 dark:text-white">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export default function AnalyticsView() {
  const { user } = useUser();
  const staff = isStaff(user);
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Analytics</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {scope === "team" ? "Everyone's tasks across the team." : "Tasks you created or are assigned to."}
          </p>
        </div>
        {staff && (
          <div role="tablist" aria-label="Analytics scope" className="flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/60">
            {(["team", "me"] as Scope[]).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={scope === s}
                onClick={() => setScope(s)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  scope === s
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
                }`}
              >
                {s === "team" ? "Team" : "Just me"}
              </button>
            ))}
          </div>
        )}
      </div>

      {result?.error ? (
        <FormAlert message={result.error} />
      ) : !data ? (
        <Spinner />
      ) : (
        <div className={`space-y-6 transition-opacity ${result?.key !== key ? "opacity-60" : ""}`}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Completion rate"
              value={`${data.summary.completionRate}%`}
              hint={`${data.summary.completed} of ${data.summary.total} tasks completed`}
            />
            <Stat
              label="Completed on time"
              value={`${data.summary.onTimeRate}%`}
              hint="Of completed tasks that had a due date"
            />
            <Stat
              label="Avg. time to complete"
              value={
                data.summary.avgCompletionDays === null
                  ? "—"
                  : data.summary.avgCompletionDays < 1
                    ? "<1d"
                    : `${data.summary.avgCompletionDays}d`
              }
              hint="From creation to completion"
            />
            <Stat label="Overdue now" value={String(data.summary.overdue)} hint={`${data.summary.open} open tasks`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Created vs. completed" subtitle="Tasks per week, last 8 weeks">
              <Legend
                series={[
                  { key: "created", label: "Created", color: "var(--series-1)" },
                  { key: "completed", label: "Completed", color: "var(--series-2)" },
                ]}
              />
              <LineChart
                ariaLabel="Tasks created and completed per week"
                labels={data.trend.map((t) => weekLabel(t.weekStart))}
                series={[
                  { key: "created", label: "Created", color: "var(--series-1)", values: data.trend.map((t) => t.created) },
                  { key: "completed", label: "Completed", color: "var(--series-2)", values: data.trend.map((t) => t.completed) },
                ]}
              />
              <DataTable
                columns={["Week of", "Created", "Completed"]}
                rows={data.trend.map((t) => [weekLabel(t.weekStart), t.created, t.completed])}
              />
            </Card>

            <Card title="Overdue trend" subtitle="Open tasks past their due date at the end of each week">
              <LineChart
                ariaLabel="Overdue tasks at the end of each week"
                labels={data.trend.map((t) => weekLabel(t.weekStart))}
                series={[{ key: "overdue", label: "Overdue", color: "var(--series-1)", values: data.trend.map((t) => t.overdue) }]}
              />
              <DataTable
                columns={["Week of", "Overdue"]}
                rows={data.trend.map((t) => [weekLabel(t.weekStart), t.overdue])}
              />
            </Card>

            <Card title="By status">
              <BarList
                items={[
                  { label: "To do", value: data.byStatus.todo },
                  { label: "In progress", value: data.byStatus.in_progress },
                  { label: "Completed", value: data.byStatus.completed },
                ]}
              />
            </Card>

            <Card title="By priority">
              <BarList
                items={[
                  { label: "High", value: data.byPriority.high },
                  { label: "Medium", value: data.byPriority.medium },
                  { label: "Low", value: data.byPriority.low },
                ]}
              />
            </Card>
          </div>

          {scope === "team" && (
            <Card title="Completed tasks per user" subtitle="Based on tasks assigned to each person">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="pb-2 font-semibold">Member</th>
                      <th className="pb-2 pl-4 text-right font-semibold">Assigned</th>
                      <th className="pb-2 pl-4 text-right font-semibold">Completed</th>
                      <th className="pb-2 pl-4 text-right font-semibold">Overdue</th>
                      <th className="w-48 pb-2 pl-6 font-semibold">Completion rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {data.perUser.map((row) => (
                      <tr key={row.user._id}>
                        <td className="py-2.5">
                          <span className="flex items-center gap-2">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                              {initials(row.user.name)}
                            </span>
                            <span className="truncate text-zinc-900 dark:text-zinc-100">{row.user.name}</span>
                          </span>
                        </td>
                        <td className="py-2.5 pl-4 text-right tabular-nums">{row.assigned}</td>
                        <td className="py-2.5 pl-4 text-right tabular-nums">{row.completed}</td>
                        <td className="py-2.5 pl-4 text-right tabular-nums">{row.overdue}</td>
                        <td className="py-2.5 pl-6">
                          <span className="flex items-center gap-2">
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                              <span
                                className="block h-full rounded-full"
                                style={{ width: `${row.completionRate}%`, background: "var(--series-1)" }}
                              />
                            </span>
                            <span className="w-12 text-right text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
                              {row.completionRate}%
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
