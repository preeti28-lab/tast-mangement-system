"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
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
import {
  EmptyState,
  IconBadge,
  PageHeader,
  SectionHeader,
  cardClass,
  secondaryButtonClass,
  type Tone,
} from "@/components/ui/Surface";
import FormAlert from "@/components/auth/FormAlert";
import { Spinner } from "@/components/layout/AppShell";
import { useTasksChanged } from "@/lib/taskEvents";
import { useUser } from "@/components/layout/UserContext";
import { selectClass } from "@/components/tasks/options";
import { auditApi, type AuditAction, type AuditLog } from "@/lib/api";
import { describeAudit, getUserDirectory, type UserDirectory } from "@/lib/audit";
import { timeAgo } from "@/lib/format";
import { isStaff } from "@/lib/permissions";

const ACTION_FILTERS: { value: AuditAction | ""; label: string }[] = [
  { value: "", label: "All actions" },
  { value: "task.created", label: "Created" },
  { value: "task.updated", label: "Edited" },
  { value: "task.assigned", label: "Assigned" },
  { value: "task.status_changed", label: "Status changed" },
  { value: "task.deleted", label: "Deleted" },
  { value: "task.recurred", label: "Recurring" },
  { value: "user.registered", label: "Joined" },
  { value: "user.role_changed", label: "Role changed" },
];

const ACTION_STYLE: Record<AuditAction, { icon: ComponentType<SVGProps<SVGSVGElement>>; tone: Tone }> = {
  "task.created": { icon: PlusIcon, tone: "emerald" },
  "task.updated": { icon: PencilIcon, tone: "sky" },
  "task.assigned": { icon: UserIcon, tone: "indigo" },
  "task.status_changed": { icon: CheckCircleIcon, tone: "emerald" },
  "task.deleted": { icon: XIcon, tone: "red" },
  "task.recurred": { icon: RepeatIcon, tone: "violet" },
  "user.registered": { icon: UsersIcon, tone: "indigo" },
  "user.role_changed": { icon: SettingsIcon, tone: "amber" },
};

const PAGE_SIZE = 25;

type Result = { key: string; logs?: AuditLog[]; pages?: number; total?: number; users?: UserDirectory; error?: string };

export default function ActivityView() {
  const { user } = useUser();
  const [action, setAction] = useState<AuditAction | "">("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  useTasksChanged(() => setRefresh((n) => n + 1));

  const key = `${action}|${page}|${refresh}`;
  useEffect(() => {
    let cancelled = false;
    Promise.all([auditApi.list({ action, page, limit: PAGE_SIZE }), getUserDirectory()])
      .then(([data, users]) => !cancelled && setResult({ key, ...data, users }))
      .catch((err: Error) => !cancelled && setResult({ key, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [key, action, page]);

  const busy = result?.key !== key;

  return (
    <div className="w-full max-w-5xl space-y-6">
      <PageHeader
        title="Activity log"
        subtitle={isStaff(user) ? "Every action taken across the team." : "Actions on tasks you created or are assigned to."}
        actions={
          <select
            aria-label="Filter by action"
            value={action}
            onChange={(e) => {
              setAction(e.target.value as AuditAction | "");
              setPage(1);
            }}
            className={selectClass}
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        }
      />

      {result?.error ? (
        <FormAlert message={result.error} />
      ) : !result?.logs ? (
        <Spinner />
      ) : result.logs.length === 0 ? (
        <EmptyState icon={ActivityIcon} title="No activity yet">
          Actions like creating, assigning and completing tasks will appear here.
        </EmptyState>
      ) : (
        <section className={`p-5 transition-opacity sm:p-6 ${cardClass} ${busy ? "opacity-60" : ""}`}>
          <SectionHeader
            icon={ActivityIcon}
            title="Recent activity"
            subtitle={`${result.total} entr${result.total === 1 ? "y" : "ies"}`}
          />
          <ul className="mt-5 space-y-3">
            {result.logs.map((log) => {
              const { icon, tone } = ACTION_STYLE[log.action] ?? { icon: ActivityIcon, tone: "indigo" as Tone };
              return (
                <li
                  key={log._id}
                  className="flex items-start gap-4 rounded-xl border border-zinc-200 px-4 py-3.5 dark:border-zinc-800"
                >
                  <IconBadge icon={icon} tone={tone} />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {describeAudit(log, result.users!, user._id)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      <span title={new Date(log.createdAt).toLocaleString()}>{timeAgo(log.createdAt)}</span>
                      {log.task && log.action !== "task.deleted" && (
                        <>
                          {" · "}
                          <Link href={`/tasks?task=${log.task}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                            Open task →
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          {result.pages! > 1 && (
            <div className="mt-5 flex items-center justify-end gap-3 text-sm text-zinc-500">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={secondaryButtonClass}>
                Previous
              </button>
              <span>
                Page {page} of {result.pages}
              </span>
              <button
                disabled={page >= result.pages!}
                onClick={() => setPage((p) => p + 1)}
                className={secondaryButtonClass}
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
