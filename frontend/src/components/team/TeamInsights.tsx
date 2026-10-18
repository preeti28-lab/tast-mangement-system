"use client";

import { useEffect, useState } from "react";
import { analyticsApi, type Analytics, type ApiError } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/permissions";
import { useTasksChanged } from "@/lib/taskEvents";
import DataGrid, { Highlight, type GridColumn } from "@/components/ui/DataGrid";
import WorkloadMap from "./WorkloadMap";
import Avatar from "@/components/ui/Avatar";

type Row = Analytics["perUser"][number];

const ROLE_PILL: Record<string, string> = {
  admin: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20",
  manager: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
  user: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-500/30",
};

const roleLabel = (row: Row) => (row.user.role ? ROLE_LABELS[row.user.role] : "Member");

/** Per-member columns, shared by the Team report and the Analytics per-user table. */
export const teamReportColumns: GridColumn<Row>[] = [
  {
    key: "name",
    label: "Member",
    value: (r) => r.user.name,
    sortable: true,
    searchable: true,
    render: (r, q) => (
      <span className="flex items-center gap-2.5">
        <Avatar name={r.user.name} size="xs" />
        <span className="font-medium text-fg">
          <Highlight text={r.user.name} query={q} />
        </span>
      </span>
    ),
  },
  { key: "email", label: "Email", value: (r) => r.user.email, sortable: true, searchable: true },
  {
    key: "role",
    label: "Role",
    value: roleLabel,
    sortable: true,
    searchable: true,
    filter: "select",
    filterDots: { Admin: "bg-violet-500", Manager: "bg-sky-500", Member: "bg-brand-500" },
    align: "center",
    render: (r) => (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset ${ROLE_PILL[r.user.role ?? "user"]}`}>
        {roleLabel(r)}
      </span>
    ),
  },
  { key: "assigned", label: "Assigned", value: (r) => r.assigned, sortable: true, align: "right" },
  { key: "open", label: "Open", value: (r) => r.assigned - r.completed, sortable: true, align: "right" },
  { key: "completed", label: "Completed", value: (r) => r.completed, sortable: true, align: "right" },
  {
    key: "overdue",
    label: "Overdue",
    value: (r) => r.overdue,
    sortable: true,
    align: "right",
    render: (r) => (
      <span className={`tabular-nums ${r.overdue ? "font-semibold text-red-600 dark:text-red-400" : ""}`}>{r.overdue}</span>
    ),
  },
  { key: "onTime", label: "On time", value: (r) => r.onTime, sortable: true, align: "right" },
  {
    key: "rate",
    label: "Completion",
    value: (r) => r.completionRate,
    sortable: true,
    align: "right",
    render: (r) => (
      <span className="inline-flex items-center gap-2">
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${r.completionRate}%` }} />
        </span>
        <span className="w-11 text-right font-medium tabular-nums text-slate-800 dark:text-fg">{r.completionRate}%</span>
      </span>
    ),
  },
];

/** Team workload map + searchable team report (admins and managers only). */
export default function TeamInsights() {
  const [perUser, setPerUser] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useTasksChanged(() => setRefresh((n) => n + 1));

  useEffect(() => {
    analyticsApi
      .get("team")
      .then((data) => setPerUser(data.perUser))
      .catch((err: ApiError) => setError(err.message));
  }, [refresh]);

  if (error) return null; // the rest of the Team page still works without it
  if (!perUser) return <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />;

  return (
    <div className="space-y-6">
      <WorkloadMap perUser={perUser} />
      <DataGrid
        title="Team report"
        subtitle="Workload and delivery per member"
        columns={teamReportColumns}
        rows={perUser}
        rowKey={(r) => r.user._id}
        exportName="team-report"
      />
    </div>
  );
}
