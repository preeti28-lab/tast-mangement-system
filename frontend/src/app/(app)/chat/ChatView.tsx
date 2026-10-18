"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { chatApi, type ApiError } from "@/lib/api";
import { ChatIcon, LockIcon } from "@/components/icons";
import { useToast } from "@/components/ui/Toast";
import ConversationList from "@/components/chat/ConversationList";
import ChatWindow from "@/components/chat/ChatWindow";

// WhatsApp-style chat: list on the left, open conversation on the right.
// On phones only one pane shows at a time; the open chat lives in ?c=<id> so the
// back button returns to the list. ?user=<id> opens (or starts) a chat with someone.
export default function ChatView() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const activeId = params.get("c");
  const withUser = params.get("user");
  const starting = useRef<string | null>(null);

  const startChat = (userId: string) =>
    chatApi
      .open(userId)
      .then(({ conversation }) => router.replace(`/chat?c=${conversation._id}`))
      .catch((err: ApiError) => {
        toast(err.message, "error");
        router.replace("/chat");
      });

  useEffect(() => {
    if (!withUser || starting.current === withUser) return;
    starting.current = withUser;
    startChat(withUser);
  }); // runs when ?user= appears; guarded by the ref

  return (
    <div className="glass -mx-4 -mb-7 flex h-[calc(100dvh-6.75rem)] min-h-[26rem] overflow-hidden sm:mx-0 sm:mb-0 sm:h-[calc(100dvh-8.5rem)] sm:rounded-2xl">
      <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full min-w-0 flex-col border-line md:w-[22rem] md:border-r lg:w-[26rem]`}>
        <ConversationList
          activeId={activeId}
          onSelect={(id) => router.push(`/chat?c=${id}`)}
          onStartChat={(userId) => startChat(userId)}
        />
      </aside>

      <section className={`${activeId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {activeId ? (
          <ChatWindow key={activeId} conversationId={activeId} onBack={() => router.push("/chat")} />
        ) : (
          <div className="chat-wallpaper flex h-full flex-col items-center justify-center p-8 text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-surface text-brand-600 shadow-sm dark:text-brand-400">
              <ChatIcon className="h-10 w-10" />
            </span>
            <h2 className="mt-5 text-2xl font-bold text-fg">NexTask Chat</h2>
            <p className="mt-2 max-w-sm text-sm text-chat-meta">
              Message anyone on your team. Pick a chat on the left, or press <span className="font-semibold">+</span> to start a new one.
            </p>
            <p className="mt-8 flex items-center gap-1.5 text-xs text-chat-meta">
              <LockIcon className="h-3.5 w-3.5" />
              Your messages are only visible to you and the person you&apos;re chatting with.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
