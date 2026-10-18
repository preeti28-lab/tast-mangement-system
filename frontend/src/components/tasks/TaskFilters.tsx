"use client";

import { useEffect, useState } from "react";
import type { TaskPriority, TaskSort, TaskStatus } from "@/lib/api";
import { cardClass } from "@/components/ui/Surface";
import { PRIORITY_OPTIONS, SORT_OPTIONS, STATUS_OPTIONS, selectClass } from "./options";

export type FilterValues = {
  search: string;
  status: TaskStatus | "";
  priority: TaskPriority | "";
  dueFrom: string; // YYYY-MM-DD
  dueTo: string; // YYYY-MM-DD
  sort: TaskSort;
};

type Props = {
  values: FilterValues;
  onChange: (patch: Partial<FilterValues>) => void;
  onClear: () => void;
};

const SEARCH_DEBOUNCE_MS = 350;

export default function TaskFilters({ values, onChange, onClear }: Props) {
  const [searchText, setSearchText] = useState(values.search);

  // Push the search term to the URL once the user stops typing.
  useEffect(() => {
    if (searchText.trim() === values.search) return;
    const id = setTimeout(() => onChange({ search: searchText.trim() }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchText, values.search, onChange]);

  const hasFilters =
    !!values.search || !!values.status || !!values.priority || !!values.dueFrom || !!values.dueTo;

  const clear = () => {
    setSearchText("");
    onClear();
  };

  return (
    <div className={`space-y-3 p-5 ${cardClass}`}>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by title or description"
            aria-label="Search tasks"
            maxLength={100}
            className={`${selectClass} w-full pl-9`}
          />
        </div>
        <select
          aria-label="Sort by"
          value={values.sort}
          onChange={(e) => onChange({ sort: e.target.value as TaskSort })}
          className={selectClass}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <select
          aria-label="Filter by status"
          value={values.status}
          onChange={(e) => onChange({ status: e.target.value as TaskStatus | "" })}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by priority"
          value={values.priority}
          onChange={(e) => onChange({ priority: e.target.value as TaskPriority | "" })}
          className={selectClass}
        >
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Due from
          <input
            type="date"
            value={values.dueFrom}
            max={values.dueTo || undefined}
            onChange={(e) => onChange({ dueFrom: e.target.value })}
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-500">
          Due to
          <input
            type="date"
            value={values.dueTo}
            min={values.dueFrom || undefined}
            onChange={(e) => onChange({ dueTo: e.target.value })}
            className={selectClass}
          />
        </label>
        <button
          onClick={clear}
          disabled={!hasFilters}
          className="col-span-2 self-end rounded-xl px-3 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-transparent lg:col-span-1 dark:hover:bg-indigo-500/10"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
