import Setting from "../models/Setting.js";

// Role access control that the admin can tune from Settings.
// Admins always have every permission (so nobody can lock the admin out);
// the manager and user roles get the switches below, starting from these defaults.

export const PERMISSIONS = [
  { key: "tasks.viewAll", label: "View all team tasks", description: "See every task, not just ones they created or are assigned to." },
  { key: "tasks.editAny", label: "Edit any task", description: "Change details, assignee and status of tasks created by others." },
  { key: "tasks.deleteAny", label: "Delete any task", description: "Delete tasks created by others (everyone can delete their own)." },
  { key: "tasks.assignOthers", label: "Assign tasks to others", description: "Put a teammate on a task. Off: tasks can only be left unassigned or given to themselves." },
  { key: "analytics.team", label: "Team analytics", description: "Open the team view of Analytics and the team report." },
  { key: "audit.viewAll", label: "Full activity log", description: "See every action in the activity log, not only ones on their tasks." },
  { key: "users.manage", label: "Manage users", description: "Add, edit and remove members and change roles (never admins)." },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);
export const CONFIGURABLE_ROLES = ["manager", "user"];

const all = (value) => Object.fromEntries(PERMISSION_KEYS.map((k) => [k, value]));

export const DEFAULT_ACCESS = {
  manager: { ...all(true), "tasks.deleteAny": false, "users.manage": false },
  user: { ...all(false), "tasks.assignOthers": true },
};

const SETTING_KEY = "roleAccess";

/** Stored matrix merged over the defaults (new permissions get their default). */
export async function getRoleAccess() {
  const doc = await Setting.findOne({ key: SETTING_KEY }).lean();
  const stored = doc?.value ?? {};
  return Object.fromEntries(
    CONFIGURABLE_ROLES.map((role) => [role, { ...DEFAULT_ACCESS[role], ...pick(stored[role]) }])
  );
}

export async function saveRoleAccess(matrix) {
  const value = Object.fromEntries(CONFIGURABLE_ROLES.map((role) => [role, { ...DEFAULT_ACCESS[role], ...pick(matrix[role]) }]));
  await Setting.findOneAndUpdate({ key: SETTING_KEY }, { value }, { upsert: true });
  return value;
}

/** Effective permissions for one role. */
export function permissionsFor(role, access) {
  if (role === "admin") return all(true);
  return { ...all(false), ...(access[role] ?? {}) };
}

// Keeps only known keys with boolean values.
function pick(obj) {
  if (!obj || typeof obj !== "object") return {};
  return Object.fromEntries(PERMISSION_KEYS.filter((k) => typeof obj[k] === "boolean").map((k) => [k, obj[k]]));
}
