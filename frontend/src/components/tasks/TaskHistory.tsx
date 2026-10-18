"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/components/layout/UserContext";
import { auditApi, type AuditLog } from "@/lib/api";
import { describeAudit, getUserDirectory, type UserDirectory } from "@/lib/audit";
import { timeAgo } from "@/lib/format";

/** Audit trail for one task, shown in the task detail modal. */
export default function TaskHistory({ taskId }: { taskId: string }) {
  const { user } = useUser();
  const [data, setData] = useState<{ logs: AuditLog[]; users: UserDirectory } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([auditApi.list({ task: taskId, limit: 50 }), getUserDirectory()])
      .then(([{ logs }, users]) => setData({ logs, users }))
      .catch(() => setError(true));
  }, [taskId]);

  if (error) return <p className="text-sm text-zinc-500">Couldn&apos;t load the history.</p>;
  if (!data) return <p className="text-sm text-zinc-500">Loading history…</p>;
  if (!data.logs.length) return <p className="text-sm text-zinc-500">No history yet.</p>;

  return (
    <ol className="space-y-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
      {data.logs.map((log) => (
        <li key={log._id} className="relative text-sm">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-indigo-400" aria-hidden="true" />
          <p className="text-zinc-700 dark:text-zinc-300">{describeAudit(log, data.users, user._id)}</p>
          <p className="text-xs text-zinc-500" title={new Date(log.createdAt).toLocaleString()}>
            {timeAgo(log.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}
