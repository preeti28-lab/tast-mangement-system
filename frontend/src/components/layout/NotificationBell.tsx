"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BellIcon } from "@/components/icons";
import { notificationApi, type Notification } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import { emitTasksChanged } from "@/lib/taskEvents";
import { useClickOutside } from "./useClickOutside";

const POLL_MS = 30_000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  // Ids seen so far; null until the first load so existing notifications don't pop up.
  const seen = useRef<Set<string> | null>(null);
  const toast = useToast();
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  const load = useCallback(
    () =>
      notificationApi
        .list()
        .then((data) => {
          const fresh = seen.current
            ? data.notifications.filter((n) => !n.read && !seen.current!.has(n._id))
            : [];
          seen.current = new Set(data.notifications.map((n) => n._id));
          setItems(data.notifications);
          setUnread(data.unreadCount);
          // Pop up new notifications and let open pages refresh their task data.
          fresh.slice(0, 3).forEach((n) => toast(n.message));
          if (fresh.length) emitTasksChanged();
        })
        // Keep the last known state; the bell is not critical.
        .catch(() => {}),
    [toast]
  );

  // Poll regularly, and right away when the tab becomes visible again.
  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(load, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const openNotification = (n: Notification) => {
    close();
    if (n.read) return;
    setItems((list) => list.map((item) => (item._id === n._id ? { ...item, read: true } : item)));
    setUnread((count) => Math.max(0, count - 1));
    notificationApi.markRead(n._id).catch(load);
  };

  const markAllRead = async () => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await notificationApi.markAllRead().catch(load);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2.5 text-zinc-600 transition-all duration-200 ease-out hover:scale-105 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 active:scale-95 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:ring-offset-zinc-900"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-lg dark:border-zinc-700/60 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-80 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">
                You&apos;re all caught up.
              </li>
            ) : (
              items.slice(0, 6).map((n) => (
                <li key={n._id}>
                  <Link
                    href={n.task ? `/tasks?task=${n.task._id}` : "/notifications"}
                    onClick={() => openNotification(n)}
                    className={`block px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${
                      n.read ? "" : "bg-indigo-50/60 dark:bg-indigo-500/5"
                    }`}
                  >
                    <p className="text-zinc-800 dark:text-zinc-200">{n.message}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{timeAgo(n.createdAt)}</p>
                  </Link>
                </li>
              ))
            )}
          </ul>
          <Link
            href="/notifications"
            onClick={close}
            className="block border-t border-zinc-200 px-4 py-2.5 text-center text-sm font-medium text-indigo-600 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
