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
        className="relative rounded-full p-2.5 text-slate-600 transition-all duration-200 ease-out hover:scale-105 hover:bg-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-95 dark:text-slate-300 dark:focus-visible:ring-offset-slate-900"
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

      {/* Phones: spans the navbar (its backdrop-filter makes it the containing block); sm+: anchored to the bell */}
      {open && (
        <div className="glass-strong fixed inset-x-0 top-full z-50 mt-3 overflow-hidden rounded-2xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:w-80">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Mark all as read
              </button>
            )}
          </div>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted">
                You&apos;re all caught up.
              </li>
            ) : (
              items.slice(0, 6).map((n) => (
                <li key={n._id}>
                  <Link
                    href={n.task ? `/tasks?task=${n.task._id}` : "/notifications"}
                    onClick={() => openNotification(n)}
                    className={`block px-4 py-3 text-sm hover:bg-hover ${
                      n.read ? "" : "bg-brand-50/60 dark:bg-brand-500/5"
                    }`}
                  >
                    <p className="text-slate-800 dark:text-slate-200">{n.message}</p>
                    <p className="mt-0.5 text-xs text-muted">{timeAgo(n.createdAt)}</p>
                  </Link>
                </li>
              ))
            )}
          </ul>
          <Link
            href="/notifications"
            onClick={close}
            className="block border-t border-line px-4 py-2.5 text-center text-sm font-medium text-brand-600 hover:bg-hover"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
