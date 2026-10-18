"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import Modal from "./Modal";

/**
 * "Are you sure?" dialog for destructive actions. `onConfirm` may throw; its
 * message is shown in the dialog and the dialog stays open.
 */
export default function ConfirmDialog({
  open,
  title,
  confirmLabel,
  busyLabel,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  busyLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setError("");
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={title} onClose={close} size="sm">
      <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">{children}</div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={close}>
          Cancel
        </Button>
        <Button variant="danger" loading={busy} onClick={confirm}>
          {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
