"use client";

import { usePathname } from "next/navigation";
import { MenuIcon } from "@/components/icons";
import { getPageTitle } from "./navigation";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

// Floating glass "pill" navbar: rounded-full, translucent with backdrop blur,
// soft shadow and a gap from the top of the page, over a frosted strip.
export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 isolate px-4 pt-4 pb-3 sm:px-6 lg:px-10">
      {/* Frosted backdrop behind the pill so scrolled content doesn't show in the
          gap above it or through it; fades out at the bottom edge. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-app/90 backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_85%,transparent)]"
        aria-hidden="true"
      />
      <div className="flex h-16 items-center gap-2 glass-strong rounded-full px-2 sm:gap-3 sm:pl-6">
        <button
          onClick={onMenuClick}
          className="inline-flex items-center justify-center rounded-full p-2.5 text-slate-600 transition-all duration-200 ease-out hover:scale-105 hover:bg-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-95 lg:hidden dark:text-slate-300 dark:focus-visible:ring-offset-slate-900"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <h1 className="flex-1 truncate text-lg font-bold tracking-tight text-fg">
          {getPageTitle(pathname)}
        </h1>
        <ThemeToggle />
        <NotificationBell />
        <span className="hidden h-7 w-px bg-line sm:block" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  );
}
