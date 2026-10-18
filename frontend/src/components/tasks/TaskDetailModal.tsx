"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useUser } from "@/components/layout/UserContext";
import { Spinner } from "@/components/layout/AppShell";
import { taskApi, type ApiError, type Task, type TaskStatus } from "@/lib/api";
import { formatDate, isOverdue } from "@/lib/format";
import { canChangeStatus, canDeleteTask, canEditTask } from "@/lib/permissions";
import { RECURRENCE_OPTIONS } from "./options";
import TaskHistory from "./TaskHistory";
import { PriorityBadge } from "./TaskBadges";
import StatusSelect from "./StatusSelect";

type Props = {
  taskId: string | null;
  // Bumped by the parent after an edit so the details reload.
  version: number;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => Promise<Task | null>;
};

export default function TaskDetailModal({ taskId, version, ...rest }: Props) {
  return (
    <Modal open={!!taskId} title="Task details" onClose={rest.onClose}>
      {taskId && <TaskDetail key={`${taskId}:${version}`} taskId={taskId} {...rest} />}
    </Modal>
  );
}

function TaskDetail({
  taskId,
  onEdit,
  onDelete,
  onStatusChange,
}: Omit<Props, "version" | "onClose"> & { taskId: string }) {
  const { user } = useUser();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    taskApi
      .get(taskId)
      .then(({ task }) => setTask(task))
      .catch((err: ApiError) =>
        setError(err.status === 404 ? "This task no longer exists or you don't have access to it." : err.message)
      );
  }, [taskId]);

  if (error) return <p className="py-6 text-center text-sm text-muted">{error}</p>;
  if (!task) return <Spinner />;

  const isCreator = task.createdBy._id === user._id;
  const canEdit = canEditTask(user, task);
  const canDelete = canDeleteTask(user, task);
  const overdue = isOverdue(task);
  const repeat = RECURRENCE_OPTIONS.find((o) => o.value === task.recurrence)?.label;

  const changeStatus = async (status: TaskStatus) => {
    setUpdating(true);
    const updated = await onStatusChange(task, status);
    if (updated) setTask(updated);
    setUpdating(false);
  };

  const rows: [string, React.ReactNode][] = [
    ["Status", <StatusSelect key="s" value={task.status} disabled={updating || !canChangeStatus(user, task)} onChange={changeStatus} />],
    ["Priority", <PriorityBadge key="p" priority={task.priority} />],
    [
      "Due date",
      <span key="d" className={overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
        {formatDate(task.dueDate)}
        {overdue && " (overdue)"}
      </span>,
    ],
    ["Repeats", repeat],
    ["Assigned to", task.assignedTo ? `${task.assignedTo.name} (${task.assignedTo.email})` : "Unassigned"],
    ["Created by", isCreator ? "You" : `${task.createdBy.name} (${task.createdBy.email})`],
    ["Created", formatDate(task.createdAt)],
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-fg">{task.title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
          {task.description || <span className="text-slate-400">No description</span>}
        </p>
      </div>

      <dl className="divide-y divide-line rounded-lg border border-line text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right text-slate-800 dark:text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>

      {canEdit || canDelete ? (
        <div className="flex justify-end gap-2">
          {canDelete && (
            <button
              onClick={() => onDelete(task)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              Delete
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => onEdit(task)}
              className="btn-3d btn-3d-brand rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Edit task
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Only the creator, a manager or an admin can edit this task. You can update its status.
        </p>
      )}

      <section>
        <h4 className="mb-3 text-sm font-semibold text-fg">History</h4>
        <TaskHistory taskId={task._id} />
      </section>
    </div>
  );
}
