import { userApi, type AuditLog, type UserRef } from "./api";
import { formatDate } from "./format";
import { ROLE_LABELS } from "./permissions";

const STATUS: Record<string, string> = { todo: "To do", in_progress: "In progress", completed: "Completed" };
const PRIORITY: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };
const RECURRENCE: Record<string, string> = { none: "Does not repeat", daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
const FIELD_LABELS: Record<string, string> = {
  title: "title",
  description: "description",
  dueDate: "due date",
  priority: "priority",
  status: "status",
  recurrence: "repeat",
  assignedTo: "assignee",
  name: "name",
  email: "email",
  role: "role",
  password: "password",
};

export type UserDirectory = Map<string, UserRef>;

let directory: Promise<UserDirectory> | null = null;

/** id -> user lookup, used to show names for user ids stored in audit changes. Cached per page load. */
export function getUserDirectory(): Promise<UserDirectory> {
  directory ??= userApi
    .list()
    .then(({ users }) => new Map(users.map((u) => [u._id, u])))
    .catch(() => {
      directory = null;
      return new Map();
    });
  return directory;
}

function formatValue(field: string, value: unknown, users: UserDirectory, currentUserId?: string): string {
  if (value === null || value === undefined || value === "") {
    return field === "assignedTo" ? "nobody" : field === "dueDate" ? "no due date" : "empty";
  }
  const v = String(value);
  switch (field) {
    case "status":
      return STATUS[v] ?? v;
    case "priority":
      return PRIORITY[v] ?? v;
    case "recurrence":
      return RECURRENCE[v] ?? v;
    case "role":
      return ROLE_LABELS[v as keyof typeof ROLE_LABELS] ?? v;
    case "dueDate":
      return formatDate(v);
    case "assignedTo":
      return v === currentUserId ? "you" : (users.get(v)?.name ?? "a former user");
    case "description":
      return v.length > 40 ? `"${v.slice(0, 40)}…"` : `"${v}"`;
    default:
      return `"${v}"`;
  }
}

/** Human-readable sentence for an audit entry. */
export function describeAudit(log: AuditLog, users: UserDirectory, currentUserId?: string): string {
  const actor = log.actor ? (log.actor._id === currentUserId ? "You" : log.actor.name) : "Someone";
  const title = log.taskTitle ? `"${log.taskTitle}"` : "a task";
  const change = (field: string) => log.changes.find((c) => c.field === field);

  switch (log.action) {
    case "task.created":
      return `${actor} created ${title}`;
    case "task.deleted":
      return `${actor} deleted ${title}`;
    case "task.recurred":
      return `Next occurrence of ${title} was created automatically`;
    case "task.assigned": {
      const to = change("assignedTo")?.to;
      return to ? `${actor} assigned ${title} to ${formatValue("assignedTo", to, users, currentUserId)}` : `${actor} unassigned ${title}`;
    }
    case "task.status_changed": {
      const c = change("status");
      return `${actor} moved ${title} from ${formatValue("status", c?.from, users)} to ${formatValue("status", c?.to, users)}`;
    }
    case "task.updated": {
      const parts = log.changes.map((c) =>
        c.field === "description"
          ? "updated the description"
          : `changed ${FIELD_LABELS[c.field] ?? c.field} from ${formatValue(c.field, c.from, users, currentUserId)} to ${formatValue(c.field, c.to, users, currentUserId)}`
      );
      return `${actor} ${parts.join(", ")} on ${title}`;
    }
    case "user.registered":
      return `${log.targetUser?.name ?? actor} joined the team`;
    case "user.role_changed": {
      const c = change("role");
      return `${actor} changed ${log.targetUser?.name ?? "a user"}'s role from ${formatValue("role", c?.from, users)} to ${formatValue("role", c?.to, users)}`;
    }
    case "user.created":
      return `${actor} added ${log.targetUser?.name ?? "a user"} as ${formatValue("role", change("role")?.to, users)}`;
    case "user.updated":
      return `${actor} updated ${log.targetUser?.name ?? "a user"}'s account (${log.changes.map((c) => FIELD_LABELS[c.field] ?? c.field).join(", ")})`;
    case "user.deleted":
      return `${actor} removed ${String(change("user")?.from ?? "a user")} from the team`;
    case "settings.access_changed":
      return `${actor} changed role access: ${log.changes
        .map((c) => `${c.field.replace(/^user\./, "member ").replace(/^manager\./, "manager ")} ${c.to ? "on" : "off"}`)
        .join(", ")}`;
    default:
      return `${actor} did ${log.action}`;
  }
}
