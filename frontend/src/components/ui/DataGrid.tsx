"use client";

import { useMemo, useState, type ReactNode } from "react";
import { downloadCsv } from "@/lib/csv";
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
} from "./table";

export type GridColumn<T> = {
  key: string;
  label: string;
  /** Raw value used for search, sorting and CSV export. */
  value: (row: T) => string | number;
  /** Optional value to sort by instead of `value` (e.g. a timestamp behind a formatted date). */
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  searchable?: boolean;
  align?: "left" | "right" | "center";
  /** Custom cell; defaults to the value with search matches highlighted. */
  render?: (row: T, query: string) => ReactNode;
  /** Set false for UI-only columns (e.g. action buttons) to leave them out of the CSV. */
  exportable?: boolean;
  /** Heading of the phone card for each row (defaults to the first column). */
  primary?: boolean;
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
  /** Extra toolbar controls shown next to search/export. */
  actions?: ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
  emptyTitle?: string;
  emptyText?: string;
};

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
      <mark key={idx} className="rounded-[3px] bg-amber-200/80 px-0.5 text-slate-900 dark:bg-amber-400/30 dark:text-amber-100">
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    i = idx + q.length;
    idx = lower.indexOf(q, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

/**
 * Searchable data grid: global search, per-column filters, tri-state sorting,
 * pagination and CSV export of the filtered/sorted rows.
 */
export default function DataGrid<T>({
  title,
  subtitle,
  columns,
  rows,
  rowKey,
  pageSize = 8,
  exportName = "export",
  actions,
  initialSort,
  emptyTitle = "No matching records",
  emptyText,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);
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
      const get = col.sortValue ?? col.value;
      const av = get(a);
      const bv = get(b);
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
    const cols = columns.filter((c) => c.exportable !== false);
    downloadCsv(exportName, cols.map((c) => c.label), sorted.map((row) => cols.map((c) => c.value(row))));
  };

  const align = (a?: GridColumn<T>["align"]) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");
  const justify = (a?: GridColumn<T>["align"]) => (a === "right" ? "justify-end" : a === "center" ? "justify-center" : "justify-start");
  const cell = (row: T, col: GridColumn<T>) => {
    const q = col.searchable ? colFilters[col.key] || query : "";
    return col.render ? col.render(row, q) : <Highlight text={String(col.value(row))} query={q} />;
  };
  const lead = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== lead);
  const empty = (
    <TableEmpty filtered={activeFilters > 0} title={emptyTitle} text={emptyText ?? "Nothing here yet."} onClear={clearAll} />
  );

  return (
    <TableCard>
      <TableToolbar title={title} subtitle={subtitle} count={sorted.length} activeFilters={activeFilters} onClear={clearAll}>
        {actions}
        <SearchField
          value={query}
          onChange={(v) => {
            setQuery(v);
            setPage(1);
          }}
          placeholder="Search all columns…"
          label="Search all columns"
        />
        <ExportButton onClick={exportCsv} disabled={sorted.length === 0} label="Export CSV" />
      </TableToolbar>

      {/* Below xl: one tile per row with label/value pairs (two columns from md) */}
      <div className="xl:hidden">
        {paged.length === 0 ? (
          empty
        ) : (
          <ul className="divide-y divide-line md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:p-4">
            {paged.map((row) => (
              <li
                key={rowKey(row)}
                className="space-y-2.5 px-4 py-4 transition-colors even:glass-row md:rounded-xl md:border md:border-line md:bg-white/40 md:even:bg-white/40 dark:md:bg-white/[0.03] dark:md:even:bg-white/[0.03]"
              >
                {lead && <div className="font-semibold text-fg">{cell(row, lead)}</div>}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                  {rest.map((col) =>
                    col.label ? (
                      <div key={col.key} className="min-w-0">
                        <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{col.label}</dt>
                        <dd className="mt-0.5 truncate text-slate-700 dark:text-slate-300">{cell(row, col)}</dd>
                      </div>
                    ) : (
                      // Unlabelled columns are row actions: full width, right-aligned.
                      <dd key={col.key} className="col-span-2 flex justify-end empty:hidden">
                        {cell(row, col)}
                      </dd>
                    )
                  )}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* xl and up: full table */}
      <div className="hidden max-h-[560px] overflow-auto xl:block">
        <table className="w-full border-collapse text-left text-[13.5px]">
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((col) => {
                const dir = sort?.key === col.key ? sort.dir : null;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={col.sortable ? (dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none") : undefined}
                    className={thClass}
                  >
                    <div className={`flex items-center gap-1.5 ${justify(col.align)}`}>
                      {col.sortable ? <SortHeader label={col.label} dir={dir} onClick={() => toggleSort(col.key)} /> : <span>{col.label}</span>}
                      {col.searchable && (
                        <FilterPopover label={col.label.toLowerCase()} active={Boolean(colFilters[col.key]?.trim())}>
                          <input
                            type="text"
                            value={colFilters[col.key] ?? ""}
                            onChange={(e) => setColFilter(col.key, e.target.value)}
                            placeholder={`Search ${col.label.toLowerCase()}…`}
                            aria-label={`Filter ${col.label}`}
                            className={popoverInputClass}
                          />
                        </FilterPopover>
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
                <td colSpan={columns.length}>{empty}</td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr key={rowKey(row)} className={rowClass}>
                  {columns.map((col) => (
                    <td key={col.key} className={`${tdClass} whitespace-nowrap text-slate-700 dark:text-slate-300 ${align(col.align)}`}>
                      {cell(row, col)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TableFooter
        id={`${exportName}-page-size`}
        perPage={perPage}
        perPageOptions={[5, 8, 10, 25]}
        onPerPageChange={(n) => {
          setPerPage(n);
          setPage(1);
        }}
        allowAll
        page={currentPage}
        pages={totalPages}
        from={(currentPage - 1) * perPage + 1}
        to={Math.min(currentPage * perPage, sorted.length)}
        total={sorted.length}
        onPageChange={setPage}
      />
    </TableCard>
  );
}
