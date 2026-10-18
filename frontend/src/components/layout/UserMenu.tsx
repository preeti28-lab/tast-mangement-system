"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFloating } from "@/components/ui/floating";
import Link from "next/link";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  LogoutIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/icons";
import { ROLE_LABELS } from "@/lib/permissions";
import { useClickOutside } from "./useClickOutside";
import { useUser } from "./UserContext";
import Avatar from "@/components/ui/Avatar";

export default function UserMenu() {
  const { user, logout } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close, panelRef);
  // Portalled: inside the navbar's backdrop-filter, Chrome let the page show through the panel.
  const style = useFloating(triggerRef, open, {
    width: 288,
    gap: 12,
    align: "end",
  });

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
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
          <span className="mt-0.5 block text-xs leading-tight text-muted">
            {user.email}
          </span>
        </span>
        <ChevronDownIcon
          className={`hidden h-4 w-4 text-muted transition-transform sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={style}
            className="glass-menu dropdown-in w-72 overflow-hidden rounded-2xl"
            role="menu"
            aria-label="Account"
          >
            {/* Who's signed in */}
            <div className="relative overflow-hidden border-b border-line px-4 py-4">
              <span
                className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-brand-400/20 blur-2xl"
                aria-hidden="true"
              />
              <div className="relative flex items-center gap-3">
                <Avatar name={user.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                  <span className="mt-1.5 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-600/15 ring-inset dark:bg-brand-500/10 dark:text-brand-300">
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-1.5">
              {[
                {
                  href: "/profile",
                  label: "My profile",
                  hint: "Details, stats and password",
                  icon: UserIcon,
                },
                {
                  href: "/settings",
                  label: "Settings",
                  hint: "Theme and notifications",
                  icon: SettingsIcon,
                },
              ].map(({ href, label, hint, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  onClick={close}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-hover text-slate-600 transition-colors group-hover:bg-brand-500 group-hover:text-white dark:text-slate-300">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-fg">
                      {label}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {hint}
                    </span>
                  </span>
                  <ChevronRightIcon className="h-4 w-4 text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </div>

            <div className="border-t border-line p-1.5">
              <button
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 dark:bg-red-500/10">
                  <LogoutIcon className="h-4.5 w-4.5" />
                </span>
                Log out
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
