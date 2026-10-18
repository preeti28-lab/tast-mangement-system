"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronDownIcon, LogoutIcon } from "@/components/icons";
import { ROLE_LABELS } from "@/lib/permissions";
import { useClickOutside } from "./useClickOutside";
import { useUser } from "./UserContext";
import Avatar from "@/components/ui/Avatar";

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
        className="flex items-center gap-3 rounded-full p-1 transition-all duration-200 ease-out hover:bg-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:pr-4 dark:focus-visible:ring-offset-slate-900"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar name={user.name} size="md" />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold leading-tight text-fg">
            {user.name}
          </span>
          <span className="mt-0.5 block text-xs leading-tight text-muted">{user.email}</span>
        </span>
        <ChevronDownIcon className={`hidden h-4 w-4 text-muted transition-transform sm:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-60 overflow-hidden glass-strong rounded-2xl">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-fg">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <span className="mt-1.5 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              {ROLE_LABELS[user.role]}
            </span>
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
