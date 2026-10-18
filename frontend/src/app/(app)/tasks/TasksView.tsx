"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import FormAlert from "@/components/auth/FormAlert";
import { ListIcon, PlusIcon } from "@/components/icons";
import { Spinner } from "@/components/layout/AppShell";
import { useUser } from "@/components/layout/UserContext";
import DeleteTaskDialog from "@/components/tasks/DeleteTaskDialog";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import TaskFilters, { type FilterValues } from "@/components/tasks/TaskFilters";
import TaskFormModal, { type SaveResult } from "@/components/tasks/TaskFormModal";
import { useTasksChanged } from "@/lib/taskEvents";
import TaskList from "@/components/tasks/TaskList";
import { VIEW_OPTIONS } from "@/components/tasks/options";
import { useToast } from "@/components/ui/Toast";
import {
  OfflineQueuedError,
  taskApi,
  userApi,
  type ApiError,
  type Task,
  type TaskListResponse,
  type TaskQuery,
  type TaskSort,
  type TaskStatus,
  type TaskView,
  type UserRef,
} from "@/lib/api";
import { dateInputToIso } from "@/lib/format";
import { isStaff } from "@/lib/permissions";

const PAGE_SIZE = 10;

type Result = { key: string } & ({ data: TaskListResponse; error?: never } | { error: string; data?: never });

export default function TasksView() {
  const { user } = useUser();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---- URL is the source of truth for filters, so they survive refresh and can be shared.
  const view = (searchParams.get("view") as TaskView) || "all";
  const filters: FilterValues = {
    search: searchParams.get("search") ?? "",
    status: (searchParams.get("status") as FilterValues["status"]) ?? "",
    priority: (searchParams.get("priority") as FilterValues["priority"]) ?? "",
    dueFrom: searchParams.get("dueFrom") ?? "",
    dueTo: searchParams.get("dueTo") ?? "",
    sort: (searchParams.get("sort") as TaskSort) || "newest",
  };
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const creating = searchParams.get("new") === "1";
  const detailId = searchParams.get("task");

  const updateParams = useCallback(
    (patch: Record<string, string | number | null>, { resetPage = true } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "" || (key === "view" && value === "all")) params.delete(key);
        else params.set(key, String(value));
      }
      if (resetPage && !("page" in patch)) params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // ---- Data loading
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((n) => n + 1), []);
  // Refresh when a new notification arrives or offline changes finish syncing.
  useTasksChanged(reload);

  const query: TaskQuery = useMemo(
    () => ({
      view,
      search: filters.search,
      status: filters.status,
      priority: filters.priority,
      dueFrom: filters.dueFrom ? dateInputToIso(filters.dueFrom, "start") : undefined,
      dueTo: filters.dueTo ? dateInputToIso(filters.dueTo, "end") : undefined,
      sort: filters.sort,
      page,
      limit: PAGE_SIZE,
    }),
    [view, filters.search, filters.status, filters.priority, filters.dueFrom, filters.dueTo, filters.sort, page]
  );
  const key = `${JSON.stringify(query)}#${refresh}`;

  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    taskApi
      .list(query)
      .then((data) => !cancelled && setResult({ key, data }))
      .catch((err: ApiError) => !cancelled && setResult({ key, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [key, query]);

  const loading = result?.key !== key;
  const data = result?.data;

  // If the current page became empty (e.g. after a delete), step back one page.
  useEffect(() => {
    if (data && data.tasks.length === 0 && data.page > 1) {
      updateParams({ page: data.pages }, { resetPage: false });
    }
  }, [data, updateParams]);

  const [users, setUsers] = useState<UserRef[]>([]);
  useEffect(() => {
    userApi
      .list()
      .then(({ users }) => setUsers(users))
      .catch(() => {});
  }, []);

  // ---- Modals
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const closeForm = () => {
    setEditing(null);
    if (creating) updateParams({ new: null }, { resetPage: false });
  };

  const onSaved = (result: SaveResult) => {
    if (result.mode === "queued") {
      toast("You're offline — the change will sync when you're back online");
    } else {
      const { task, mode, nextOccurrence } = result;
      toast(
        mode === "created"
          ? task.assignedTo && task.assignedTo._id !== user._id
            ? `Task created and assigned to ${task.assignedTo.name}`
            : "Task created"
          : "Task updated"
      );
      if (nextOccurrence) toast(`Next occurrence created, due ${new Date(nextOccurrence.dueDate!).toLocaleDateString()}`);
    }
    closeForm();
    setDetailVersion((v) => v + 1);
    reload();
  };

  const onDeleted = (task: Task, queued = false) => {
    toast(queued ? `"${task.title}" will be deleted when you're back online` : `Deleted "${task.title}"`);
    setDeleting(null);
    if (detailId === task._id) updateParams({ task: null }, { resetPage: false });
    reload();
  };

  const changeStatus = async (task: Task, status: TaskStatus): Promise<Task | null> => {
    if (task.status === status) return task;
    setUpdatingId(task._id);
    try {
      const { task: updated, nextOccurrence } = await taskApi.update(task._id, { status });
      toast("Status updated");
      if (nextOccurrence) toast(`Next occurrence created, due ${new Date(nextOccurrence.dueDate!).toLocaleDateString()}`);
      reload();
      return updated;
    } catch (err) {
      if (err instanceof OfflineQueuedError) {
        toast("You're offline — the status will sync when you're back online");
        return null;
      }
      toast((err as ApiError).message, "error");
      return null;
    } finally {
      setUpdatingId(null);
    }
  };

  const hasFilters =
    !!filters.search || !!filters.status || !!filters.priority || !!filters.dueFrom || !!filters.dueTo;

  const onFilterChange = useCallback(
    (patch: Partial<FilterValues>) => updateParams(patch as Record<string, string>),
    [updateParams]
  );
  const clearFilters = useCallback(
    () => updateParams({ search: null, status: null, priority: null, dueFrom: null, dueTo: null }),
    [updateParams]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Task views" className="flex gap-1 overflow-x-auto rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/60">
          {VIEW_OPTIONS.filter((o) => o.value !== "team" || isStaff(user)).map((o) => (
            <button
              key={o.value}
              role="tab"
              aria-selected={view === o.value}
              onClick={() => updateParams({ view: o.value })}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === o.value
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => updateParams({ new: "1" }, { resetPage: false })}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <PlusIcon className="h-4 w-4" />
          New task
        </button>
      </div>

      <TaskFilters values={filters} onChange={onFilterChange} onClear={clearFilters} />

      {result?.error ? (
        <FormAlert message={result.error} />
      ) : !data ? (
        <Spinner />
      ) : data.tasks.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            <ListIcon />
          </span>
          <h3 className="mt-4 font-semibold text-zinc-900 dark:text-white">
            {hasFilters ? "No tasks match your filters" : view === "overdue" ? "Nothing overdue" : "No tasks yet"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            {hasFilters
              ? "Try a different search term or clear the filters."
              : view === "assigned"
                ? "Tasks other people assign to you will show up here."
                : view === "overdue"
                  ? "You're on top of everything."
                  : "Create a task to start tracking your work."}
          </p>
          {hasFilters ? (
            <button onClick={clearFilters} className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Clear filters
            </button>
          ) : (
            view !== "overdue" && (
              <button
                onClick={() => updateParams({ new: "1" }, { resetPage: false })}
                className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                + New task
              </button>
            )
          )}
        </div>
      ) : (
        <div className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
          <TaskList
            tasks={data.tasks}
            currentUser={user}
            updatingId={updatingId}
            onOpen={(t) => updateParams({ task: t._id }, { resetPage: false })}
            onEdit={setEditing}
            onDelete={setDeleting}
            onStatusChange={changeStatus}
          />
          <div className="flex flex-col items-center justify-between gap-3 text-sm text-zinc-500 sm:flex-row">
            <span>
              Showing {(data.page - 1) * PAGE_SIZE + 1}–{(data.page - 1) * PAGE_SIZE + data.tasks.length} of{" "}
              {data.total} task{data.total === 1 ? "" : "s"}
            </span>
            {data.pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => updateParams({ page: page - 1 }, { resetPage: false })}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Previous
                </button>
                <span>
                  Page {data.page} of {data.pages}
                </span>
                <button
                  disabled={page >= data.pages}
                  onClick={() => updateParams({ page: page + 1 }, { resetPage: false })}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <TaskDetailModal
        taskId={detailId}
        version={detailVersion}
        onClose={() => updateParams({ task: null }, { resetPage: false })}
        onEdit={setEditing}
        onDelete={setDeleting}
        onStatusChange={changeStatus}
      />
      <TaskFormModal
        open={creating || !!editing}
        task={editing}
        users={users}
        onClose={closeForm}
        onSaved={onSaved}
      />
      <DeleteTaskDialog task={deleting} onClose={() => setDeleting(null)} onDeleted={onDeleted} />
    </div>
  );
}
