"use client";

import { PencilIcon, RepeatIcon } from "@/components/icons";
import type { Task, TaskStatus, User } from "@/lib/api";
import { canChangeStatus, canDeleteTask, canEditTask } from "@/lib/permissions";
import { formatDate, initials, isOverdue } from "@/lib/format";
import { PriorityBadge } from "./TaskBadges";
import StatusSelect from "./StatusSelect";

type Props = {
  tasks: Task[];
  currentUser: User;
  updatingId: string | null;
  onOpen: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
};

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function TaskList({
  tasks,
  currentUser,
  updatingId,
  onOpen,
  onEdit,
  onDelete,
  onStatusChange,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Column headings (desktop only) */}
      <div className="hidden grid-cols-[minmax(0,1fr)_150px_130px_90px_130px_72px] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 lg:grid dark:border-zinc-800 dark:bg-zinc-900/60">
        <span>Task</span>
        <span>Assignee</span>
        <span>Due date</span>
        <span>Priority</span>
        <span>Status</span>
        <span className="sr-only">Actions</span>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {tasks.map((task) => {
          const isCreator = task.createdBy._id === currentUser._id;
          const isAssignee = task.assignedTo?._id === currentUser._id;
          const canEdit = canEditTask(currentUser, task);
          const canDelete = canDeleteTask(currentUser, task);
          const overdue = isOverdue(task);
          const assignee = task.assignedTo;

          return (
            <li
              key={task._id}
              className="grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-zinc-50 lg:grid-cols-[minmax(0,1fr)_150px_130px_90px_130px_72px] lg:items-center lg:gap-4 dark:hover:bg-zinc-800/40"
            >
              <button onClick={() => onOpen(task)} className="min-w-0 text-left">
                <p
                  className={`truncate font-medium ${
                    task.status === "completed"
                      ? "text-zinc-400 line-through"
                      : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {task.recurrence !== "none" && (
                    <RepeatIcon className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-indigo-500" aria-label={`Repeats ${task.recurrence}`} />
                  )}
                  {task.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {task.description || "No description"}
                  {!isCreator && <> &middot; by {task.createdBy.name}</>}
                </p>
              </button>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm lg:contents">
                <span className="flex min-w-0 items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  {assignee ? (
                    <>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                        {initials(assignee.name)}
                      </span>
                      <span className="truncate">{isAssignee ? "You" : assignee.name}</span>
                    </>
                  ) : (
                    <span className="text-zinc-400">Unassigned</span>
                  )}
                </span>

                <span
                  className={`whitespace-nowrap ${
                    overdue ? "font-medium text-red-600 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {overdue && "⚠ "}
                  {formatDate(task.dueDate)}
                </span>

                <PriorityBadge priority={task.priority} />

                <span>
                  <StatusSelect
                    value={task.status}
                    disabled={updatingId === task._id || !canChangeStatus(currentUser, task)}
                    onChange={(status) => onStatusChange(task, status)}
                  />
                </span>

                <span className="ml-auto flex gap-1 lg:ml-0 lg:justify-end">
                  {canEdit && (
                      <button
                        onClick={() => onEdit(task)}
                        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800"
                        aria-label={`Edit ${task.title}`}
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                  )}
                  {canDelete && (
                      <button
                        onClick={() => onDelete(task)}
                        className="rounded-md p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        aria-label={`Delete ${task.title}`}
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
