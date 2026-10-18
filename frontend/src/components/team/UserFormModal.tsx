"use client";

import { useState, type FormEvent } from "react";
import FormAlert from "@/components/auth/FormAlert";
import FormField from "@/components/auth/FormField";
import { selectClass } from "@/components/tasks/options";
import Modal from "@/components/ui/Modal";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/Surface";
import { userApi, type ApiError, type FieldErrors, type Role, type User, type UserRef } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/permissions";

export type Member = UserRef & { role: Role; createdAt: string };

const ROLE_HINT: Record<Role, string> = {
  admin: "Full access, including role access settings",
  manager: "Team access as set in Settings → Role access",
  user: "Their own tasks, plus whatever members are granted",
};

/** Add a member, or edit one (name, email, role, optional new password). */
export default function UserFormModal({
  open,
  member,
  actor,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null = create a new member. */
  member: Member | null;
  actor: User;
  onClose: () => void;
  onSaved: (member: Member, created: boolean) => void;
}) {
  const editing = !!member;
  // Keyed by the member so the form resets when a different one is opened.
  return (
    <Modal open={open} title={editing ? `Edit ${member.name}` : "Add a member"} onClose={onClose} size="sm">
      {open && <UserForm key={member?._id ?? "new"} member={member} actor={actor} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function UserForm({
  member,
  actor,
  onClose,
  onSaved,
}: {
  member: Member | null;
  actor: User;
  onClose: () => void;
  onSaved: (member: Member, created: boolean) => void;
}) {
  const editing = !!member;
  const isSelf = member?._id === actor._id;
  const [values, setValues] = useState({
    name: member?.name ?? "",
    email: member?.email ?? "",
    role: (member?.role ?? "user") as Role,
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Only admins may hand out the admin role.
  const roles = (Object.keys(ROLE_LABELS) as Role[]).filter((r) => r !== "admin" || actor.role === "admin");

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((err) => ({ ...err, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    const found: FieldErrors = {};
    if (values.name.trim().length < 2) found.name = "Name must be 2–50 characters";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) found.email = "Please enter a valid email";
    if ((!editing || values.password) && values.password.length < 8) found.password = "Password must be at least 8 characters";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const body = { name: values.name.trim(), email: values.email.trim(), role: values.role };
      const { user } = editing
        ? await userApi.update(member._id, { ...body, ...(values.password ? { password: values.password } : {}) })
        : await userApi.create({ ...body, password: values.password });
      onSaved(user as Member, !editing);
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.errors ?? {});
      if (!Object.keys(apiErr.errors ?? {}).length) setFormError(apiErr.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <FormAlert message={formError} />}
      <FormField label="Full name" name="name" value={values.name} maxLength={50} onChange={set("name")} error={errors.name} autoComplete="off" />
      <FormField label="Email" name="email" type="email" value={values.email} onChange={set("email")} error={errors.email} autoComplete="off" />

      <div className="space-y-1.5">
        <label htmlFor="member-role" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Role
        </label>
        <select id="member-role" value={values.role} onChange={set("role")} disabled={isSelf} className={`${selectClass} w-full`}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">{isSelf ? "You can't change your own role." : ROLE_HINT[values.role]}</p>
        {errors.role && <p className="text-xs text-red-600 dark:text-red-400">{errors.role}</p>}
      </div>

      <FormField
        label={editing ? "New password (optional)" : "Temporary password"}
        name="password"
        type="password"
        value={values.password}
        onChange={set("password")}
        error={errors.password}
        autoComplete="new-password"
        placeholder={editing ? "Leave empty to keep the current one" : "At least 8 characters"}
      />
      {!editing && <p className="-mt-2 text-xs text-muted">Share it with them; they can change it on their profile page.</p>}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {editing ? "Save changes" : "Add member"}
        </button>
      </div>
    </form>
  );
}

/** Confirms removing a member and explains what happens to their tasks. */
export function DeleteUserDialog({
  member,
  onClose,
  onDeleted,
}: {
  member: Member | null;
  onClose: () => void;
  onDeleted: (member: Member, result: { unassignedTasks: number; movedTasks: number }) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setError("");
    onClose();
  };

  const confirm = async () => {
    if (!member) return;
    setDeleting(true);
    setError("");
    try {
      const result = await userApi.remove(member._id);
      onDeleted(member, result);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={!!member} title="Remove member" onClose={close} size="sm">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Remove <span className="font-semibold text-fg">{member?.name}</span> ({member?.email}) from the team? They won&apos;t be able to log in.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>Tasks assigned to them become unassigned.</li>
        <li>Tasks they created are handed over to you.</li>
      </ul>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button onClick={close} className={secondaryButtonClass}>
          Cancel
        </button>
        <button
          onClick={confirm}
          disabled={deleting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
        >
          {deleting ? "Removing…" : "Remove member"}
        </button>
      </div>
    </Modal>
  );
}
