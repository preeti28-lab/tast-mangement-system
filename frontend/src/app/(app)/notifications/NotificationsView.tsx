"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import FormAlert from "@/components/auth/FormAlert";
import { BellIcon, CheckCircleIcon } from "@/components/icons";
import { EmptyState, PageHeader, secondaryButtonClass } from "@/components/ui/Surface";
import DataGrid, { Highlight, type GridColumn } from "@/components/ui/DataGrid";
import { notificationApi, type Notification } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/format";
import { TableSkeleton } from "@/components/ui/Loader";

const TYPE_LABEL: Record<Notification["type"], string> = {
  task_assigned: "Assigned",
  task_updated: "Status update",
};

const TYPE_PILL: Record<Notification["type"], string> = {
  task_assigned: "bg-brand-50 text-brand-700 ring-brand-600/20 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20",
  task_updated: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
};

const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset";

export default function NotificationsView() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    notificationApi
      .list()
      .then((data) => setItems(data.notifications))
      .catch((err: Error) => setError(err.message));
  }, []);

  const markRead = useCallback(async (id: string) => {
    setItems((list) => list?.map((n) => (n._id === id ? { ...n, read: true } : n)) ?? null);
    await notificationApi.markRead(id).catch(() => {});
  }, []);

  const markAllRead = async () => {
    setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? null);
    await notificationApi.markAllRead().catch(() => {});
  };

  const columns = useMemo<GridColumn<Notification>[]>(
    () => [
      {
        key: "message",
        label: "Notification",
        value: (n) => n.message,
        searchable: true,
        render: (n, q) => {
          const text = <Highlight text={n.message} query={q} />;
          const cls = `inline-block whitespace-normal xl:min-w-64 ${n.read ? "text-slate-600 dark:text-muted" : "font-semibold text-fg"}`;
          return n.task ? (
            <Link
              href={`/tasks?task=${n.task._id}`}
              onClick={() => !n.read && markRead(n._id)}
              className={`${cls} hover:text-brand-600 dark:hover:text-brand-400`}
            >
              {text}
            </Link>
          ) : (
            <span className={cls}>{text}</span>
          );
        },
      },
      {
        key: "type",
        label: "Type",
        value: (n) => TYPE_LABEL[n.type],
        sortable: true,
        searchable: true,
        filter: "select",
        filterDots: { Assigned: "bg-brand-500", "Status update": "bg-emerald-400" },
        align: "center",
        render: (n) => <span className={`${pill} ${TYPE_PILL[n.type]}`}>{TYPE_LABEL[n.type]}</span>,
      },
      {
        key: "received",
        label: "Received",
        value: (n) => formatDateTime(n.createdAt),
        sortValue: (n) => new Date(n.createdAt).getTime(),
        sortable: true,
        render: (n) => (
          <span title={formatDateTime(n.createdAt)} className="tabular-nums">
            {timeAgo(n.createdAt)}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        value: (n) => (n.read ? "Read" : "Unread"),
        sortable: true,
        searchable: true,
        filter: "select",
        filterDots: { Read: "bg-slate-400", Unread: "bg-amber-400" },
        align: "center",
        render: (n) => (
          <span
            className={`${pill} ${
              n.read
                ? "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-500/30"
                : "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
            {n.read ? "Read" : "Unread"}
          </span>
        ),
      },
      {
        key: "action",
        label: "",
        value: () => "",
        exportable: false,
        align: "right",
        render: (n) =>
          !n.read && (
            <button
              type="button"
              onClick={() => markRead(n._id)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
              Mark read
            </button>
          ),
      },
    ],
    [markRead]
  );

  if (error) return <FormAlert message={error} />;
  if (!items) return <TableSkeleton />;

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount
            ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
            : "You're all caught up."
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={BellIcon} title="No notifications yet">
          You&apos;ll be notified when someone assigns you a task or updates one you&apos;re on.
        </EmptyState>
      ) : (
        <DataGrid
          title="All notifications"
          subtitle="Latest 20"
          columns={columns}
          rows={items}
          rowKey={(n) => n._id}
          initialSort={{ key: "received", dir: "desc" }}
          exportName="notifications"
          pageSize={10}
          actions={
            unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className={secondaryButtonClass}>
                <CheckCircleIcon className="h-4 w-4" />
                Mark all read
              </button>
            )
          }
        />
      )}
    </div>
  );
}
