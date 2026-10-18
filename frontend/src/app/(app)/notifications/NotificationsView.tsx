"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FormAlert from "@/components/auth/FormAlert";
import { BellIcon, CheckCircleIcon, UserIcon } from "@/components/icons";
import {
  EmptyState,
  IconBadge,
  PageHeader,
  SectionHeader,
  cardClass,
  secondaryButtonClass,
} from "@/components/ui/Surface";
import { Spinner } from "@/components/layout/AppShell";
import { notificationApi, type Notification } from "@/lib/api";
import { timeAgo } from "@/lib/format";

export default function NotificationsView() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    notificationApi
      .list()
      .then((data) => setItems(data.notifications))
      .catch((err: Error) => setError(err.message));
  }, []);

  const markRead = async (id: string) => {
    setItems((list) => list?.map((n) => (n._id === id ? { ...n, read: true } : n)) ?? null);
    await notificationApi.markRead(id).catch(() => {});
  };

  const markAllRead = async () => {
    setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? null);
    await notificationApi.markAllRead().catch(() => {});
  };

  if (error) return <FormAlert message={error} />;
  if (!items) return <Spinner />;

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="w-full max-w-4xl space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.` : "You're all caught up."}
        actions={
          unreadCount > 0 && (
            <button onClick={markAllRead} className={secondaryButtonClass}>
              <CheckCircleIcon className="h-4 w-4" />
              Mark all as read
            </button>
          )
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={BellIcon} title="No notifications yet">
          You&apos;ll be notified when someone assigns you a task or updates one you&apos;re on.
        </EmptyState>
      ) : (
        <section className={`p-5 sm:p-6 ${cardClass}`}>
          <SectionHeader icon={BellIcon} tone="amber" title="All notifications" subtitle="Latest 20, newest first." />
          <ul className="mt-5 space-y-3">
            {items.map((n) => (
              <li
                key={n._id}
                className={`flex items-start gap-4 rounded-xl border px-4 py-3.5 ${
                  n.read
                    ? "border-zinc-200 dark:border-zinc-800"
                    : "border-indigo-200 bg-indigo-50/50 dark:border-indigo-500/30 dark:bg-indigo-500/5"
                }`}
              >
                <IconBadge icon={n.type === "task_assigned" ? UserIcon : CheckCircleIcon} tone={n.type === "task_assigned" ? "indigo" : "emerald"} />
                <div className="min-w-0 flex-1 pt-0.5">
                  {n.task ? (
                    <Link
                      href={`/tasks?task=${n.task._id}`}
                      onClick={() => !n.read && markRead(n._id)}
                      className="text-sm font-medium text-zinc-800 hover:text-indigo-600 dark:text-zinc-200 dark:hover:text-indigo-400"
                    >
                      {n.message}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{n.message}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n._id)}
                    className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
