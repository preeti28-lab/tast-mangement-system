"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { LogoutIcon, XIcon } from "@/components/icons";
import { navItemsFor } from "./navigation";
import { useUser } from "./UserContext";
import { useChat } from "@/components/chat/ChatProvider";

type Props = { open: boolean; onClose: () => void };

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useUser();
  const { unreadTotal } = useChat();

  const isActive = (href: string) => {
    const [path, query] = href.split("?");
    if (pathname !== path) return false;
    const view = new URLSearchParams(query).get("view");
    return view === searchParams.get("view");
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-slate-900/50 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/60 bg-sidebar/70 backdrop-blur-xl transition-transform dark:border-slate-700/50 duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <Logo />
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-hover lg:hidden"
            aria-label="Close menu"
          >
            <XIcon />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
          {navItemsFor(user).map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-2.5 text-base font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/25 ring-1 ring-inset ring-white/20"
                    : "text-slate-600 hover:translate-x-0.5 hover:bg-white/60 hover:text-fg dark:text-muted dark:hover:bg-white/5"
                }`}
              >
                <Icon />
                <span className="flex-1">{label}</span>
                {href === "/chat" && unreadTotal > 0 && (
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold leading-none ${
                      active ? "bg-white text-brand-700" : "bg-brand-600 text-white"
                    }`}
                    aria-label={`${unreadTotal} unread`}
                  >
                    {unreadTotal > 99 ? "99+" : unreadTotal}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mx-4 border-t border-line py-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-base font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700 dark:text-muted dark:hover:bg-red-500/10 dark:hover:text-red-300"
          >
            <LogoutIcon />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
