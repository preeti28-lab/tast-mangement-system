"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useToast } from "@/components/ui/Toast";
import { QUEUE_EVENT, flushOfflineQueue, pendingCount } from "@/lib/offlineQueue";
import { emitTasksChanged } from "@/lib/taskEvents";

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};
const subscribeQueue = (cb: () => void) => {
  window.addEventListener(QUEUE_EVENT, cb);
  return () => window.removeEventListener(QUEUE_EVENT, cb);
};

/** Shows an offline banner and replays queued task changes when the connection returns. */
export default function OfflineSync() {
  const toast = useToast();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const pending = useSyncExternalStore(subscribeQueue, pendingCount, () => 0);

  useEffect(() => {
    if (!online || pendingCount() === 0) return;
    flushOfflineQueue().then(({ synced, failed }) => {
      if (synced) toast(`Synced ${synced} offline change${synced === 1 ? "" : "s"}`);
      if (failed) toast(`${failed} offline change${failed === 1 ? "" : "s"} couldn't be applied`, "error");
      if (synced || failed) emitTasksChanged();
    });
  }, [online, toast]);

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-40 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950"
    >
      {online
        ? `Syncing ${pending} offline change${pending === 1 ? "" : "s"}...`
        : `You're offline. Showing saved data${pending ? ` · ${pending} change${pending === 1 ? "" : "s"} waiting to sync` : ""}.`}
    </div>
  );
}
