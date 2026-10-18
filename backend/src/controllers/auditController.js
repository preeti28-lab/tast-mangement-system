import mongoose from "mongoose";
import AuditLog, { AUDIT_ACTIONS } from "../models/AuditLog.js";
import Task from "../models/Task.js";
import { can, canViewTask } from "../utils/permissions.js";

// GET /api/audit-logs?task=&action=&page=&limit=
// Admins and managers see every entry; other users see entries for tasks they
// are (or were) involved in.
export const listAuditLogs = async (req, res) => {
  const user = req.user;
  const filter = {};

  if (req.query.task) {
    if (!mongoose.isValidObjectId(req.query.task)) {
      return res.status(400).json({ message: "Invalid task id" });
    }
    const task = await Task.findById(req.query.task);
    if (task && !canViewTask(user, task)) return res.status(404).json({ message: "Task not found" });
    filter.task = req.query.task;
  }
  if (req.query.action) {
    if (!AUDIT_ACTIONS.includes(req.query.action)) {
      return res.status(400).json({ message: "Invalid action" });
    }
    filter.action = req.query.action;
  }
  if (!can(user, "audit.viewAll")) filter.involved = user._id;

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("actor targetUser", "name email")
      .select("-involved"),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ logs, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
};
