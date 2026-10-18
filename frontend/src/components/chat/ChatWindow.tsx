"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { chatApi, type ApiError, type ChatMessage, type Conversation } from "@/lib/api";
import { ArrowDownIcon, ArrowLeftIcon, ChevronDownIcon, LockIcon, SendIcon } from "@/components/icons";
import { useUser } from "@/components/layout/UserContext";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useChat } from "./ChatProvider";
import { PresenceAvatar } from "./ConversationList";
import { clockTime, dayLabel, presenceText, sameDay, tickFor, type Tick } from "./chatFormat";
import Ticks from "./Ticks";

/** How often the open chat asks for new messages (REST polling, no sockets). */
const POLL_MS = 3_000;
const MAX_LENGTH = 2000;
/** Messages closer than this from the same sender are drawn as one group. */
const GROUP_GAP_MS = 5 * 60 * 1000;

type LocalMessage = ChatMessage & { status?: "pending" | "failed" };

const byTime = (a: LocalMessage, b: LocalMessage) => a.createdAt.localeCompare(b.createdAt);

export default function ChatWindow({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { user } = useUser();
  const { refresh, setActiveConversation } = useChat();
  const toast = useToast();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newBelow, setNewBelow] = useState(0);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<LocalMessage | null>(null);
  const [draft, setDraft] = useState("");

  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  /** Newest updatedAt seen; polling asks for everything changed since then. */
  const cursor = useRef<string | null>(null);
  const atBottom = useRef(true);
  const tempSeq = useRef(0);
  const scrollAfterRender = useRef<"bottom" | "smooth" | { keepFromBottom: number } | null>(null);

  // Latest list for callbacks that run from timers.
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  });

  /** Adds or replaces messages by id; a server copy of my message replaces its pending twin. */
  const merge = useCallback(
    (incoming: ChatMessage[]) => {
      if (!incoming.length) return;
      for (const m of incoming) if (!cursor.current || m.updatedAt > cursor.current) cursor.current = m.updatedAt;
      setMessages((list) => {
        const next = [...list];
        for (const m of incoming) {
          const i = next.findIndex((x) => x._id === m._id);
          if (i >= 0) {
            next[i] = m;
            continue;
          }
          const twin = m.sender === user._id ? next.findIndex((x) => x.status === "pending" && x.text === m.text) : -1;
          if (twin >= 0) next.splice(twin, 1);
          next.push(m);
        }
        return next.sort(byTime);
      });
    },
    [user._id]
  );

  const markRead = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    chatApi
      .markRead(conversationId)
      .then(refresh)
      .catch(() => {});
  }, [conversationId, refresh]);

  // First page
  const load = useCallback(() => {
    setState("loading");
    chatApi
      .messages(conversationId)
      .then((data) => {
        cursor.current = null;
        setMessages([]);
        merge(data.messages);
        setConversation(data.conversation);
        setHasMore(data.hasMore);
        setState("ready");
        scrollAfterRender.current = "bottom";
        markRead();
      })
      .catch((err: ApiError) => setState(err.status === 404 ? "missing" : "error"));
  }, [conversationId, merge, markRead]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    setActiveConversation(conversationId);
    return () => {
      clearTimeout(id);
      setActiveConversation(null);
    };
  }, [conversationId, load, setActiveConversation]);

  // Poll for new / deleted messages and for read receipts and presence.
  const poll = useCallback(async () => {
    if (state !== "ready" || document.visibilityState !== "visible") return;
    try {
      const data = await chatApi.messages(conversationId, cursor.current ? { since: cursor.current } : {});
      setConversation(data.conversation);
      const known = new Set(messagesRef.current.map((m) => m._id));
      const incoming = data.messages.filter((m) => m.sender !== user._id && !known.has(m._id));
      merge(data.messages);
      if (incoming.length) {
        if (atBottom.current) scrollAfterRender.current = "smooth";
        else setNewBelow((n) => n + incoming.length);
        markRead();
      }
    } catch {
      // Try again on the next tick.
    }
  }, [conversationId, state, user._id, merge, markRead]);

  useEffect(() => {
    const id = setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      poll();
      markRead();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll, markRead]);

  // Scroll after the DOM has the new messages.
  useLayoutEffect(() => {
    const el = scroller.current;
    const want = scrollAfterRender.current;
    if (!el || !want) return;
    scrollAfterRender.current = null;
    if (want === "bottom") el.scrollTop = el.scrollHeight;
    else if (want === "smooth") el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    else el.scrollTop = el.scrollHeight - want.keepFromBottom;
  }, [messages, state]);

  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current.find((m) => !m.status);
    const el = scroller.current;
    if (!oldest || !el) return;
    setLoadingOlder(true);
    try {
      const data = await chatApi.messages(conversationId, { before: oldest.createdAt });
      scrollAfterRender.current = { keepFromBottom: el.scrollHeight - el.scrollTop };
      merge(data.messages);
      setHasMore(data.hasMore);
    } catch {
      toast("Couldn't load older messages", "error");
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, merge, toast]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottom.current && newBelow) setNewBelow(0);
    if (el.scrollTop < 120 && hasMore && !loadingOlder) loadOlder();
  };

  const jumpToBottom = () => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    setNewBelow(0);
  };

  // ---- sending ----------------------------------------------------------------

  const deliver = async (temp: LocalMessage) => {
    try {
      const { message } = await chatApi.send(conversationId, temp.text);
      setMessages((list) => list.filter((m) => m._id !== temp._id && m._id !== message._id).concat(message).sort(byTime));
      if (message.updatedAt > (cursor.current ?? "")) cursor.current = message.updatedAt;
      refresh();
    } catch (err) {
      setMessages((list) => list.map((m) => (m._id === temp._id ? { ...m, status: "failed" } : m)));
      toast((err as ApiError).message || "Message not sent", "error");
    }
  };

  const send = () => {
    const text = draft.trim();
    if (!text || text.length > MAX_LENGTH) return;
    const now = new Date().toISOString();
    const temp: LocalMessage = {
      _id: `tmp-${++tempSeq.current}`,
      conversation: conversationId,
      sender: user._id,
      text,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      status: "pending",
    };
    setDraft("");
    setMessages((list) => [...list, temp]);
    scrollAfterRender.current = "smooth";
    setNewBelow(0);
    deliver(temp);
    input.current?.focus();
  };

  const retry = (m: LocalMessage) => {
    setMessages((list) => list.map((x) => (x._id === m._id ? { ...x, status: "pending" } : x)));
    deliver(m);
  };

  const discard = (m: LocalMessage) => setMessages((list) => list.filter((x) => x._id !== m._id));

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends on desktop; on touch keyboards Enter is a new line (like WhatsApp).
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !touch) {
      e.preventDefault();
      send();
    }
  };

  // Grow the box with its content, up to ~6 lines.
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [draft]);

  // ---- message actions -------------------------------------------------------

  const copy = async (m: LocalMessage) => {
    setMenuFor(null);
    try {
      await navigator.clipboard.writeText(m.text);
      toast("Message copied");
    } catch {
      toast("Couldn't copy", "error");
    }
  };

  const confirmDelete = async () => {
    const m = deleting!;
    const { message } = await chatApi.remove(m._id);
    merge([message]);
    setDeleting(null);
    refresh();
  };

  // ---- render ----------------------------------------------------------------

  if (state === "missing" || state === "error") {
    return (
      <div className="chat-wallpaper flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-semibold text-fg">{state === "missing" ? "This chat doesn't exist anymore" : "Couldn't load this chat"}</p>
        <div className="flex gap-2">
          <button type="button" onClick={onBack} className="rounded-full bg-surface px-4 py-2 text-sm font-medium text-fg shadow-sm hover:bg-hover">
            Back to chats
          </button>
          {state === "error" && (
            <button type="button" onClick={load} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  const other = conversation?.user;
  const tooLong = draft.trim().length > MAX_LENGTH;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/90 px-3 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="grid h-10 w-10 place-items-center rounded-full text-slate-600 transition hover:bg-hover md:hidden dark:text-slate-300"
          aria-label="Back to chats"
        >
          <ArrowLeftIcon />
        </button>
        {other ? (
          <>
            <PresenceAvatar user={other} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-fg">{other.name}</p>
              <p className={`truncate text-xs ${other.online ? "font-medium text-brand-600 dark:text-brand-400" : "text-muted"}`}>
                {presenceText(other)}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center gap-3">
            <span className="h-10 w-10 animate-pulse rounded-full bg-hover" />
            <span className="h-4 w-32 animate-pulse rounded bg-hover" />
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="relative min-h-0 flex-1">
        <div ref={scroller} onScroll={onScroll} className="chat-wallpaper absolute inset-0 overflow-y-auto px-3 py-3 sm:px-[6%]">
          {state === "loading" ? (
            <BubbleSkeleton />
          ) : (
            <>
              {loadingOlder && <p className="py-2 text-center text-xs text-chat-meta">Loading older messages…</p>}
              {!hasMore && other && (
                <p className="mx-auto mb-3 flex max-w-md items-start justify-center gap-1.5 rounded-lg bg-amber-50/95 px-3 py-2 text-center text-xs text-amber-900 shadow-sm dark:bg-[#182229] dark:text-amber-200/90">
                  <LockIcon className="mt-px h-3.5 w-3.5 shrink-0" />
                  Messages here are private between you and {other.name}.
                </p>
              )}
              {messages.length === 0 && other && (
                <div className="mt-10 flex flex-col items-center text-center">
                  <PresenceAvatar user={other} />
                  <p className="mt-3 font-semibold text-fg">Say hi to {other.name.split(" ")[0]} 👋</p>
                  <p className="mt-1 text-sm text-chat-meta">Send a message to start the conversation.</p>
                </div>
              )}
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
                const first =
                  newDay ||
                  prev.sender !== m.sender ||
                  new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > GROUP_GAP_MS;
                const mine = m.sender === user._id;
                const tick: Tick = m.status ?? tickFor(m.createdAt, conversation?.otherLastReadAt ?? null, conversation?.otherLastDeliveredAt ?? null);
                return (
                  <Fragment key={m._id}>
                    {newDay && (
                      <div className="sticky top-1 z-10 my-3 flex justify-center">
                        <span className="rounded-lg bg-surface/95 px-3 py-1 text-xs font-medium text-chat-meta shadow-sm">{dayLabel(m.createdAt)}</span>
                      </div>
                    )}
                    <Bubble
                      message={m}
                      mine={mine}
                      first={first}
                      tick={tick}
                      menuOpen={menuFor === m._id}
                      onMenu={(open) => setMenuFor(open ? m._id : null)}
                      onCopy={() => copy(m)}
                      onDelete={() => {
                        setMenuFor(null);
                        setDeleting(m);
                      }}
                      onRetry={() => retry(m)}
                      onDiscard={() => discard(m)}
                    />
                  </Fragment>
                );
              })}
            </>
          )}
        </div>

        {newBelow > 0 && (
          <button
            type="button"
            onClick={jumpToBottom}
            className="absolute right-4 bottom-4 grid h-11 w-11 place-items-center rounded-full bg-surface text-slate-600 shadow-lg ring-1 ring-line transition hover:bg-hover dark:text-slate-300"
            aria-label={`${newBelow} new message${newBelow === 1 ? "" : "s"}. Scroll to bottom`}
          >
            <ArrowDownIcon />
            <span className="absolute -top-1.5 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white">
              {newBelow}
            </span>
          </button>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex shrink-0 items-end gap-2 border-t border-line bg-surface/90 px-3 py-2.5 backdrop-blur"
      >
        <div className="min-w-0 flex-1">
          <textarea
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Type a message"
            aria-label="Message"
            disabled={state !== "ready"}
            className={`block max-h-36 w-full resize-none rounded-2xl bg-hover px-4 py-2.5 text-[15px] leading-6 text-fg outline-none placeholder:text-muted focus:ring-2 ${
              tooLong ? "ring-2 ring-red-500" : "focus:ring-brand"
            }`}
          />
          {draft.length > MAX_LENGTH - 200 && (
            <p className={`mt-1 px-2 text-right text-xs ${tooLong ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
              {draft.trim().length}/{MAX_LENGTH}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={!draft.trim() || tooLong || state !== "ready"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600 text-white shadow-md transition hover:bg-brand-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          aria-label="Send"
        >
          <SendIcon className="h-5 w-5" />
        </button>
      </form>

      <ConfirmDialog
        open={!!deleting}
        title="Delete message?"
        confirmLabel="Delete for everyone"
        busyLabel="Deleting…"
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      >
        <p>The message will be replaced with &ldquo;This message was deleted&rdquo; for you and {other?.name ?? "the other person"}.</p>
      </ConfirmDialog>
    </div>
  );
}

function Bubble({
  message: m,
  mine,
  first,
  tick,
  menuOpen,
  onMenu,
  onCopy,
  onDelete,
  onRetry,
  onDiscard,
}: {
  message: LocalMessage;
  mine: boolean;
  first: boolean;
  tick: Tick;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  onCopy: () => void;
  onDelete: () => void;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const color = mine ? "bg-chat-out text-chat-out" : "bg-chat-in text-chat-in";
  const hasMenu = !m.deleted && !m.status;
  return (
    <div className={`chat-anim flex flex-col ${mine ? "items-end" : "items-start"} ${first ? "mt-2.5" : "mt-0.5"} animate-[bubble-in_160ms_ease-out]`}>
      <div
        className={`group relative max-w-[85%] rounded-lg px-2.5 pt-1.5 pb-2 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] sm:max-w-[65%] ${color} ${
          first ? (mine ? "rounded-tr-none" : "rounded-tl-none") : ""
        }`}
      >
        {first && (
          <svg viewBox="0 0 8 13" aria-hidden="true" className={`absolute top-0 h-[13px] w-2 ${mine ? "-right-2" : "-left-2"}`}>
            <path d={mine ? "M0 0h8L0 13z" : "M8 0H0l8 13z"} fill="currentColor" />
          </svg>
        )}

        <p className={`text-[14.5px] leading-[1.35] whitespace-pre-wrap break-words ${m.deleted ? "italic text-chat-meta" : "text-fg"}`}>
          {m.deleted ? "🚫 This message was deleted" : m.text}
          {/* Room for the time and ticks in the last line */}
          <span className={`inline-block ${mine && !m.deleted ? "w-[4.6rem]" : "w-[3.4rem]"}`} aria-hidden="true" />
        </p>
        <span className="absolute right-2 bottom-1 flex items-center gap-1 text-[11px] leading-none text-chat-meta">
          <time dateTime={m.createdAt}>{clockTime(m.createdAt)}</time>
          {mine && !m.deleted && <Ticks tick={tick} />}
        </span>

        {hasMenu && (
          <button
            type="button"
            onClick={() => onMenu(!menuOpen)}
            aria-label="Message options"
            aria-expanded={menuOpen}
            className={`absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-inherit text-chat-meta opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-70 ${
              menuOpen ? "opacity-100" : ""
            }`}
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        )}
        {menuOpen && (
          <>
            <button type="button" className="fixed inset-0 z-20 cursor-default" aria-label="Close menu" onClick={() => onMenu(false)} />
            <div
              role="menu"
              className={`absolute top-7 z-30 w-48 overflow-hidden rounded-xl bg-surface py-1 text-sm shadow-xl ring-1 ring-line ${mine ? "right-0" : "left-0"}`}
            >
              <button type="button" role="menuitem" onClick={onCopy} className="block w-full px-4 py-2 text-left text-fg hover:bg-hover">
                Copy
              </button>
              {mine && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={onDelete}
                  className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  Delete for everyone
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {m.status === "failed" && (
        <p className="mt-1 flex gap-3 text-xs">
          <span className="text-red-600 dark:text-red-400">Not sent.</span>
          <button type="button" onClick={onRetry} className="font-semibold text-brand-700 hover:underline dark:text-brand-400">
            Retry
          </button>
          <button type="button" onClick={onDiscard} className="text-muted hover:underline">
            Remove
          </button>
        </p>
      )}
    </div>
  );
}

function BubbleSkeleton() {
  const rows = ["w-2/5", "ml-auto w-1/3", "ml-auto w-1/2", "w-3/5", "w-1/4", "ml-auto w-2/5"];
  return (
    <div className="space-y-3 pt-4" aria-busy="true" aria-label="Loading messages">
      {rows.map((w, i) => (
        <div key={i} className={`h-9 animate-pulse rounded-lg bg-surface/70 ${w}`} />
      ))}
    </div>
  );
}
