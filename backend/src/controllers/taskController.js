import mongoose from "mongoose";
import Task, { TASK_PRIORITIES, TASK_RECURRENCES, TASK_STATUSES } from "../models/Task.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { nextDueDate } from "../utils/recurrence.js";
import {
  canChangeStatus,
  canDeleteTask,
  canEditTask,
  canViewTask,
  isSameId,
  isStaff,
} from "../utils/permissions.js";
import { diffTask, logAudit } from "../services/auditService.js";
import { notifyUser } from "../services/notificationService.js";

const USER_FIELDS = "name email role";
const STATUS_LABELS = { todo: "To do", in_progress: "In progress", completed: "Completed" };

// `noDue` is computed in the pipeline so tasks without a due date always sort last.
const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  due_asc: { noDue: 1, dueDate: 1, createdAt: -1 },
  due_desc: { noDue: 1, dueDate: -1, createdAt: -1 },
  updated: { updatedAt: -1 },
};

const httpError = (status, message) => Object.assign(new Error(message), { status });

const populateTask = (query) => query.populate("createdBy assignedTo", USER_FIELDS);

const involvedFilter = (userId) => ({ $or: [{ createdBy: userId }, { assignedTo: userId }] });

/**
 * Validates and normalises task fields from a request body.
 * With `partial` only the provided fields are checked (used for updates).
 */
async function parseTaskInput(body, { partial = false } = {}) {
  const data = {};
  const errors = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  if (!partial || has("title")) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) errors.title = "Title is required";
    else if (title.length > 120) errors.title = "Title must be at most 120 characters";
    else data.title = title;
  }

  if (has("description")) {
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (description.length > 2000) errors.description = "Description must be at most 2000 characters";
    else data.description = description;
  }

  if (has("dueDate")) {
    if (body.dueDate === null || body.dueDate === "") {
      data.dueDate = null;
    } else {
      const due = new Date(body.dueDate);
      if (Number.isNaN(due.getTime())) errors.dueDate = "Due date is invalid";
      else data.dueDate = due;
    }
  }

  if (has("priority")) {
    if (!TASK_PRIORITIES.includes(body.priority)) errors.priority = "Priority is invalid";
    else data.priority = body.priority;
  }

  if (has("status")) {
    if (!TASK_STATUSES.includes(body.status)) errors.status = "Status is invalid";
    else data.status = body.status;
  }

  if (has("recurrence")) {
    if (!TASK_RECURRENCES.includes(body.recurrence)) errors.recurrence = "Recurrence is invalid";
    else data.recurrence = body.recurrence;
  }

  if (has("assignedTo")) {
    if (body.assignedTo === null || body.assignedTo === "") {
      data.assignedTo = null;
    } else if (!mongoose.isValidObjectId(body.assignedTo)) {
      errors.assignedTo = "Assignee is invalid";
    } else if (!(await User.exists({ _id: body.assignedTo }))) {
      errors.assignedTo = "Assignee does not exist";
    } else {
      data.assignedTo = body.assignedTo;
    }
  }

  return { data, errors };
}

/** Loads a task the current user is allowed to see. */
async function findAccessibleTask(id, user) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid task id");
  const task = await Task.findById(id);
  // Same response as "missing" so ids of other users' tasks aren't revealed.
  if (!task || !canViewTask(user, task)) throw httpError(404, "Task not found");
  return task;
}

const assignedMessage = (actor, task) => `${actor.name} assigned you a task: "${task.title}"`;

/**
 * When a recurring task is completed, create its next occurrence (once).
 * The new task keeps the same details and assignee, with the due date moved forward.
 */
async function spawnNextOccurrence(task, actor) {
  if (task.recurrence === "none" || task.status !== "completed" || task.nextOccurrence) return null;

  const next = await Task.create({
    title: task.title,
    description: task.description,
    priority: task.priority,
    recurrence: task.recurrence,
    dueDate: nextDueDate(task.dueDate, task.recurrence),
    createdBy: task.createdBy,
    assignedTo: task.assignedTo,
  });
  task.nextOccurrence = next._id;
  await task.save();

  await logAudit({ actor, action: "task.recurred", task: next, changes: [{ field: "previous", from: null, to: task._id.toString() }] });
  if (next.assignedTo) {
    await notifyUser({
      recipient: next.assignedTo,
      actor,
      type: "task_assigned",
      message: `Next ${task.recurrence} occurrence of "${next.title}" is ready`,
      task: next,
    });
  }
  return next;
}

// GET /api/tasks
// Query: view (all|assigned|created|overdue|team), search, status, priority,
//        dueFrom, dueTo (ISO dates), sort, page, limit
export const listTasks = async (req, res) => {
  const user = req.user;
  const userId = user._id;
  const { view = "all", search, status, priority, dueFrom, dueTo, sort = "newest" } = req.query;

  const conditions = [];
  switch (view) {
    case "assigned":
      conditions.push({ assignedTo: userId });
      break;
    case "created":
      conditions.push({ createdBy: userId });
      break;
    case "overdue":
      conditions.push(isStaff(user) ? {} : involvedFilter(userId), {
        dueDate: { $lt: new Date() },
        status: { $ne: "completed" },
      });
      break;
    case "all":
      conditions.push(involvedFilter(userId));
      break;
    case "team":
      if (!isStaff(user)) return res.status(403).json({ message: "Only managers and admins can view all team tasks" });
      conditions.push({});
      break;
    default:
      return res.status(400).json({ message: "Invalid view" });
  }

  const term = search?.toString().trim();
  if (term) {
    const re = new RegExp(escapeRegex(term.slice(0, 100)), "i");
    conditions.push({ $or: [{ title: re }, { description: re }] });
  }

  if (status) {
    if (!TASK_STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status" });
    conditions.push({ status });
  }
  if (priority) {
    if (!TASK_PRIORITIES.includes(priority))
      return res.status(400).json({ message: "Invalid priority" });
    conditions.push({ priority });
  }

  if (dueFrom || dueTo) {
    const range = {};
    for (const [key, value, op] of [["dueFrom", dueFrom, "$gte"], ["dueTo", dueTo, "$lte"]]) {
      if (!value) continue;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return res.status(400).json({ message: `Invalid ${key}` });
      range[op] = date;
    }
    conditions.push({ dueDate: range });
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const filter = { $and: conditions };

  const [rows, total] = await Promise.all([
    Task.aggregate([
      { $match: filter },
      { $addFields: { noDue: { $cond: [{ $ifNull: ["$dueDate", false] }, 0, 1] } } },
      { $sort: SORTS[sort] || SORTS.newest },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $project: { noDue: 0, __v: 0 } },
    ]),
    Task.countDocuments(filter),
  ]);
  const tasks = await Task.populate(rows, { path: "createdBy assignedTo", select: USER_FIELDS });

  res.json({ tasks, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
};

// GET /api/tasks/:id
export const getTask = async (req, res) => {
  const task = await findAccessibleTask(req.params.id, req.user);
  res.json({ task: await populateTask(task) });
};

// POST /api/tasks
export const createTask = async (req, res) => {
  const { data, errors } = await parseTaskInput(req.body);
  if (data.recurrence && data.recurrence !== "none" && !data.dueDate && !errors.dueDate) {
    errors.dueDate = "Recurring tasks need a due date";
  }
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const task = await Task.create({
    ...data,
    completedAt: data.status === "completed" ? new Date() : null,
    createdBy: req.user._id,
  });

  await logAudit({ actor: req.user, action: "task.created", task });
  if (task.assignedTo) {
    await logAudit({
      actor: req.user,
      action: "task.assigned",
      task,
      changes: [{ field: "assignedTo", from: null, to: task.assignedTo.toString() }],
    });
    await notifyUser({
      recipient: task.assignedTo,
      actor: req.user,
      type: "task_assigned",
      message: assignedMessage(req.user, task),
      task,
    });
  }
  await spawnNextOccurrence(task, req.user);

  res.status(201).json({ task: await populateTask(task) });
};

// PATCH /api/tasks/:id
// Creator, managers and admins can edit every field; the assignee can only change the status.
export const updateTask = async (req, res) => {
  const user = req.user;
  const task = await findAccessibleTask(req.params.id, user);

  const { data, errors } = await parseTaskInput(req.body, { partial: true });
  const recurrence = data.recurrence ?? task.recurrence;
  const dueDate = "dueDate" in data ? data.dueDate : task.dueDate;
  if (recurrence !== "none" && !dueDate && !errors.dueDate) {
    errors.dueDate = "Recurring tasks need a due date";
  }
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Validation failed", errors });
  }
  if (!Object.keys(data).length) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  const onlyStatus = Object.keys(data).every((key) => key === "status");
  if (onlyStatus ? !canChangeStatus(user, task) : !canEditTask(user, task)) {
    return res.status(403).json({
      message: canChangeStatus(user, task)
        ? "Only the task creator, a manager or an admin can edit these details. You can update the status."
        : "You don't have permission to edit this task",
    });
  }

  const before = task.toObject();
  task.set(data);
  if ("dueDate" in data && data.dueDate?.getTime() !== before.dueDate?.getTime()) {
    task.reminderSentAt = null;
  }
  if ("status" in data && data.status !== before.status) {
    task.completedAt = data.status === "completed" ? new Date() : null;
  }
  await task.save();

  const changes = diffTask(before, task);
  const assigneeChanged = changes.some((c) => c.field === "assignedTo");
  const statusChange = changes.find((c) => c.field === "status");
  const otherChanges = changes.filter((c) => c.field !== "assignedTo" && c.field !== "status");

  if (otherChanges.length) await logAudit({ actor: user, action: "task.updated", task, changes: otherChanges });
  if (statusChange) await logAudit({ actor: user, action: "task.status_changed", task, changes: [statusChange] });
  if (assigneeChanged) {
    await logAudit({
      actor: user,
      action: "task.assigned",
      task,
      changes: changes.filter((c) => c.field === "assignedTo"),
      // The previous assignee should still see that the task moved away from them.
      extraInvolved: before.assignedTo ? [before.assignedTo] : [],
    });
    if (task.assignedTo) {
      await notifyUser({
        recipient: task.assignedTo,
        actor: user,
        type: "task_assigned",
        message: assignedMessage(user, task),
        task,
      });
    }
  }
  if (statusChange) {
    // Let the other people on the task know the status moved.
    const message = `${user.name} marked "${task.title}" as ${STATUS_LABELS[task.status]}`;
    const recipients = [task.createdBy, assigneeChanged ? null : task.assignedTo].filter(
      (id, i, list) => id && list.findIndex((other) => isSameId(other, id)) === i
    );
    await Promise.all(
      recipients.map((recipient) =>
        notifyUser({ recipient, actor: user, type: "task_updated", message, task })
      )
    );
  }

  const next = statusChange ? await spawnNextOccurrence(task, user) : null;

  res.json({
    task: await populateTask(task),
    ...(next && { nextOccurrence: await populateTask(next) }),
  });
};

// DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  const task = await findAccessibleTask(req.params.id, req.user);
  if (!canDeleteTask(req.user, task)) {
    return res.status(403).json({ message: "Only the task creator or an admin can delete this task" });
  }
  await Promise.all([task.deleteOne(), Notification.deleteMany({ task: task._id })]);
  await logAudit({ actor: req.user, action: "task.deleted", task });
  res.json({ message: "Task deleted" });
};
