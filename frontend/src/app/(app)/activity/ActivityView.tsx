"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ActivityIcon, ArrowRightIcon, RepeatIcon } from "@/components/icons";
import { EmptyState, PageHeader, TONE_BADGE, type Tone } from "@/components/ui/Surface";
import { ACTION_STYLE } from "@/components/activity/actionStyle";
import Avatar from "@/components/ui/Avatar";
import DataGrid, { Highlight, type GridColumn } from "@/components/ui/DataGrid";
import FormAlert from "@/components/auth/FormAlert";
import { useTasksChanged } from "@/lib/taskEvents";
import { useUser } from "@/components/layout/UserContext";
import { auditApi, type AuditLog } from "@/lib/api";
import { describeAudit, getUserDirectory, type UserDirectory } from "@/lib/audit";
import { formatDateTime, timeAgo } from "@/lib/format";
import { can } from "@/lib/permissions";
import { TableSkeleton } from "@/components/ui/Loader";

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
    const styleOf = (log: AuditLog) => ACTION_STYLE[log.action] ?? { label: log.action, icon: ActivityIcon, tone: "brand" as Tone };
    return [
      {
        key: "event",
        label: "Activity",
        primary: true,
        value: (log) => describeAudit(log, users, user._id),
        searchable: true,
        cellClassName: "w-full min-w-80 whitespace-normal",
        render: (log, q) => {
          const style = styleOf(log);
          const Icon = style.icon;
          const deleted = log.action === "task.deleted";
          return (
            <span className="flex min-w-0 items-start gap-3">
              <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 ring-inset ring-current/10 ${TONE_BADGE[style.tone]}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] leading-snug font-medium text-fg">
                  <Highlight text={describeAudit(log, users, user._id)} query={q} />
                </span>
                {log.taskTitle && log.task && !deleted && (
                  <Link
                    href={`/tasks?task=${log.task}`}
                    className="mt-1 inline-flex max-w-full items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-500 hover:underline dark:text-brand-400"
                  >
                    <span className="truncate">Open task</span>
                    <ArrowRightIcon className="h-3 w-3" />
                  </Link>
                )}
              </span>
            </span>
          );
        },
      },
      {
        key: "action",
        label: "Action",
        value: (log) => styleOf(log).label,
        sortable: true,
        searchable: true,
        filter: "select",
        filterDots: ACTION_DOTS,
        filterAllLabel: "All actions",
        render: (log) => {
          const style = styleOf(log);
          return (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${TONE_BADGE[style.tone]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[style.tone]}`} aria-hidden="true" />
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
        render: (log, q) =>
          log.actor ? (
            <span className="inline-flex max-w-44 items-center gap-2">
              <Avatar name={log.actor.name} size="xs" />
              <span className="truncate font-medium text-fg">
                {log.actor._id === user._id ? "You" : <Highlight text={log.actor.name} query={q} />}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-muted">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-hover">
                <RepeatIcon className="h-3.5 w-3.5" />
              </span>
              System
            </span>
          ),
      },
      {
        key: "when",
        label: "When",
        align: "right",
        value: (log) => formatDateTime(log.createdAt),
        sortValue: (log) => new Date(log.createdAt).getTime(),
        sortable: true,
        render: (log) => (
          <span className="inline-flex flex-col items-end leading-tight max-xl:items-start">
            <span className="font-medium text-fg">{timeAgo(log.createdAt)}</span>
            <span className="mt-0.5 text-[11.5px] tabular-nums text-muted">{formatDateTime(log.createdAt)}</span>
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
        subtitle={can(user, "audit.viewAll") ? "Every action taken across the team." : "Actions on tasks you created or are assigned to."}
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
