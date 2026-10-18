import AuditLog from "../models/AuditLog.js";

const involvedIn = (task) =>
  task ? [task.createdBy?._id ?? task.createdBy, task.assignedTo?._id ?? task.assignedTo].filter(Boolean) : [];

/**
 * Records an audit entry. Failures are logged but never break the request,
 * since the user's action has already succeeded.
 */
export async function logAudit({ actor, action, task = null, changes = [], targetUser = null, extraInvolved = [] }) {
  try {
    await AuditLog.create({
      actor: actor?._id ?? actor ?? null,
      action,
      task: task?._id ?? null,
      taskTitle: task?.title ?? "",
      targetUser,
      involved: [...involvedIn(task), ...extraInvolved],
      changes,
    });
  } catch (error) {
    console.error(`Audit log failed (${action}): ${error.message}`);
  }
}

const AUDITED_FIELDS = ["title", "description", "dueDate", "priority", "status", "assignedTo", "recurrence"];

const normalise = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && value._id) return value._id.toString();
  return value?.toString?.() ?? value ?? null;
};

/** Field-level diff between a task snapshot and its updated version. */
export function diffTask(before, after) {
  return AUDITED_FIELDS.filter((field) => normalise(before[field]) !== normalise(after[field])).map(
    (field) => ({ field, from: normalise(before[field]), to: normalise(after[field]) })
  );
}
