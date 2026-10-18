import { useEffect, useRef } from "react";

// Fired when task data may have changed elsewhere (a new notification arrived or
// offline changes finished syncing), so open lists and counts can refresh.
export const TASKS_CHANGED_EVENT = "taskflow:tasks-changed";

export const emitTasksChanged = () => window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));

/** Calls `onChange` (debounced) whenever TASKS_CHANGED_EVENT fires. */
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
