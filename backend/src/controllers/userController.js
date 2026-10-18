import mongoose from "mongoose";
import User, { ROLES } from "../models/User.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { isSameId } from "../utils/permissions.js";
import { logAudit } from "../services/auditService.js";
import { isEmailEnabled } from "../services/mailer.js";

// GET /api/users?search=
// Registered users that a task can be assigned to.
export const listUsers = async (req, res) => {
  const search = req.query.search?.toString().trim();
  const filter = {};
  if (search) {
    const re = new RegExp(escapeRegex(search.slice(0, 100)), "i");
    filter.$or = [{ name: re }, { email: re }];
  }
  const users = await User.find(filter).select("name email role createdAt").sort({ name: 1 }).limit(200);
  res.json({ users });
};

// PATCH /api/users/:id/role   (admin only)
export const updateRole = async (req, res) => {
  const { role } = req.body;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: "Role must be admin, manager or user" });
  }
  // Admins can't change their own role, so there is always at least one admin.
  if (isSameId(req.params.id, req.user._id)) {
    return res.status(400).json({ message: "You can't change your own role" });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.role === role) return res.json({ user });

  const previous = user.role;
  user.role = role;
  await user.save();
  await logAudit({
    actor: req.user,
    action: "user.role_changed",
    targetUser: user._id,
    extraInvolved: [user._id],
    changes: [{ field: "role", from: previous, to: role }],
  });
  res.json({ user });
};

const PREF_PATHS = [
  "muteAll",
  "inApp.taskAssigned",
  "inApp.taskUpdated",
  "email.taskAssigned",
  "email.taskUpdated",
];

// GET /api/users/me/preferences
export const getPreferences = (req, res) => {
  res.json({ preferences: req.user.notificationPrefs, emailAvailable: isEmailEnabled() });
};

// PUT /api/users/me/preferences
export const updatePreferences = async (req, res) => {
  const body = req.body ?? {};
  const updates = {};
  for (const path of PREF_PATHS) {
    const value = path.split(".").reduce((obj, key) => obj?.[key], body);
    if (value === undefined) continue;
    if (typeof value !== "boolean") {
      return res.status(400).json({ message: `${path} must be true or false` });
    }
    updates[`notificationPrefs.${path}`] = value;
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ message: "No preferences to update" });
  }

  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { returnDocument: "after" });
  res.json({ preferences: user.notificationPrefs, emailAvailable: isEmailEnabled() });
};
