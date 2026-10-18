"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PencilIcon, RepeatIcon, TrashIcon } from "@/components/icons";
import { Highlight } from "@/components/ui/DataGrid";
import {
  ExportButton,
  FilterPopover,
  SearchField,
  SortHeader,
  TableCard,
  TableEmpty,
  TableFooter,
  TableToolbar,
  popoverInputClass,
  rowClass,
  tdClass,
  thClass,
} from "@/components/ui/table";
import type { Task, TaskPriority, TaskSort, TaskStatus, User } from "@/lib/api";
import { canChangeStatus, canDeleteTask, canEditTask } from "@/lib/permissions";
import { formatDate, isOverdue } from "@/lib/format";
import { PriorityBadge } from "./TaskBadges";
import StatusSelect from "./StatusSelect";
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from "./options";
import Avatar from "@/components/ui/Avatar";

export type TableFilters = {
  search: string;
  status: TaskStatus | "";
  priority: TaskPriority | "";
  dueFrom: string; // YYYY-MM-DD
  dueTo: string; // YYYY-MM-DD
  sort: TaskSort;
};

type Props = {
  title: string;
  tasks: Task[];
  total: number;
  page: number;
  pages: number;
  perPage: number;
  loading: boolean;
  filters: TableFilters;
  currentUser: User;
  updatingId: string | null;
  exporting: boolean;
  onFilterChange: (patch: Partial<TableFilters>) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onExport: () => void;
  onOpen: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  /** Shown in the empty state when no filters are active (e.g. a "New task" button). */
  emptyAction?: ReactNode;
};

const SEARCH_DEBOUNCE_MS = 350;
/** Card styling for the task list from md up, where the cards sit in a grid. */
const tileMdClass =
  "md:rounded-xl md:border md:border-line md:bg-white/40 md:transition-all md:duration-200 md:hover:-translate-y-px md:hover:border-brand-300/70 md:hover:shadow-md dark:md:bg-white/[0.03]";
export const PER_PAGE_OPTIONS = [5, 10, 25, 50];

/** Header sort button that cycles a server sort: asc → desc → back to the default ("newest"). */
function ServerSort({ label, asc, desc, sort, onChange }: { label: string; asc: TaskSort; desc: TaskSort; sort: TaskSort; onChange: (s: TaskSort) => void }) {
  const dir = sort === asc ? "asc" : sort === desc ? "desc" : null;
  return <SortHeader label={label} dir={dir} onClick={() => onChange(dir === null ? asc : dir === "asc" ? desc : "newest")} />;
}

/**
 * Tasks table in the searchable data-grid style: toolbar with search + export,
 * sortable/filterable column headers, striped rows, and a paginated footer.
 * On phones the rows become cards. Search, filters, sorting and paging all run
 * on the server (via onFilterChange / onPageChange), so it scales to any number of tasks.
 */
export default function TasksTable({
  title,
  tasks,
  total,
  page,
  pages,
  perPage,
  loading,
  filters,
  currentUser,
  updatingId,
  exporting,
  onFilterChange,
  onClearFilters,
  onPageChange,
  onPerPageChange,
  onExport,
  onOpen,
  onEdit,
  onDelete,
  onStatusChange,
  emptyAction,
}: Props) {
  const [searchText, setSearchText] = useState(filters.search);

  // Push the search term to the URL once the user stops typing.
  useEffect(() => {
    if (searchText.trim() === filters.search) return;
    const id = setTimeout(() => onFilterChange({ search: searchText.trim() }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchText, filters.search, onFilterChange]);

  const activeFilters =
    (filters.search ? 1 : 0) + (filters.status ? 1 : 0) + (filters.priority ? 1 : 0) + (filters.dueFrom || filters.dueTo ? 1 : 0);

  const clearAll = () => {
    setSearchText("");
    onClearFilters();
  };

  const from = total ? (page - 1) * perPage + 1 : 0;
  const to = Math.min(page * perPage, total);
  const setSort = (sort: TaskSort) => onFilterChange({ sort });

  const empty = (
    <TableEmpty
      filtered={activeFilters > 0}
      title="No tasks here yet"
      text="Create a task to start tracking your work."
      onClear={clearAll}
      action={emptyAction}
    />
  );

  // ---- cell pieces, shared by the table rows and the phone cards ----------

  const titleBlock = (task: Task) => (
    <button onClick={() => onOpen(task)} className="block w-full min-w-0 text-left">
      <span
        className={`block truncate font-semibold ${task.status === "completed" ? "text-slate-400 line-through" : "text-fg hover:text-brand-600 dark:hover:text-brand-400"}`}
      >
        {task.recurrence !== "none" && (
          <RepeatIcon className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-brand-500" aria-label={`Repeats ${task.recurrence}`} />
        )}
        <Highlight text={task.title} query={filters.search} />
      </span>
      <span className="mt-0.5 block truncate text-xs text-muted">
        {task.description ? <Highlight text={task.description} query={filters.search} /> : "No description"}
        {task.createdBy._id !== currentUser._id && <> &middot; by {task.createdBy.name}</>}
      </span>
    </button>
  );

  const assignee = (task: Task) =>
    task.assignedTo ? (
      <span className="flex min-w-0 items-center gap-2 text-slate-700 dark:text-slate-300">
        <Avatar name={task.assignedTo.name} size="xs" />
        <span className="max-w-[120px] truncate">{task.assignedTo._id === currentUser._id ? "You" : task.assignedTo.name}</span>
      </span>
    ) : (
      <span className="text-slate-400">Unassigned</span>
    );

  const due = (task: Task) => {
    const overdue = isOverdue(task);
    return (
      <span className={`whitespace-nowrap tabular-nums ${overdue ? "font-medium text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-400"}`}>
        {overdue && "⚠ "}
        {formatDate(task.dueDate)}
      </span>
    );
  };

  const statusSelect = (task: Task) => (
    <StatusSelect
      value={task.status}
      disabled={updatingId === task._id || !canChangeStatus(currentUser, task)}
      onChange={(status) => onStatusChange(task, status)}
    />
  );

  const actions = (task: Task) => (
    <span className="inline-flex gap-1">
      {canEditTask(currentUser, task) && (
        <button
          onClick={() => onEdit(task)}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-hover hover:text-brand-600 xl:p-1.5"
          aria-label={`Edit ${task.title}`}
          title="Edit"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      )}
      {canDeleteTask(currentUser, task) && (
        <button
          onClick={() => onDelete(task)}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 xl:p-1.5 dark:hover:bg-red-500/10"
          aria-label={`Delete ${task.title}`}
          title="Delete"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}
    </span>
  );

  // ---- filter popover bodies ----------------------------------------------

  const dueFilter = (
    <FilterPopover label="due date" active={!!(filters.dueFrom || filters.dueTo)}>
      <label className="mb-1 block text-xs text-muted">
        From
        <input
          type="date"
          value={filters.dueFrom}
          max={filters.dueTo || undefined}
          onChange={(e) => onFilterChange({ dueFrom: e.target.value })}
          className={`mt-1 ${popoverInputClass}`}
        />
      </label>
      <label className="block text-xs text-muted">
        To
        <input
          type="date"
          value={filters.dueTo}
          min={filters.dueFrom || undefined}
          onChange={(e) => onFilterChange({ dueTo: e.target.value })}
          className={`mt-1 ${popoverInputClass}`}
        />
      </label>
      {(filters.dueFrom || filters.dueTo) && (
        <button type="button" onClick={() => onFilterChange({ dueFrom: "", dueTo: "" })} className="mt-2 text-xs font-medium text-brand-600 hover:underline">
          Clear dates
        </button>
      )}
    </FilterPopover>
  );

  const priorityFilter = (
    <FilterPopover label="priority" active={!!filters.priority}>
      <select
        aria-label="Priority filter"
        value={filters.priority}
        onChange={(e) => onFilterChange({ priority: e.target.value as TableFilters["priority"] })}
        className={popoverInputClass}
      >
        <option value="">All priorities</option>
        {PRIORITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FilterPopover>
  );

  const statusFilter = (
    <FilterPopover label="status" active={!!filters.status}>
      <select
        aria-label="Status filter"
        value={filters.status}
        onChange={(e) => onFilterChange({ status: e.target.value as TableFilters["status"] })}
        className={popoverInputClass}
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FilterPopover>
  );

  return (
    <TableCard>
      <TableToolbar title={title} count={total} activeFilters={activeFilters} onClear={clearAll}>
        <SearchField value={searchText} onChange={setSearchText} placeholder="Search title or description…" label="Search tasks" maxLength={100} />
        <ExportButton onClick={onExport} busy={exporting} disabled={total === 0} />
      </TableToolbar>

      {/* Below xl: sort/filter strip, then one card per task (two columns from md) */}
      <div className={`transition-opacity xl:hidden ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-4 py-3 text-[11.5px] font-semibold tracking-[0.04em] text-muted uppercase">
          <span className="flex items-center gap-1.5">
            <ServerSort label="Due" asc="due_asc" desc="due_desc" sort={filters.sort} onChange={setSort} />
            {dueFilter}
          </span>
          <span className="flex items-center gap-1.5">
            Priority
            {priorityFilter}
          </span>
          <span className="flex items-center gap-1.5">
            Status
            {statusFilter}
          </span>
        </div>
        {tasks.length === 0 ? (
          empty
        ) : (
          <ul className="divide-y divide-line md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:p-4">
            {tasks.map((task) => (
              <li key={task._id} className={`space-y-3 px-4 py-4 even:glass-row md:even:bg-transparent ${tileMdClass}`}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">{titleBlock(task)}</div>
                  {actions(task)}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                  {assignee(task)}
                  {due(task)}
                  <PriorityBadge priority={task.priority} />
                </div>
                {statusSelect(task)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* xl and up: full table. Task column absorbs the slack; Created from 2xl. */}
      <div className={`relative hidden overflow-x-auto transition-opacity xl:block ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
        <table className="w-full min-w-[600px] border-collapse text-left text-[13.5px]">
          <thead>
            <tr>
              <th scope="col" className={thClass}>
                Task
              </th>
              <th scope="col" className={thClass}>
                Assignee
              </th>
              <th scope="col" className={thClass} aria-sort={filters.sort === "due_asc" ? "ascending" : filters.sort === "due_desc" ? "descending" : "none"}>
                <div className="flex items-center gap-1.5">
                  <ServerSort label="Due date" asc="due_asc" desc="due_desc" sort={filters.sort} onChange={setSort} />
                  {dueFilter}
                </div>
              </th>
              <th scope="col" className={thClass}>
                <div className="flex items-center gap-1.5">
                  <span>Priority</span>
                  {priorityFilter}
                </div>
              </th>
              <th scope="col" className={thClass}>
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {statusFilter}
                </div>
              </th>
              <th
                scope="col"
                className={`${thClass} hidden 2xl:table-cell`}
                aria-sort={filters.sort === "oldest" ? "ascending" : filters.sort === "newest" ? "descending" : "none"}
              >
                <ServerSort label="Created" asc="oldest" desc="newest" sort={filters.sort} onChange={setSort} />
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={7}>{empty}</td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task._id} className={rowClass}>
                  <td className={`${tdClass} w-full max-w-0`}>{titleBlock(task)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{assignee(task)}</td>
                  <td className={tdClass}>{due(task)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className={`${tdClass} whitespace-nowrap`}>{statusSelect(task)}</td>
                  <td className={`${tdClass} hidden whitespace-nowrap tabular-nums text-slate-600 2xl:table-cell dark:text-slate-400`}>
                    {formatDate(task.createdAt)}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-right`}>{actions(task)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TableFooter
        id="tasks-per-page"
        perPage={perPage}
        perPageOptions={PER_PAGE_OPTIONS}
        onPerPageChange={onPerPageChange}
        page={page}
        pages={pages}
        from={from}
        to={to}
        total={total}
        onPageChange={onPageChange}
      />
    </TableCard>
  );
}
