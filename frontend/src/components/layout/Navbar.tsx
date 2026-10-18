"use client";

import { usePathname } from "next/navigation";
import { MenuIcon } from "@/components/icons";
import { getPageTitle } from "./navigation";
import NotificationBell from "./NotificationBell";
import { useRealtime } from "./RealtimeProvider";
import UserMenu from "./UserMenu";

/** Shows whether real-time updates are connected (otherwise notifications are polled). */
function LiveIndicator() {
  const { status } = useRealtime();
  if (status === "off") return null;
  const live = status === "live";
  return (
    <span
      title={live ? "Real-time updates connected" : "Reconnecting… updates are checked periodically"}
      className="hidden items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 sm:inline-flex dark:border-zinc-700 dark:text-zinc-300"
    >
      <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-zinc-400"}`} />
      {live ? "Live" : status === "connecting" ? "Connecting" : "Offline"}
    </span>
  );
}

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/80">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden dark:hover:bg-zinc-800"
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>
      <h1 className="flex-1 truncate text-lg font-semibold text-zinc-900 dark:text-white">
        {getPageTitle(pathname)}
      </h1>
      <LiveIndicator />
      <NotificationBell />
      <UserMenu />
    </header>
  );
}
