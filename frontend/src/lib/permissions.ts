// Mirrors backend/src/utils/permissions.js so the UI only offers allowed actions.
// The API enforces the same rules, so this is purely for showing/hiding controls.
// What a role may do comes from `user.permissions` (set by the admin in Settings).
import type { PermissionKey, Role, Task, User } from "./api";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  user: "Member",
};

/** True when the user's role has this permission (admins: always). */
export const can = (user: Pick<User, "role" | "permissions">, key: PermissionKey) =>
  user.role === "admin" || !!user.permissions?.[key];

/** Admin or manager (used for wording, not for access). */
export const isStaff = (user: Pick<User, "role">) => user.role === "admin" || user.role === "manager";

const isCreator = (user: User, task: Task) => task.createdBy._id === user._id;
const isAssignee = (user: User, task: Task) => task.assignedTo?._id === user._id;

export const canEditTask = (user: User, task: Task) => can(user, "tasks.editAny") || isCreator(user, task);
export const canChangeStatus = (user: User, task: Task) => canEditTask(user, task) || isAssignee(user, task);
export const canDeleteTask = (user: User, task: Task) => can(user, "tasks.deleteAny") || isCreator(user, task);
