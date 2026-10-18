"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircleIcon, ChevronDownIcon, XIcon } from "@/components/icons";
import { useFloating } from "./floating";

export type DropdownOption = {
  value: string;
  label: string;
  /** Tailwind background class for a small color dot (e.g. "bg-red-500"). */
  dot?: string;
};

/**
 * Glass dropdown (listbox) used for filters: trigger shows the choice with a
 * color dot, the menu has a check on the selected row and an "All" reset.
 * Keyboard: arrows/Home/End move, Enter/Space pick, Escape closes.
 */
export default function Dropdown({
  value,
  onChange,
  options,
  allLabel,
  label,
  size = "md",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  /** Label of the empty-value "show everything" choice. */
  allLabel: string;
  /** Accessible name, e.g. "Status filter". */
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const style = useFloating(triggerRef, open, { width: 200 });

  const items: DropdownOption[] = [{ value: "", label: allLabel }, ...options];
  const selected = items.find((o) => o.value === value) ?? items[0];

  const openMenu = () => {
    setActive(Math.max(0, items.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onListKey = (e: React.KeyboardEvent) => {
    const last = items.length - 1;
    if (e.key === "ArrowDown") setActive((i) => Math.min(last, i + 1));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(last);
    else if (e.key === "Enter" || e.key === " ") pick(items[active].value);
    else if (e.key === "Tab") return setOpen(false);
    else if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    } else return;
    e.preventDefault();
    // Keep the key from closing a filter popover this dropdown sits in.
    e.stopPropagation();
  };

  const sm = size === "sm";
  const isSet = value !== "";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openMenu();
          }
        }}
        className={`group inline-flex min-w-0 items-center gap-2 rounded-xl border bg-surface/60 text-left font-medium normal-case tracking-normal backdrop-blur-md transition-all duration-200 hover:bg-surface/90 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:outline-none ${
          sm ? "h-8 px-2.5 text-[12.5px]" : "h-10 px-3 text-[13.5px]"
        } ${
          isSet
            ? "border-brand-400/60 text-brand-700 shadow-[0_0_0_3px_rgba(34,197,94,0.10)] dark:text-brand-300"
            : "border-line text-fg"
        } ${open ? "border-brand-500 ring-2 ring-brand-500/25" : ""} ${className}`}
      >
        {selected.dot && <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dot}`} aria-hidden="true" />}
        <span className="min-w-0 flex-1 truncate">{selected.label}</span>
        <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            aria-activedescendant={`${listId}-${active}`}
            tabIndex={-1}
            style={style}
            onKeyDown={onListKey}
            // A click here must not count as "outside" for a filter popover around the trigger.
            onMouseDown={(e) => e.stopPropagation()}
            className="glass-menu dropdown-in max-h-72 overflow-y-auto rounded-xl p-1.5 text-[13.5px] outline-none"
          >
            {items.map((o, i) => {
              const isSel = o.value === value;
              return (
                <li
                  key={o.value || "__all"}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o.value)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                    i === active ? "bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200" : "text-fg"
                  } ${i === 0 ? "mb-1 border-b border-line pb-2.5 text-muted" : ""}`}
                >
                  {o.dot ? (
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/60 dark:ring-black/20 ${o.dot}`} aria-hidden="true" />
                  ) : i === 0 ? (
                    <XIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  ) : (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
                  )}
                  <span className={`min-w-0 flex-1 truncate ${isSel ? "font-semibold" : ""}`}>{o.label}</span>
                  {isSel && <CheckCircleIcon className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
}
