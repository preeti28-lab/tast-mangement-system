"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { ApiError, OfflineQueuedError, taskApi, type Task } from "@/lib/api";

type Props = {
  task: Task | null;
  onClose: () => void;
  onDeleted: (task: Task, queued?: boolean) => void;
};

export default function DeleteTaskDialog({ task, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setError("");
    onClose();
  };

  const confirm = async () => {
    if (!task) return;
    setDeleting(true);
    setError("");
    try {
      await taskApi.remove(task._id);
      onDeleted(task);
    } catch (err) {
      if (err instanceof OfflineQueuedError) return onDeleted(task, true);
      setError((err as ApiError).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={!!task} title="Delete task" onClose={close} size="sm">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Are you sure you want to delete{" "}
        <span className="font-semibold text-fg">&ldquo;{task?.title}&rdquo;</span>? This
        can&apos;t be undone.
      </p>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          onClick={close}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-hover dark:border-slate-700 dark:text-slate-200"
        >
          Cancel
        </button>
        <button
          onClick={confirm}
          disabled={deleting}
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </Modal>
  );
}
