"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BellIcon } from "@/components/icons";
import { notificationApi, type Notification } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useClickOutside } from "./useClickOutside";

const POLL_MS = 30_000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  const load = useCallback(
    () =>
      notificationApi
        .list()
        .then((data) => {
          setItems(data.notifications);
          setUnread(data.unreadCount);
        })
        // Keep the last known state; the bell is not critical.
        .catch(() => {}),
    []
  );

  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(load, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
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
        className="relative rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
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
