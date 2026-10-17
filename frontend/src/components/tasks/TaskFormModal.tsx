"use client";

import { useState, type FormEvent } from "react";
import FormAlert from "@/components/auth/FormAlert";
import FormField from "@/components/auth/FormField";
import SubmitButton from "@/components/auth/SubmitButton";
import Modal from "@/components/ui/Modal";
import { useUser } from "@/components/layout/UserContext";
import {
  ApiError,
  taskApi,
  type FieldErrors,
  type Task,
  type TaskInput,
  type TaskPriority,
  type TaskStatus,
  type UserRef,
} from "@/lib/api";
import { dateInputToIso, toDateInput, todayInput } from "@/lib/format";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, selectClass } from "./options";

type Props = {
  open: boolean;
  task: Task | null; // null = create
  users: UserRef[];
  onClose: () => void;
  onSaved: (task: Task, mode: "created" | "updated") => void;
};

export default function TaskFormModal({ open, task, users, onClose, onSaved }: Props) {
  return (
    <Modal open={open} title={task ? "Edit task" : "New task"} onClose={onClose}>
      {/* Keyed so the form resets whenever a different task is opened. */}
      <TaskForm key={task?._id ?? "new"} task={task} users={users} onCancel={onClose} onSaved={onSaved} />
    </Modal>
  );
}

type FormValues = {
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string;
};

function TaskForm({
  task,
  users,
  onCancel,
  onSaved,
}: {
  task: Task | null;
  users: UserRef[];
  onCancel: () => void;
  onSaved: Props["onSaved"];
}) {
  const { user } = useUser();
  const initialDue = toDateInput(task?.dueDate);
  const [values, setValues] = useState<FormValues>({
    title: task?.title ?? "",
    description: task?.description ?? "",
    dueDate: initialDue,
    priority: task?.priority ?? "medium",
    status: task?.status ?? "todo",
    assignedTo: task?.assignedTo?._id ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const validate = (): FieldErrors => {
    const found: FieldErrors = {};
    const title = values.title.trim();
    if (!title) found.title = "Title is required";
    else if (title.length > 120) found.title = "Title must be at most 120 characters";
    if (values.description.length > 2000)
      found.description = "Description must be at most 2000 characters";
    // Past dates are blocked for new or changed due dates, but an existing
    // overdue date can be kept while editing other fields.
    if (values.dueDate && values.dueDate !== initialDue && values.dueDate < todayInput())
      found.dueDate = "Due date can't be in the past";
    return found;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload: TaskInput = {
      title: values.title.trim(),
      description: values.description.trim(),
      dueDate: values.dueDate ? dateInputToIso(values.dueDate, "end") : null,
      priority: values.priority,
      status: values.status,
      assignedTo: values.assignedTo || null,
    };

    setSaving(true);
    try {
      const { task: saved } = task
        ? await taskApi.update(task._id, payload)
        : await taskApi.create(payload);
      onSaved(saved, task ? "updated" : "created");
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.errors ?? {});
      setFormError(apiErr.message);
      setSaving(false);
    }
  };

  const others = users.filter((u) => u._id !== user._id);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormAlert message={formError} />
      <FormField
        label="Title"
        name="title"
        placeholder="e.g. Prepare sprint demo"
        value={values.title}
        onChange={onChange}
        error={errors.title}
        maxLength={120}
        autoFocus
      />

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Description <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          value={values.description}
          onChange={onChange}
          placeholder="Add details, links or acceptance criteria"
          className={`${selectClass} block w-full resize-y py-2.5`}
        />
        <div className="flex justify-between text-xs">
          <span className="text-red-600 dark:text-red-400">{errors.description}</span>
          <span className="text-zinc-400">{values.description.length}/2000</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="dueDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Due date
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            min={todayInput()}
            value={values.dueDate}
            onChange={onChange}
            aria-invalid={!!errors.dueDate}
            className={`${selectClass} block w-full ${errors.dueDate ? "border-red-500" : ""}`}
          />
          {errors.dueDate && <p className="text-xs text-red-600 dark:text-red-400">{errors.dueDate}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="assignedTo" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Assign to
          </label>
          <select
            id="assignedTo"
            name="assignedTo"
            value={values.assignedTo}
            onChange={onChange}
            className={`${selectClass} block w-full`}
          >
            <option value="">Unassigned</option>
            <option value={user._id}>Me ({user.name})</option>
            {others.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          {errors.assignedTo && (
            <p className="text-xs text-red-600 dark:text-red-400">{errors.assignedTo}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="priority" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Priority
          </label>
          <select id="priority" name="priority" value={values.priority} onChange={onChange} className={`${selectClass} block w-full`}>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="status" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Status
          </label>
          <select id="status" name="status" value={values.status} onChange={onChange} className={`${selectClass} block w-full`}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <div className="sm:w-40">
          <SubmitButton loading={saving}>
            {saving ? "Saving..." : task ? "Save changes" : "Create task"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
