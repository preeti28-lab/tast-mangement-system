"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

const ACTION_DOT: Partial<Record<AuditAction, string>> = {
  "task.created": "bg-emerald-500",
  "task.deleted": "bg-red-500",
  "task.assigned": "bg-indigo-500",
  "task.status_changed": "bg-sky-500",
  "user.role_changed": "bg-amber-500",
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

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Activity log</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {isStaff(user)
              ? "Every action taken across the team."
              : "Actions on tasks you created or are assigned to."}
          </p>
        </div>
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
      </div>

      {result?.error ? (
        <FormAlert message={result.error} />
      ) : !result?.logs ? (
        <Spinner />
      ) : result.logs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          No activity yet.
        </p>
      ) : (
        <>
          <ul
            className={`divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white shadow-sm transition-opacity dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 ${
              result.key !== key ? "opacity-60" : ""
            }`}
          >
            {result.logs.map((log) => (
              <li key={log._id} className="flex gap-3 px-5 py-3.5">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ACTION_DOT[log.action] ?? "bg-zinc-400"}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">
                    {describeAudit(log, result.users!, user._id)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    <span title={new Date(log.createdAt).toLocaleString()}>{timeAgo(log.createdAt)}</span>
                    {log.task && log.action !== "task.deleted" && (
                      <>
                        {" · "}
                        <Link href={`/tasks?task=${log.task}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                          Open task
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {result.pages! > 1 && (
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>{result.total} entries</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Previous
                </button>
                <span>
                  Page {page} of {result.pages}
                </span>
                <button
                  disabled={page >= result.pages!}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
