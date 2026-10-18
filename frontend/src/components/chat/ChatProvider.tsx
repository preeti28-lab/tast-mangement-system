"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { chatApi, type Conversation } from "@/lib/api";
import Avatar from "@/components/ui/Avatar";
import { XIcon } from "@/components/icons";
import { useUser } from "@/components/layout/UserContext";

// Keeps the chat list fresh on every page by polling the REST API (no sockets),
// so the sidebar/nav badges show unread counts and new messages pop up anywhere.

const POLL_MS = 10_000;
const POPUP_MS = 6_000;

type ChatContextValue = {
  conversations: Conversation[];
  unreadTotal: number;
  loaded: boolean;
  refresh: () => Promise<void>;
  /** The chat open on screen; its messages don't pop up and count as read. */
  setActiveConversation: (id: string | null) => void;
};

const ChatContext = createContext<ChatContextValue>({
  conversations: [],
  unreadTotal: 0,
  loaded: false,
  refresh: async () => {},
  setActiveConversation: () => {},
});

export const useChat = () => useContext(ChatContext);

type Popup = { id: string; conversationId: string; name: string; text: string };

export const previewText = (c: Conversation) =>
  !c.lastMessage ? "" : c.lastMessage.deleted ? "This message was deleted" : c.lastMessage.text;

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [popups, setPopups] = useState<Popup[]>([]);
  const active = useRef<string | null>(null);
  // Last message id per conversation; null until the first load so old messages don't pop up.
  const lastSeen = useRef<Map<string, string> | null>(null);

  const dismiss = useCallback((id: string) => setPopups((list) => list.filter((p) => p.id !== id)), []);

  const announce = useCallback(
    (c: Conversation) => {
      const text = previewText(c);
      const visible = document.visibilityState === "visible";
      if (visible) {
        const popup = { id: c.lastMessage!._id, conversationId: c._id, name: c.user.name, text };
        setPopups((list) => [...list.filter((p) => p.conversationId !== c._id), popup].slice(-3));
        setTimeout(() => dismiss(popup.id), POPUP_MS);
      } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        // Tab in the background: a desktop notification, one per chat (tag) so they replace each other.
        const n = new Notification(c.user.name, { body: text, tag: `chat-${c._id}`, icon: "/icon-192.png" });
        n.onclick = () => {
          window.focus();
          router.push(`/chat?c=${c._id}`);
          n.close();
        };
      }
    },
    [dismiss, router]
  );

  const refresh = useCallback(async () => {
    try {
      const data = await chatApi.conversations();
      const previous = lastSeen.current;
      lastSeen.current = new Map(data.conversations.map((c) => [c._id, c.lastMessage?._id ?? ""]));
      setConversations(data.conversations);
      setUnreadTotal(data.unreadTotal);
      setLoaded(true);
      if (!previous || !data.notify) return;
      for (const c of data.conversations) {
        const fresh = c.lastMessage && previous.get(c._id) !== c.lastMessage._id;
        const incoming = fresh && c.lastMessage!.sender !== user._id && !c.lastMessage!.deleted && c.unread > 0;
        const onScreen = active.current === c._id && document.visibilityState === "visible";
        if (incoming && !onScreen) announce(c);
      }
    } catch {
      // Keep the last known state; chat polling is not critical.
    }
  }, [announce, user._id]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const id = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const setActiveConversation = useCallback((id: string | null) => {
    active.current = id;
    if (id) setPopups((list) => list.filter((p) => p.conversationId !== id));
  }, []);

  return (
    <ChatContext.Provider value={{ conversations, unreadTotal, loaded, refresh, setActiveConversation }}>
      {children}
      {/* New-message pop-ups, top right (toasts use the bottom) */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-24 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {popups.map((p) => (
          <div
            key={p.id}
            className="glass-strong pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl p-3 shadow-xl animate-[popup-in_200ms_ease-out]"
          >
            <Link href={`/chat?c=${p.conversationId}`} onClick={() => dismiss(p.id)} className="flex min-w-0 flex-1 items-start gap-3">
              <Avatar name={p.name} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-fg">{p.name}</span>
                <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{p.text}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => dismiss(p.id)}
              aria-label="Dismiss"
              className="rounded-full p-1 text-muted transition hover:bg-hover hover:text-fg"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ChatContext.Provider>
  );
}
