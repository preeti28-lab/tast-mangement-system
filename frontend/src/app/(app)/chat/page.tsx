import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/layout/AppShell";
import ChatView from "./ChatView";

export const metadata: Metadata = { title: "Chat · NexTask" };

export default function ChatPage() {
  // ChatView keeps the open conversation in the URL (useSearchParams), which needs a Suspense boundary.
  return (
    <Suspense fallback={<Spinner />}>
      <ChatView />
    </Suspense>
  );
}
