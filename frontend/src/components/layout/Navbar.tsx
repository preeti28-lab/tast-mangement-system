"use client";

import { usePathname } from "next/navigation";
import { MenuIcon } from "@/components/icons";
import { getPageTitle } from "./navigation";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

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
      <NotificationBell />
      <UserMenu />
    </header>
  );
}
