"use client";

import { useCallback, useRef, useState } from "react";
import { LogoutIcon } from "@/components/icons";
import { initials } from "@/lib/format";
import { useClickOutside } from "./useClickOutside";
import { useUser } from "./UserContext";

export default function UserMenu() {
  const { user, logout } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-full p-1 transition hover:bg-zinc-100 sm:pr-3 dark:hover:bg-zinc-800"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight text-zinc-900 dark:text-white">
            {user.name}
          </span>
          <span className="block text-xs leading-tight text-zinc-500">{user.email}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{user.name}</p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <LogoutIcon className="h-4 w-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
