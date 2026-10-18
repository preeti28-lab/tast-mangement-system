"use client";

import { useEffect, useState } from "react";
import { userApi, type ChatUser, type Conversation, type Role, type UserRef } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/permissions";
import Avatar from "@/components/ui/Avatar";
import { ArrowLeftIcon, BellIcon, ChatIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { useUser } from "@/components/layout/UserContext";
import { previewText, useChat } from "./ChatProvider";
import { listStamp, tickFor } from "./chatFormat";
import Ticks from "./Ticks";

type Contact = UserRef & { role: Role };

/** Avatar with the green "online" dot. */
export function PresenceAvatar({ user, size = "lg" }: { user: Pick<ChatUser, "name"> & { online?: boolean }; size?: "md" | "lg" }) {
  return (
    <span className="relative shrink-0">
      <Avatar name={user.name} size={size} />
      {user.online && (
        <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full bg-brand-500 ring-2 ring-surface" aria-label="online" />
      )}
    </span>
  );
}

const iconButtonClass =
  "grid h-10 w-10 place-items-center rounded-full text-slate-600 transition hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-slate-300";

function useDesktopAlerts() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  useEffect(() => {
    // Read after mount: the Notification API doesn't exist during server rendering.
    const id = setTimeout(() => setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission), 0);
    return () => clearTimeout(id);
  }, []);
  const enable = async () => setPermission(await Notification.requestPermission());
  return { permission, enable };
}

export default function ConversationList({
  activeId,
  onSelect,
  onStartChat,
}: {
  activeId: string | null;
  onSelect: (conversationId: string) => void;
  onStartChat: (userId: string) => void;
}) {
  const { user } = useUser();
  const { conversations, loaded } = useChat();
  const [mode, setMode] = useState<"chats" | "new">("chats");
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const alerts = useDesktopAlerts();

  useEffect(() => {
    if (mode !== "new" || contacts) return;
    userApi
      .list()
      .then(({ users }) => setContacts(users.filter((u) => u._id !== user._id).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setContacts([]));
  }, [mode, contacts, user._id]);

  const q = query.trim().toLowerCase();
  const matches = (u: { name: string; email: string }) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  const chats = conversations.filter((c) => matches(c.user));
  const people = (contacts ?? []).filter(matches);

  const switchMode = (next: "chats" | "new") => {
    setMode(next);
    setQuery("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface/80">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-3">
        {mode === "new" ? (
          <>
            <button type="button" onClick={() => switchMode("chats")} className={iconButtonClass} aria-label="Back to chats">
              <ArrowLeftIcon />
            </button>
            <h2 className="flex-1 text-lg font-bold text-fg">New chat</h2>
          </>
        ) : (
          <>
            <h2 className="flex-1 pl-2 text-xl font-bold text-fg">Chats</h2>
            <button type="button" onClick={() => switchMode("new")} className={iconButtonClass} aria-label="New chat" title="New chat">
              <PlusIcon />
            </button>
          </>
        )}
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 py-2">
        <label className="flex items-center gap-2 rounded-xl bg-hover px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-brand">
          <SearchIcon className="h-4 w-4 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "new" ? "Search name or email" : "Search chats"}
            aria-label={mode === "new" ? "Search people" : "Search chats"}
            className="min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-muted"
          />
        </label>
      </div>

      {mode === "chats" && alerts.permission === "default" && (
        <button
          type="button"
          onClick={alerts.enable}
          className="mx-3 mb-2 flex shrink-0 items-center gap-3 rounded-xl bg-sky-50 px-3 py-2.5 text-left text-sm text-sky-900 transition hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/15"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-500 text-white">
            <BellIcon className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold">Get notified of new messages</span>
            <span className="block text-xs opacity-80">Turn on desktop notifications</span>
          </span>
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {mode === "chats" ? (
          !loaded ? (
            <ListSkeleton />
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400">
                <ChatIcon className="h-7 w-7" />
              </span>
              <p className="mt-3 font-semibold text-fg">{q ? "No chats found" : "No chats yet"}</p>
              <p className="mt-1 text-sm text-muted">{q ? "Try another name." : "Start a conversation with someone on your team."}</p>
              {!q && (
                <button
                  type="button"
                  onClick={() => switchMode("new")}
                  className="mt-4 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Start a chat
                </button>
              )}
            </div>
          ) : (
            <ul>
              {chats.map((c) => (
                <li key={c._id}>
                  <ChatRow conversation={c} active={c._id === activeId} mine={c.lastMessage?.sender === user._id} onClick={() => onSelect(c._id)} />
                </li>
              ))}
            </ul>
          )
        ) : contacts === null ? (
          <ListSkeleton />
        ) : people.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">No one matches &ldquo;{query}&rdquo;.</p>
        ) : (
          <>
            <p className="px-5 pt-2 pb-1 text-xs font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-400">
              Your team
            </p>
            <ul>
              {people.map((p) => (
                <li key={p._id}>
                  <button
                    type="button"
                    onClick={() => onStartChat(p._id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-hover"
                  >
                    <Avatar name={p.name} size="lg" />
                    <span className="min-w-0 flex-1 border-b border-line pb-2.5">
                      <span className="block truncate font-medium text-fg">{p.name}</span>
                      <span className="block truncate text-sm text-muted">
                        {ROLE_LABELS[p.role]} · {p.email}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function ChatRow({ conversation: c, active, mine, onClick }: { conversation: Conversation; active: boolean; mine: boolean; onClick: () => void }) {
  const last = c.lastMessage;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${active ? "bg-hover" : "hover:bg-hover/70"}`}
    >
      <PresenceAvatar user={c.user} />
      <span className="min-w-0 flex-1 border-b border-line pb-2.5">
        <span className="flex items-baseline gap-2">
          <span className="flex-1 truncate font-medium text-fg">{c.user.name}</span>
          {c.lastMessageAt && (
            <span className={`shrink-0 text-xs ${c.unread ? "font-semibold text-brand-600 dark:text-brand-400" : "text-muted"}`}>
              {listStamp(c.lastMessageAt)}
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          {mine && last && !last.deleted && <Ticks tick={tickFor(last.createdAt, c.otherLastReadAt, c.otherLastDeliveredAt)} />}
          <span className={`flex-1 truncate text-sm ${last?.deleted ? "italic text-muted" : c.unread ? "font-medium text-fg" : "text-muted"}`}>
            {previewText(c)}
          </span>
          {c.unread > 0 && (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold leading-none text-white">
              {c.unread > 99 ? "99+" : c.unread}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function ListSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Loading">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <span className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-hover" />
          <span className="flex-1 space-y-2">
            <span className="block h-3.5 w-1/2 animate-pulse rounded bg-hover" />
            <span className="block h-3 w-3/4 animate-pulse rounded bg-hover" />
          </span>
        </li>
      ))}
    </ul>
  );
}
