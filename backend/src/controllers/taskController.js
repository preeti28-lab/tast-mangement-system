import mongoose from "mongoose";
import Task, { TASK_PRIORITIES, TASK_STATUSES } from "../models/Task.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { escapeRegex } from "../utils/escapeRegex.js";

const USER_FIELDS = "name email";
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

const isSameId = (a, b) => !!a && !!b && a.toString() === b.toString();

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

const notify = (recipient, actor, type, message, task) => {
  if (!recipient || isSameId(recipient, actor._id)) return null;
  return Notification.create({ recipient, type, message, task: task._id });
};

/** Loads a task the current user is allowed to see (creator or assignee). */
async function findAccessibleTask(id, userId) {
  if (!mongoose.isValidObjectId(id)) throw httpError(400, "Invalid task id");
  const task = await Task.findById(id);
  if (!task) throw httpError(404, "Task not found");
  if (!isSameId(task.createdBy, userId) && !isSameId(task.assignedTo, userId)) {
    // Same response as "missing" so ids of other users' tasks aren't revealed.
    throw httpError(404, "Task not found");
  }
  return task;
}

// GET /api/tasks
// Query: view (all|assigned|created|overdue), search, status, priority,
//        dueFrom, dueTo (ISO dates), sort, page, limit
export const listTasks = async (req, res) => {
  const userId = req.user._id;
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
      conditions.push(involvedFilter(userId), {
        dueDate: { $lt: new Date() },
        status: { $ne: "completed" },
      });
      break;
    case "all":
      conditions.push(involvedFilter(userId));
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
  const task = await findAccessibleTask(req.params.id, req.user._id);
  res.json({ task: await populateTask(task) });
};

// POST /api/tasks
export const createTask = async (req, res) => {
  const { data, errors } = await parseTaskInput(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const task = await Task.create({ ...data, createdBy: req.user._id });

  await notify(
    task.assignedTo,
    req.user,
    "task_assigned",
    `${req.user.name} assigned you a task: "${task.title}"`,
    task
  );

  res.status(201).json({ task: await populateTask(task) });
};

// PATCH /api/tasks/:id
// The creator can edit every field; the assignee can only change the status.
export const updateTask = async (req, res) => {
  const user = req.user;
  const task = await findAccessibleTask(req.params.id, user._id);
  const isCreator = isSameId(task.createdBy, user._id);

  const { data, errors } = await parseTaskInput(req.body, { partial: true });
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Validation failed", errors });
  }
  if (!Object.keys(data).length) {
    return res.status(400).json({ message: "Nothing to update" });
  }
  if (!isCreator && Object.keys(data).some((key) => key !== "status")) {
    return res
      .status(403)
      .json({ message: "Only the task creator can edit these details. You can update the status." });
  }

  const previousAssignee = task.assignedTo;
  const previousStatus = task.status;
  task.set(data);
  await task.save();

  const pending = [];
  if ("assignedTo" in data && task.assignedTo && !isSameId(task.assignedTo, previousAssignee)) {
    pending.push(
      notify(
        task.assignedTo,
        user,
        "task_assigned",
        `${user.name} assigned you a task: "${task.title}"`,
        task
      )
    );
  }
  if ("status" in data && data.status !== previousStatus) {
    // Let the other party know the status moved.
    const recipient = isCreator ? task.assignedTo : task.createdBy;
    pending.push(
      notify(
        recipient,
        user,
        "task_updated",
        `${user.name} marked "${task.title}" as ${STATUS_LABELS[task.status]}`,
        task
      )
    );
  }
  await Promise.all(pending);

  res.json({ task: await populateTask(task) });
};

// DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  const task = await findAccessibleTask(req.params.id, req.user._id);
  if (!isSameId(task.createdBy, req.user._id)) {
    return res.status(403).json({ message: "Only the task creator can delete this task" });
  }
  await Promise.all([task.deleteOne(), Notification.deleteMany({ task: task._id })]);
  res.json({ message: "Task deleted" });
};
