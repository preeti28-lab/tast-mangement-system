"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { authApi, type Notification } from "@/lib/api";

export const TASKS_CHANGED_EVENT = "taskflow:tasks-changed";

// Socket.io server URL. In development it defaults to the local backend; in
// production it must be set (NEXT_PUBLIC_SOCKET_URL), otherwise the app falls back
// to polling.
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");

export type RealtimeStatus = "off" | "connecting" | "live" | "offline";

type Listener = (notification: Notification) => void;
type RealtimeContextValue = {
  status: RealtimeStatus;
  onNotification: (listener: Listener) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  status: "off",
  onNotification: () => () => {},
});

export const useRealtime = () => useContext(RealtimeContext);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RealtimeStatus>(SOCKET_URL ? "connecting" : "off");
  const listeners = useRef(new Set<Listener>());

  useEffect(() => {
    if (!SOCKET_URL) return;

    const socket: Socket = io(SOCKET_URL, {
      // A fresh short-lived token for every (re)connection attempt.
      auth: (cb) => {
        authApi
          .socketToken()
          .then(({ token }) => cb({ token }))
          .catch(() => cb({}));
      },
      transports: ["websocket", "polling"],
      reconnectionDelayMax: 30_000,
    });

    socket.on("connect", () => setStatus("live"));
    socket.on("disconnect", () => setStatus("offline"));
    socket.on("connect_error", () => setStatus("offline"));
    socket.on("notification", (notification: Notification) => {
      listeners.current.forEach((listener) => listener(notification));
    });
    socket.on("task:changed", () => window.dispatchEvent(new Event(TASKS_CHANGED_EVENT)));

    return () => {
      socket.close();
    };
  }, []);

  const onNotification = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);
  const value = useMemo(() => ({ status, onNotification }), [status, onNotification]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

/** Calls `onChange` (debounced) whenever tasks change in real time or offline changes sync. */
export function useTasksChanged(onChange: () => void) {
  const callback = useRef(onChange);
  useEffect(() => {
    callback.current = onChange;
  });
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), 400);
    };
    window.addEventListener(TASKS_CHANGED_EVENT, handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(TASKS_CHANGED_EVENT, handler);
    };
  }, []);
}
