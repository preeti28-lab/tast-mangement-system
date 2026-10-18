// Offline support for task changes: while the browser is offline, create/update/delete
// requests are stored in localStorage and replayed in order when it comes back online.

type QueuedRequest = { id: string; method: string; path: string; body?: string; queuedAt: number };

const STORAGE_KEY = "taskflow:offline-queue";
export const QUEUE_EVENT = "taskflow:offline-queue";

export const isQueueable = (method: string, path: string) =>
  method !== "GET" && path.startsWith("/tasks");

function read(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(queue: QueuedRequest[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or blocked: nothing more we can do offline.
  }
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT, { detail: queue.length }));
}

export const pendingCount = () => (typeof window === "undefined" ? 0 : read().length);

export function enqueueOffline(req: Omit<QueuedRequest, "id" | "queuedAt">) {
  write([...read(), { ...req, id: crypto.randomUUID(), queuedAt: Date.now() }]);
}

let flushing = false;

/**
 * Replays queued requests in order. Requests the server rejects (e.g. the task was
 * deleted meanwhile) are dropped and reported; network failures stop the replay.
 */
export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (flushing) return { synced: 0, failed: 0 };
  flushing = true;
  let synced = 0;
  let failed = 0;
  try {
    for (const item of read()) {
      try {
        const res = await fetch(`/api${item.path}`, {
          method: item.method,
          body: item.body,
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) synced += 1;
        else failed += 1;
      } catch {
        break; // still offline – keep the rest for later
      }
      write(read().filter((q) => q.id !== item.id));
    }
  } finally {
    flushing = false;
  }
  return { synced, failed };
}

/** Clears queued changes (on logout, so they never replay as another user). */
export function clearOfflineQueue() {
  write([]);
}
