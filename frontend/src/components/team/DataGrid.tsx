"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type GridColumn<T> = {
  key: string;
  label: string;
  /** Raw value used for search, sorting and CSV export. */
  value: (row: T) => string | number;
  sortable?: boolean;
  searchable?: boolean;
  align?: "left" | "right" | "center";
  /** Custom cell; defaults to the value with search matches highlighted. */
  render?: (row: T, query: string) => ReactNode;
};

type Props<T> = {
  title: string;
  subtitle?: string;
  columns: GridColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  /** File name for the CSV export (without extension). */
  exportName?: string;
};

type IconProps = { className?: string };
const svg = (path: ReactNode) =>
  function GridIcon({ className = "h-4 w-4" }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {path}
      </svg>
    );
  };
const SearchIcon = svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
const FilterIcon = svg(<path d="M3 5h18l-7 8v6l-4-2v-4z" />);
const CloseIcon = svg(<path d="M18 6 6 18M6 6l12 12" />);
const UpIcon = svg(<path d="M12 19V5M5 12l7-7 7 7" />);
const DownIcon = svg(<path d="M12 5v14M19 12l-7 7-7-7" />);
const SortIcon = svg(<path d="m7 15 5 5 5-5M7 9l5-5 5 5" />);
const LeftIcon = svg(<path d="m15 18-6-6 6-6" />);
const RightIcon = svg(<path d="m9 18 6-6-6-6" />);
const DownloadIcon = svg(<path d="M12 3v12M7 10l5 5 5-5M5 21h14" />);
const InboxIcon = svg(<><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" /></>);

/** Highlights each occurrence of `query` inside `text`. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;
  const parts: ReactNode[] = [];
  const lower = text.toLowerCase();
  let i = 0;
  let idx = lower.indexOf(q);
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={idx} className="rounded-[3px] bg-amber-200/80 px-0.5 text-zinc-900 dark:bg-amber-400/30 dark:text-amber-100">
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    i = idx + q.length;
    idx = lower.indexOf(q, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

function ColumnFilter({ label, id, value, onChange }: { label: string; id: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = Boolean(value.trim());

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Filter by ${label}`}
        aria-expanded={open}
        title={`Filter ${label}`}
        className={`grid h-6 w-6 place-items-center rounded-md transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none ${
          active
            ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500"
            : "text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
        }`}
      >
        <FilterIcon className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-30 w-56 rounded-xl border border-zinc-200 bg-white p-2.5 normal-case shadow-lg ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-800 dark:ring-white/10">
          <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Filter {label}
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              id={id}
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pr-7 pl-8 text-[13px] font-normal tracking-normal text-zinc-800 placeholder:text-zinc-400 focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
            {active && (
              <button
                type="button"
                onClick={() => onChange("")}
                aria-label={`Clear ${label} filter`}
                className="absolute top-1/2 right-1.5 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

const csvCell = (value: string | number) => {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Searchable data grid: global search, per-column filters, tri-state sorting,
 * pagination and CSV export of the filtered/sorted rows.
 */
export default function DataGrid<T>({ title, subtitle, columns, rows, rowKey, pageSize = 8, exportName = "export" }: Props<T>) {
  const [query, setQuery] = useState("");
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [perPage, setPerPage] = useState(pageSize);
  const [page, setPage] = useState(1);

  const setColFilter = (key: string, value: string) => {
    setColFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !columns.some((c) => c.searchable && String(c.value(row)).toLowerCase().includes(q))) return false;
      return columns.every((c) => {
        const f = (colFilters[c.key] ?? "").trim().toLowerCase();
        return !f || String(c.value(row)).toLowerCase().includes(f);
      });
    });
  }, [rows, columns, query, colFilters]);

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!col || !sort) return filtered;
    return [...filtered].sort((a, b) => {
      const av = col.value(a);
      const bv = col.value(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), "en-IN", { numeric: true });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort, columns]);

  const showAll = perPage === 0;
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(sorted.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paged = showAll ? sorted : sorted.slice((currentPage - 1) * perPage, currentPage * perPage);
  const activeFilters = Object.keys(colFilters).length + (query.trim() ? 1 : 0);

  const toggleSort = (key: string) => {
    setSort((prev) => (prev?.key !== key ? { key, dir: "asc" } : prev.dir === "asc" ? { key, dir: "desc" } : null));
    setPage(1);
  };

  const clearAll = () => {
    setQuery("");
    setColFilters({});
    setPage(1);
  };

  const exportCsv = () => {
    const lines = [columns.map((c) => csvCell(c.label)).join(","), ...sorted.map((row) => columns.map((c) => csvCell(c.value(row))).join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const align = (a?: GridColumn<T>["align"]) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");
  const justify = (a?: GridColumn<T>["align"]) => (a === "right" ? "justify-end" : a === "center" ? "justify-center" : "justify-start");
  const pagerButton =
    "grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-all duration-200 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

  return (
    <section className="w-full rounded-2xl border border-zinc-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(79,70,229,0.18)] dark:border-zinc-800 dark:bg-zinc-900">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle ? `${subtitle} · ` : ""}
            {sorted.length} {sorted.length === 1 ? "record" : "records"}
            {activeFilters > 0 && (
              <>
                {" · "}
                <button type="button" onClick={clearAll} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  Clear filters
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search all columns…"
              aria-label="Search all columns"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pr-8 pl-9 text-[13.5px] text-zinc-800 placeholder:text-zinc-400 transition-all duration-200 focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-200/70 hover:text-zinc-600 dark:hover:bg-zinc-700"
              >
                <CloseIcon />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] font-medium text-zinc-700 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <DownloadIcon />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full border-collapse text-left text-[13.5px]">
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((col) => {
                const isSorted = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={col.sortable ? (isSorted ? (sort.dir === "asc" ? "ascending" : "descending") : "none") : undefined}
                    className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-[11.5px] font-semibold tracking-[0.04em] whitespace-nowrap text-zinc-500 uppercase dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    <div className={`flex items-center gap-1.5 ${justify(col.align)}`}>
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="group inline-flex items-center gap-1 rounded uppercase transition-colors hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:hover:text-zinc-100"
                        >
                          <span>{col.label}</span>
                          {isSorted ? (
                            sort.dir === "asc" ? (
                              <UpIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <DownIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            )
                          ) : (
                            <SortIcon className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-400 dark:text-zinc-600" />
                          )}
                        </button>
                      ) : (
                        <span>{col.label}</span>
                      )}
                      {col.searchable && (
                        <ColumnFilter
                          label={col.label}
                          id={`grid-filter-${col.key}`}
                          value={colFilters[col.key] ?? ""}
                          onChange={(v) => setColFilter(col.key, v)}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                      <InboxIcon className="h-6 w-6" />
                    </span>
                    <p className="text-[14px] font-medium text-zinc-700 dark:text-zinc-200">No matching records</p>
                    <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">Try adjusting your search or filters.</p>
                    {activeFilters > 0 && (
                      <button type="button" onClick={clearAll} className="mt-1 rounded-lg px-3 py-1.5 text-[13px] font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
                        Clear all filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="transition-colors odd:bg-white even:bg-zinc-50/60 hover:bg-indigo-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-800/40 dark:hover:bg-indigo-500/10"
                >
                  {columns.map((col) => {
                    const q = col.searchable ? colFilters[col.key] || query : "";
                    return (
                      <td
                        key={col.key}
                        className={`border-b border-zinc-100 px-4 py-3 whitespace-nowrap text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 ${align(col.align)}`}
                      >
                        {col.render ? col.render(row, q) : <Highlight text={String(col.value(row))} query={q} />}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div className="flex items-center gap-2 text-[12.5px] text-zinc-500 dark:text-zinc-400">
          <label htmlFor={`${exportName}-page-size`} className="font-medium">
            Rows per page
          </label>
          <select
            id={`${exportName}-page-size`}
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-zinc-200 bg-white py-1 pr-6 pl-2 text-[12.5px] font-medium text-zinc-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {[5, 8, 10, 25].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value={0}>All</option>
          </select>
        </div>
        {!showAll && sorted.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] tabular-nums text-zinc-500 dark:text-zinc-400">
              {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, sorted.length)} of {sorted.length}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Previous page" className={pagerButton}>
                <LeftIcon />
              </button>
              <span className="min-w-[3.5rem] text-center text-[12.5px] font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
                {currentPage} / {totalPages}
              </span>
              <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Next page" className={pagerButton}>
                <RightIcon />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
