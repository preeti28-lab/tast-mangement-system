"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FilterIcon,
  InboxIcon,
  SearchIcon,
  SortIcon,
  XIcon,
} from "@/components/icons";
import { useFloating } from "./floating";

// Shared building blocks for the glass data tables (DataGrid, TasksTable).

export const thClass =
  "glass-head border-b border-line px-4 py-3 text-[11.5px] font-semibold tracking-[0.04em] whitespace-nowrap text-muted uppercase";

export const tdClass = "border-b border-line px-4 py-3 align-middle";

export const rowClass =
  "transition-colors even:glass-row hover:bg-brand-50/60 hover:[&>td:first-child]:shadow-[inset_3px_0_0_var(--brand)] dark:hover:bg-brand-500/10";

/** Small input/select used inside filter popovers. */
export const popoverInputClass =
  "w-full rounded-lg border border-line bg-surface/70 px-2.5 py-1.5 text-[13px] font-normal tracking-normal text-fg normal-case placeholder:text-slate-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:outline-none";

export const toolbarButtonClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface/60 px-3 py-2 text-[13px] font-medium text-slate-700 shadow-sm backdrop-blur-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-surface/90 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:translate-y-0 disabled:opacity-50 dark:text-slate-200";

const pagerButtonClass =
  "grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface/60 text-slate-600 backdrop-blur-md transition-all duration-200 hover:bg-surface/90 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8 dark:text-slate-300";

const smallSelectClass =
  "rounded-lg border border-line bg-surface/60 py-1 pr-6 pl-2 text-[12.5px] font-medium text-fg focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none";

/** Glass card that wraps a table: toolbar, body, footer. */
export function TableCard({ children }: { children: ReactNode }) {
  return <section className="glass w-full overflow-hidden rounded-2xl">{children}</section>;
}

/** Title, record count and "Clear filters" on the left; controls on the right. */
export function TableToolbar({
  title,
  subtitle,
  count,
  activeFilters,
  onClear,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  count: number;
  activeFilters: number;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h3 className="truncate text-lg font-bold text-fg">{title}</h3>
        <p className="mt-0.5 text-sm text-muted">
          {subtitle ? <>{subtitle} · </> : null}
          {count} {count === 1 ? "record" : "records"}
          {activeFilters > 0 && (
            <>
              {" · "}
              <button type="button" onClick={onClear} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                Clear filters
              </button>
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** Search box with icon and clear button. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  maxLength?: number;
}) {
  return (
    <div className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
      {/* z-10: the input's backdrop-filter would otherwise paint over the icon */}
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        maxLength={maxLength}
        className="w-full rounded-xl border border-line bg-surface/60 py-2 pr-8 pl-9 text-[13.5px] text-fg placeholder:text-slate-400 backdrop-blur-md transition-all duration-200 focus-visible:border-brand-500 focus-visible:bg-surface/90 focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-hover hover:text-slate-600"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** "Export" toolbar button with a spinner while busy. */
export function ExportButton({ onClick, busy = false, disabled = false, label = "Export" }: { onClick: () => void; busy?: boolean; disabled?: boolean; label?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={busy || disabled} aria-label={busy ? "Exporting…" : label} title={label} className={toolbarButtonClass}>
      {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" /> : <DownloadIcon className="h-4 w-4" />}
      <span className="hidden sm:inline">{busy ? "Exporting…" : label}</span>
    </button>
  );
}

/** Up/down/neutral arrow for a sortable column. */
export function SortArrow({ dir }: { dir: "asc" | "desc" | null }) {
  if (dir === "asc") return <ArrowUpIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />;
  if (dir === "desc") return <ArrowDownIcon className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />;
  return <SortIcon className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-400 dark:text-slate-600" />;
}

/** Column-header sort button. */
export function SortHeader({ label, dir, onClick }: { label: string; dir: "asc" | "desc" | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Sort by ${label}`}
      className="group inline-flex items-center gap-1 rounded uppercase transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
    >
      <span>{label}</span>
      <SortArrow dir={dir} />
    </button>
  );
}

/** Funnel button that opens a small glass popover; closes on outside click or Escape.
 *  The panel is portalled with fixed positioning so short tables don't clip it. */
export function FilterPopover({ label, active, children }: { label: string; active: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const style = useFloating(buttonRef, open, { width: 256 });

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("input, select, button")?.focus();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
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
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Filter by ${label}`}
        aria-expanded={open}
        title={`Filter ${label}`}
        className={`grid h-6 w-6 place-items-center rounded-md transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ${
          active
            ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30 dark:bg-brand-500"
            : open
              ? "bg-hover text-fg"
              : "text-slate-400 hover:bg-hover hover:text-slate-600 dark:hover:text-slate-200"
        }`}
      >
        <FilterIcon className="h-3.5 w-3.5" />
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={style}
            className="glass-menu dropdown-in w-64 rounded-2xl p-3.5 text-left font-normal tracking-normal normal-case"
          >
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
              <FilterIcon className="h-3.5 w-3.5 text-brand-500" />
              Filter {label}
            </p>
            {children}
          </div>,
          document.body
        )}
    </span>
  );
}

/** Empty/no-results state for a table body or card list. */
export function TableEmpty({
  filtered,
  title,
  text,
  onClear,
  action,
}: {
  filtered: boolean;
  title: string;
  text: string;
  onClear: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500 ring-1 ring-inset ring-brand-500/10 dark:bg-brand-500/10 dark:text-brand-400">
        <InboxIcon className="h-6 w-6" />
      </span>
      <p className="mt-1 text-[14px] font-semibold text-fg">{filtered ? "No matching records" : title}</p>
      <p className="max-w-xs text-[12.5px] text-muted">{filtered ? "Try adjusting your search or filters." : text}</p>
      {filtered ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 rounded-lg px-3 py-1.5 text-[13px] font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
        >
          Clear all filters
        </button>
      ) : (
        action
      )}
    </div>
  );
}

/** Footer: rows-per-page select and prev/next pager. */
export function TableFooter({
  id,
  perPage,
  perPageOptions,
  onPerPageChange,
  page,
  pages,
  from,
  to,
  total,
  onPageChange,
  allowAll = false,
}: {
  id: string;
  perPage: number;
  perPageOptions: number[];
  onPerPageChange: (n: number) => void;
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (p: number) => void;
  /** Adds an "All" option (value 0) and hides the pager while it's selected. */
  allowAll?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2 text-[12.5px] text-muted">
        <label htmlFor={id} className="font-medium">
          Rows<span className="hidden sm:inline"> per page</span>
        </label>
        <select id={id} value={perPage} onChange={(e) => onPerPageChange(Number(e.target.value))} className={smallSelectClass}>
          {perPageOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          {allowAll && <option value={0}>All</option>}
        </select>
      </div>
      {total > 0 && !(allowAll && perPage === 0) && (
        <div className="flex items-center gap-3">
          <span className="hidden text-[12.5px] tabular-nums text-muted sm:inline">
            {from}–{to} of {total}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page" className={pagerButtonClass}>
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-[12.5px] font-medium tabular-nums text-fg">
              {page} / {pages}
            </span>
            <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pages} aria-label="Next page" className={pagerButtonClass}>
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
