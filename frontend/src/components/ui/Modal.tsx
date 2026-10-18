"use client";

import { useEffect, useRef } from "react";
import { XIcon } from "@/components/icons";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "lg";
};

export default function Modal({ open, title, onClose, children, size = "lg" }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-[fade-in_200ms_ease-out] absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`modal-panel glass-strong relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl pb-[env(safe-area-inset-bottom)] outline-none sm:rounded-2xl sm:pb-0 ${
          size === "sm" ? "sm:max-w-md" : "sm:max-w-xl"
        }`}
      >
        {/* Grab handle on the phone bottom sheet */}
        <span className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-300/80 sm:hidden dark:bg-slate-600" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h2 className="truncate text-lg font-bold text-fg">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-hover hover:text-fg"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
