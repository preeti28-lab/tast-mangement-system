"use client";

import { usePathname } from "next/navigation";
import { MenuIcon } from "@/components/icons";
import { getPageTitle } from "./navigation";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

// Floating glass "pill" navbar: rounded-full, translucent with backdrop blur,
// soft shadow and a gap from the top of the page.
export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6 lg:px-10">
      <div className="flex h-16 items-center gap-2 rounded-full border border-zinc-200/80 bg-white/70 px-2 shadow-lg shadow-zinc-900/5 backdrop-blur-md sm:gap-3 sm:pl-6 dark:border-zinc-700/60 dark:bg-zinc-900/70 dark:shadow-black/20">
        <button
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded-full p-2.5 text-zinc-600 transition-all duration-200 ease-out hover:scale-105 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 active:scale-95 lg:hidden dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:ring-offset-zinc-900"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <h1 className="flex-1 truncate text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
          {getPageTitle(pathname)}
        </h1>
        <NotificationBell />
        <span className="hidden h-7 w-px bg-zinc-200 sm:block dark:bg-zinc-700" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  );
}
