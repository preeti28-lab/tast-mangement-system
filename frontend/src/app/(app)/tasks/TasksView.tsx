"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import FormAlert from "@/components/auth/FormAlert";
import { PlusIcon } from "@/components/icons";
import { Spinner } from "@/components/layout/AppShell";
import { useUser } from "@/components/layout/UserContext";
import DeleteTaskDialog from "@/components/tasks/DeleteTaskDialog";
import ExportTasksDialog, { filterTasksByDate, rangeFileSuffix, type ExportRange } from "@/components/tasks/ExportTasksDialog";
import TaskDetailModal from "@/components/tasks/TaskDetailModal";
import TaskFormModal, { type SaveResult } from "@/components/tasks/TaskFormModal";
import { useTasksChanged } from "@/lib/taskEvents";
import TasksTable, { PER_PAGE_OPTIONS, type TableFilters } from "@/components/tasks/TasksTable";
import { VIEW_OPTIONS } from "@/components/tasks/options";
import { useToast } from "@/components/ui/Toast";
import { PageHeader, primaryButtonClass, tabClass, tabListClass } from "@/components/ui/Surface";
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
import { dateInputToIso, toDateInput } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { isStaff } from "@/lib/permissions";

const DEFAULT_PER_PAGE = 10;

const VIEW_HEADINGS: Record<TaskView, { title: string; subtitle: string }> = {
  all: { title: "My tasks", subtitle: "Everything you created or are assigned to." },
  assigned: { title: "Assigned to me", subtitle: "Tasks other people have given you." },
  created: { title: "Created by me", subtitle: "Tasks you created, whoever they are assigned to." },
  overdue: { title: "Overdue tasks", subtitle: "Tasks past their due date that need your attention." },
  team: { title: "Team tasks", subtitle: "Every task across the team." },
};

type Result = { key: string } & ({ data: TaskListResponse; error?: never } | { error: string; data?: never });

export default function TasksView() {
  const { user } = useUser();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ---- URL is the source of truth for filters, so they survive refresh and can be shared.
  const view = (searchParams.get("view") as TaskView) || "all";
  const filters: TableFilters = {
    search: searchParams.get("search") ?? "",
    status: (searchParams.get("status") as TableFilters["status"]) ?? "",
    priority: (searchParams.get("priority") as TableFilters["priority"]) ?? "",
    dueFrom: searchParams.get("dueFrom") ?? "",
    dueTo: searchParams.get("dueTo") ?? "",
    sort: (searchParams.get("sort") as TaskSort) || "newest",
  };
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limitParam = Number(searchParams.get("limit"));
  const perPage = PER_PAGE_OPTIONS.includes(limitParam) ? limitParam : DEFAULT_PER_PAGE;
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
      limit: perPage,
    }),
    [view, filters.search, filters.status, filters.priority, filters.dueFrom, filters.dueTo, filters.sort, page, perPage]
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
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  /** Exports every task matching the current view + filters (all pages), not just this page,
      narrowed to the chosen date range and sorted by that date. */
  const exportTasks = async (range: ExportRange) => {
    setExporting(true);
    try {
      const all: Task[] = [];
      for (let p = 1, pages = 1; p <= pages; p++) {
        const res = await taskApi.list({ ...query, page: p, limit: 50 });
        all.push(...res.tasks);
        pages = res.pages;
      }
      const rows = filterTasksByDate(all, range);
      if (rows.length === 0) {
        toast("No tasks in that date range", "error");
        return;
      }
      const suffix = rangeFileSuffix(range);
      const label = { todo: "To do", in_progress: "In progress", completed: "Completed" } as const;
      downloadCsv(
        suffix ? `tasks-${view}-${suffix}` : `tasks-${view}`,
        ["Title", "Description", "Status", "Priority", "Due date", "Assignee", "Created by", "Created", "Repeats"],
        rows.map((t) => [
          t.title,
          t.description,
          label[t.status],
          t.priority,
          t.dueDate ? toDateInput(t.dueDate) : "",
          t.assignedTo?.name ?? "Unassigned",
          t.createdBy.name,
          toDateInput(t.createdAt),
          t.recurrence === "none" ? "" : t.recurrence,
        ])
      );
      toast(`Exported ${rows.length} task${rows.length === 1 ? "" : "s"}`);
      setExportOpen(false);
    } catch (err) {
      toast((err as ApiError).message, "error");
    } finally {
      setExporting(false);
    }
  };

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

  const onFilterChange = useCallback(
    (patch: Partial<TableFilters>) =>
      updateParams(
        Object.fromEntries(
          Object.entries(patch).map(([k, v]) => [k, k === "sort" && v === "newest" ? null : (v as string)])
        )
      ),
    [updateParams]
  );
  const clearFilters = useCallback(
    () => updateParams({ search: null, status: null, priority: null, dueFrom: null, dueTo: null }),
    [updateParams]
  );

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={VIEW_HEADINGS[view]?.title ?? "My tasks"}
        subtitle={VIEW_HEADINGS[view]?.subtitle}
        actions={
          <button onClick={() => updateParams({ new: "1" }, { resetPage: false })} className={primaryButtonClass}>
            <PlusIcon className="h-5 w-5" />
            New task
          </button>
        }
      />

      <div>
        <div role="tablist" aria-label="Task views" className={tabListClass}>
          {VIEW_OPTIONS.filter((o) => o.value !== "team" || isStaff(user)).map((o) => (
            <button
              key={o.value}
              role="tab"
              aria-selected={view === o.value}
              onClick={() => updateParams({ view: o.value })}
              className={tabClass(view === o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {result?.error ? (
        <FormAlert message={result.error} />
      ) : !data ? (
        <Spinner />
      ) : (
        <TasksTable
          title={VIEW_HEADINGS[view]?.title ?? "My tasks"}
          tasks={data.tasks}
          total={data.total}
          page={data.page}
          pages={data.pages}
          perPage={perPage}
          loading={loading}
          filters={filters}
          currentUser={user}
          updatingId={updatingId}
          exporting={exporting}
          onFilterChange={onFilterChange}
          onClearFilters={clearFilters}
          onPageChange={(p) => updateParams({ page: p }, { resetPage: false })}
          onPerPageChange={(n) => updateParams({ limit: n === DEFAULT_PER_PAGE ? null : n })}
          onExport={() => setExportOpen(true)}
          onOpen={(t) => updateParams({ task: t._id }, { resetPage: false })}
          onEdit={setEditing}
          onDelete={setDeleting}
          onStatusChange={changeStatus}
          emptyAction={
            view !== "overdue" && (
              <button
                type="button"
                onClick={() => updateParams({ new: "1" }, { resetPage: false })}
                className={`mt-2 ${primaryButtonClass}`}
              >
                <PlusIcon className="h-4 w-4" />
                New task
              </button>
            )
          }
        />
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
      <ExportTasksDialog open={exportOpen} busy={exporting} onClose={() => setExportOpen(false)} onExport={exportTasks} />
    </div>
  );
}
