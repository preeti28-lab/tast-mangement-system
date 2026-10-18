"use client";

import { useState, type FormEvent } from "react";
import FormAlert from "@/components/auth/FormAlert";
import FormField from "@/components/auth/FormField";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, fieldControlClass } from "@/components/ui/Field";
import Modal from "@/components/ui/Modal";
import { useUser } from "@/components/layout/UserContext";
import { can } from "@/lib/permissions";
import {
  ApiError,
  OfflineQueuedError,
  taskApi,
  type FieldErrors,
  type Task,
  type TaskInput,
  type TaskPriority,
  type TaskRecurrence,
  type TaskStatus,
  type UserRef,
} from "@/lib/api";
import { dueToIso, toDateInput, toTimeInput, todayInput } from "@/lib/format";
import { PRIORITY_OPTIONS, RECURRENCE_OPTIONS, STATUS_OPTIONS } from "./options";

export type SaveResult =
  | { mode: "created" | "updated"; task: Task; nextOccurrence?: Task }
  | { mode: "queued" };

type Props = {
  open: boolean;
  task: Task | null; // null = create
  users: UserRef[];
  onClose: () => void;
  onSaved: (result: SaveResult) => void;
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
  dueTime: string; // HH:MM, or "" for end of day
  priority: TaskPriority;
  status: TaskStatus;
  recurrence: TaskRecurrence;
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
  const initialTime = toTimeInput(task?.dueDate);
  const [values, setValues] = useState<FormValues>({
    title: task?.title ?? "",
    description: task?.description ?? "",
    dueDate: initialDue,
    dueTime: initialTime,
    priority: task?.priority ?? "medium",
    status: task?.status ?? "todo",
    recurrence: task?.recurrence ?? "none",
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
    const dueChanged = values.dueDate !== initialDue || values.dueTime !== initialTime;
    if (
      values.dueDate &&
      values.dueTime &&
      dueChanged &&
      !found.dueDate &&
      new Date(dueToIso(values.dueDate, values.dueTime)) <= new Date()
    )
      found.dueTime = "This time has already passed";
    if (values.recurrence !== "none" && !values.dueDate)
      found.dueDate = "Recurring tasks need a due date";
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
      dueDate: values.dueDate ? dueToIso(values.dueDate, values.dueTime) : null,
      priority: values.priority,
      status: values.status,
      recurrence: values.recurrence,
      assignedTo: values.assignedTo || null,
    };

    setSaving(true);
    try {
      if (task) {
        const { task: saved, nextOccurrence } = await taskApi.update(task._id, payload);
        onSaved({ mode: "updated", task: saved, nextOccurrence });
      } else {
        const { task: saved } = await taskApi.create(payload);
        onSaved({ mode: "created", task: saved });
      }
    } catch (err) {
      if (err instanceof OfflineQueuedError) {
        onSaved({ mode: "queued" });
        return;
      }
      const apiErr = err as ApiError;
      setErrors(apiErr.errors ?? {});
      setFormError(apiErr.message);
      setSaving(false);
    }
  };

  // Without "Assign tasks to others" only yourself (or the current assignee) can be picked.
  const mayAssignOthers = can(user, "tasks.assignOthers");
  const others = users.filter((u) => u._id !== user._id && (mayAssignOthers || u._id === task?.assignedTo?._id));

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

      <Field
        id="description"
        label="Description"
        optional
        error={errors.description}
        hint={<span className="block text-right">{values.description.length}/2000</span>}
      >
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          value={values.description}
          onChange={onChange}
          placeholder="Add details, links or acceptance criteria"
          className={`${fieldControlClass(errors.description)} resize-y py-2.5`}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="dueDate" label="Due date" error={errors.dueDate}>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            min={todayInput()}
            value={values.dueDate}
            onChange={onChange}
            aria-invalid={!!errors.dueDate}
            className={fieldControlClass(errors.dueDate)}
          />
        </Field>

        <Field
          id="dueTime"
          label="Due time"
          optional
          error={errors.dueTime}
          hint={values.dueDate ? "Blank = end of day. You'll get a reminder 1 hour before." : "Pick a due date first."}
        >
          <input
            id="dueTime"
            name="dueTime"
            type="time"
            value={values.dueTime}
            onChange={onChange}
            disabled={!values.dueDate}
            aria-invalid={!!errors.dueTime}
            aria-describedby="dueTime-hint"
            className={fieldControlClass(errors.dueTime)}
          />
        </Field>

        <SelectField
          id="assignedTo"
          label="Assign to"
          value={values.assignedTo}
          onChange={onChange}
          error={errors.assignedTo}
          hint={!mayAssignOthers ? "Your role can assign tasks only to yourself." : undefined}
          options={[
            { value: "", label: "Unassigned" },
            { value: user._id, label: `Me (${user.name})` },
            ...others.map((u) => ({ value: u._id, label: `${u.name} (${u.email})` })),
          ]}
        />

        <SelectField id="priority" label="Priority" value={values.priority} onChange={onChange} options={PRIORITY_OPTIONS} />

        <SelectField id="status" label="Status" value={values.status} onChange={onChange} options={STATUS_OPTIONS} />

        <SelectField
          id="recurrence"
          label="Repeat"
          value={values.recurrence}
          onChange={onChange}
          options={RECURRENCE_OPTIONS}
          hint={
            values.recurrence !== "none"
              ? "When this task is completed, the next one is created automatically with the due date moved forward."
              : undefined
          }
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving} className="sm:min-w-40">
          {saving ? "Saving…" : task ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  );
}
