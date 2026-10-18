"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { OfflineQueuedError, taskApi, type Task } from "@/lib/api";

type Props = {
  task: Task | null;
  onClose: () => void;
  onDeleted: (task: Task, queued?: boolean) => void;
};

export default function DeleteTaskDialog({ task, onClose, onDeleted }: Props) {
  const confirm = async () => {
    if (!task) return;
    try {
      await taskApi.remove(task._id);
      onDeleted(task);
    } catch (err) {
      // Offline: the delete is queued and replayed later.
      if (err instanceof OfflineQueuedError) return onDeleted(task, true);
      throw err;
    }
  };

  return (
    <ConfirmDialog open={!!task} title="Delete task" confirmLabel="Delete" busyLabel="Deleting…" onConfirm={confirm} onClose={onClose}>
      <p>
        Are you sure you want to delete <span className="font-semibold text-fg">&ldquo;{task?.title}&rdquo;</span>? This can&apos;t be
        undone.
      </p>
    </ConfirmDialog>
  );
}
