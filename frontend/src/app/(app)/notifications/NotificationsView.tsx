"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FormAlert from "@/components/auth/FormAlert";
import { BellIcon } from "@/components/icons";
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

  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-white">All notifications</h2>
          {hasUnread && (
            <button onClick={markAllRead} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Mark all as read
            </button>
          )}
        </header>
        {items.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center text-sm text-zinc-500">
            <BellIcon className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            No notifications yet. You&apos;ll be notified when someone assigns you a task.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((n) => (
              <li key={n._id} className="flex items-start gap-3 px-5 py-4">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-indigo-500"}`}
                />
                <div className="min-w-0 flex-1">
                  {n.task ? (
                    <Link
                      href={`/tasks?task=${n.task._id}`}
                      onClick={() => !n.read && markRead(n._id)}
                      className="text-sm text-zinc-800 hover:text-indigo-600 dark:text-zinc-200 dark:hover:text-indigo-400"
                    >
                      {n.message}
                    </Link>
                  ) : (
                    <p className="text-sm text-zinc-800 dark:text-zinc-200">{n.message}</p>
                  )}
                  <p className="mt-0.5 text-xs text-zinc-500">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n._id)}
                    className="shrink-0 text-xs font-medium text-zinc-500 hover:text-indigo-600"
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
