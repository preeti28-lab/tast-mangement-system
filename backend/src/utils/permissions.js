// Role-based access control rules, kept in one place.
//
//  admin   – everything: sees and edits every task, deletes any task, manages roles,
//            sees the full audit log and team analytics.
//  manager – sees and edits every task (incl. reassigning), sees the audit log and
//            team analytics; can only delete tasks they created.
//  user    – sees tasks they created or are assigned to; edits/deletes tasks they
//            created; can only change the status of tasks assigned to them.

export const isSameId = (a, b) => !!a && !!b && a.toString() === b.toString();

const idOf = (ref) => ref?._id ?? ref;

export const isAdmin = (user) => user.role === "admin";
export const isStaff = (user) => user.role === "admin" || user.role === "manager";

export const isCreator = (user, task) => isSameId(idOf(task.createdBy), user._id);
export const isAssignee = (user, task) => isSameId(idOf(task.assignedTo), user._id);

export const canViewTask = (user, task) =>
  isStaff(user) || isCreator(user, task) || isAssignee(user, task);

export const canEditTask = (user, task) => isStaff(user) || isCreator(user, task);

export const canChangeStatus = (user, task) => canEditTask(user, task) || isAssignee(user, task);

export const canDeleteTask = (user, task) => isAdmin(user) || isCreator(user, task);
