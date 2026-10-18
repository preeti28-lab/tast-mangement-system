// Role-based access control rules, kept in one place.
//
// What each role may do is configurable by the admin (Settings → Role access, see
// services/accessService.js). `protect` puts the effective switches on
// `user.$locals.permissions`; admins always have all of them.
//
// Everyone can always see, edit and delete tasks they created, and see and change
// the status of tasks assigned to them.

export const isSameId = (a, b) => !!a && !!b && a.toString() === b.toString();

const idOf = (ref) => ref?._id ?? ref;

export const isAdmin = (user) => user.role === "admin";

/** True when the user's role has this permission (admins: always). */
export const can = (user, key) => isAdmin(user) || !!user.$locals?.permissions?.[key];

export const isCreator = (user, task) => isSameId(idOf(task.createdBy), user._id);
export const isAssignee = (user, task) => isSameId(idOf(task.assignedTo), user._id);

export const canViewTask = (user, task) =>
  can(user, "tasks.viewAll") || isCreator(user, task) || isAssignee(user, task);

export const canEditTask = (user, task) => can(user, "tasks.editAny") || isCreator(user, task);

export const canChangeStatus = (user, task) => canEditTask(user, task) || isAssignee(user, task);

export const canDeleteTask = (user, task) => can(user, "tasks.deleteAny") || isCreator(user, task);
