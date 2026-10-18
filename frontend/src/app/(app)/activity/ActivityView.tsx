"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from "react";
import {
  ActivityIcon,
  CheckCircleIcon,
  PencilIcon,
  PlusIcon,
  RepeatIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";
import { EmptyState, PageHeader, TONE_BADGE, type Tone } from "@/components/ui/Surface";
import DataGrid, { Highlight, type GridColumn } from "@/components/ui/DataGrid";
import FormAlert from "@/components/auth/FormAlert";
import { useTasksChanged } from "@/lib/taskEvents";
import { useUser } from "@/components/layout/UserContext";
import { auditApi, type AuditAction, type AuditLog } from "@/lib/api";
import { describeAudit, getUserDirectory, type UserDirectory } from "@/lib/audit";
import { formatDateTime, timeAgo } from "@/lib/format";
import { isStaff } from "@/lib/permissions";
import { TableSkeleton } from "@/components/ui/Loader";

const ACTION_STYLE: Record<AuditAction, { label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; tone: Tone }> = {
  "task.created": { label: "Created", icon: PlusIcon, tone: "emerald" },
  "task.updated": { label: "Edited", icon: PencilIcon, tone: "sky" },
  "task.assigned": { label: "Assigned", icon: UserIcon, tone: "brand" },
  "task.status_changed": { label: "Status changed", icon: CheckCircleIcon, tone: "emerald" },
  "task.deleted": { label: "Deleted", icon: XIcon, tone: "red" },
  "task.recurred": { label: "Recurring", icon: RepeatIcon, tone: "violet" },
  "user.registered": { label: "Joined", icon: UsersIcon, tone: "brand" },
  "user.role_changed": { label: "Role changed", icon: SettingsIcon, tone: "amber" },
};

const TONE_DOT: Record<Tone, string> = {
  brand: "bg-brand-500",
  sky: "bg-sky-500",
  red: "bg-red-500",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  violet: "bg-violet-500",
};
/** Dropdown dots for the Action filter, keyed by label. */
const ACTION_DOTS = Object.fromEntries(Object.values(ACTION_STYLE).map((s) => [s.label, TONE_DOT[s.tone]]));

// The table searches/sorts in the browser, so load the most recent entries up front.
const PAGES_TO_LOAD = 3;
const PER_REQUEST = 100;

type Loaded = { logs: AuditLog[]; total: number; users: UserDirectory };

async function loadRecent(): Promise<Loaded> {
  const [first, users] = await Promise.all([auditApi.list({ page: 1, limit: PER_REQUEST }), getUserDirectory()]);
  const rest = await Promise.all(
    Array.from({ length: Math.min(first.pages, PAGES_TO_LOAD) - 1 }, (_, i) =>
      auditApi.list({ page: i + 2, limit: PER_REQUEST })
    )
  );
  return { logs: [first, ...rest].flatMap((r) => r.logs), total: first.total, users };
}

export default function ActivityView() {
  const { user } = useUser();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useTasksChanged(() => setRefresh((n) => n + 1));

  useEffect(() => {
    let cancelled = false;
    loadRecent()
      .then((loaded) => !cancelled && setData(loaded))
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const columns = useMemo<GridColumn<AuditLog>[]>(() => {
    const users = data?.users ?? new Map();
    return [
      {
        key: "when",
        label: "When",
        value: (log) => formatDateTime(log.createdAt),
        sortValue: (log) => new Date(log.createdAt).getTime(),
        sortable: true,
        render: (log) => (
          <span title={formatDateTime(log.createdAt)} className="tabular-nums text-muted">
            {timeAgo(log.createdAt)}
          </span>
        ),
      },
      {
        key: "action",
        label: "Action",
        value: (log) => ACTION_STYLE[log.action]?.label ?? log.action,
        sortable: true,
        searchable: true,
        filter: "select",
        filterDots: ACTION_DOTS,
        render: (log) => {
          const style = ACTION_STYLE[log.action] ?? { label: log.action, icon: ActivityIcon, tone: "brand" as Tone };
          const Icon = style.icon;
          return (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${TONE_BADGE[style.tone]}`}>
              <Icon className="h-3.5 w-3.5" />
              {style.label}
            </span>
          );
        },
      },
      {
        key: "who",
        label: "By",
        value: (log) => (log.actor ? log.actor.name : "System"),
        sortable: true,
        searchable: true,
        filter: "select",
        filterAllLabel: "Anyone",
      },
      {
        key: "task",
        label: "Task",
        value: (log) => log.taskTitle || "—",
        sortable: true,
        searchable: true,
        render: (log, q) =>
          log.taskTitle ? (
            log.task && log.action !== "task.deleted" ? (
              <Link href={`/tasks?task=${log.task}`} className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">
                <Highlight text={log.taskTitle} query={q} />
              </Link>
            ) : (
              <span className="text-muted line-through decoration-slate-300">
                <Highlight text={log.taskTitle} query={q} />
              </span>
            )
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        key: "details",
        label: "Details",
        primary: true,
        value: (log) => describeAudit(log, users, user._id),
        searchable: true,
        render: (log, q) => (
          <span className="block max-w-xl whitespace-normal text-slate-700 xl:min-w-64 dark:text-slate-300">
            <Highlight text={describeAudit(log, users, user._id)} query={q} />
          </span>
        ),
      },
    ];
  }, [data, user._id]);

  if (error) return <FormAlert message={error} />;
  if (!data) return <TableSkeleton rows={8} />;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Activity log"
        subtitle={isStaff(user) ? "Every action taken across the team." : "Actions on tasks you created or are assigned to."}
      />

      {data.logs.length === 0 ? (
        <EmptyState icon={ActivityIcon} title="No activity yet">
          Actions like creating, assigning and completing tasks will appear here.
        </EmptyState>
      ) : (
        <DataGrid
          title="Audit trail"
          subtitle={data.total > data.logs.length ? `Latest ${data.logs.length} of ${data.total}` : undefined}
          columns={columns}
          rows={data.logs}
          rowKey={(log) => log._id}
          initialSort={{ key: "when", dir: "desc" }}
          pageSize={10}
          exportName="activity-log"
        />
      )}
    </div>
  );
}
