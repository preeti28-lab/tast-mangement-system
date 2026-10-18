import mongoose from "mongoose";
import User, { ROLES } from "../models/User.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { isSameId } from "../utils/permissions.js";
import { logAudit } from "../services/auditService.js";
import Task from "../models/Task.js";
import Notification from "../models/Notification.js";
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

// ---- user management (admins, or roles granted "users.manage") -------------

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** Loads the target user and checks the actor may manage them. Returns [user, error]. */
async function manageable(req, id) {
  if (!mongoose.isValidObjectId(id)) return [null, [400, "Invalid user id"]];
  const target = await User.findById(id);
  if (!target) return [null, [404, "User not found"]];
  // Only an admin may touch an admin account.
  if (target.role === "admin" && req.user.role !== "admin") return [null, [403, "Only an admin can manage admin accounts"]];
  return [target, null];
}

const fail = (res, [status, message]) => res.status(status).json({ message });

/** Validates name/email/role/password fields present in the body. */
async function parseUserInput(req, { partial, targetId = null }) {
  const body = req.body ?? {};
  const data = {};
  const errors = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has("name")) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 50) errors.name = "Name must be 2–50 characters";
    else data.name = name;
  }
  if (!partial || has("email")) {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email";
    else if (await User.exists({ email, ...(targetId ? { _id: { $ne: targetId } } : {}) })) errors.email = "An account with this email already exists";
    else data.email = email;
  }
  if (!partial || has("role")) {
    const role = body.role ?? "user";
    if (!ROLES.includes(role)) errors.role = "Role must be admin, manager or user";
    else if (role === "admin" && req.user.role !== "admin") errors.role = "Only an admin can create or promote admins";
    else data.role = role;
  }
  if (!partial || has("password")) {
    if (typeof body.password !== "string" || body.password.length < 8) errors.password = "Password must be at least 8 characters";
    else data.password = body.password;
  }
  return { data, errors };
}

// POST /api/users   { name, email, password, role }
export const createUser = async (req, res) => {
  const { data, errors } = await parseUserInput(req, { partial: false });
  if (Object.keys(errors).length) return res.status(400).json({ message: "Please fix the errors below", errors });
  const user = await User.create(data);
  await logAudit({ actor: req.user, action: "user.created", targetUser: user._id, extraInvolved: [user._id], changes: [{ field: "role", from: null, to: user.role }] });
  res.status(201).json({ user });
};

// PATCH /api/users/:id   { name?, email?, role?, password? }
export const updateUser = async (req, res) => {
  const [user, err] = await manageable(req, req.params.id);
  if (err) return fail(res, err);
  const { data, errors } = await parseUserInput(req, { partial: true, targetId: user._id });
  // You can't change your own role here, so there is always at least one admin.
  if ("role" in data && isSameId(user._id, req.user._id) && data.role !== user.role) errors.role = "You can't change your own role";
  if (Object.keys(errors).length) return res.status(400).json({ message: "Please fix the errors below", errors });
  if (!Object.keys(data).length) return res.status(400).json({ message: "Nothing to update" });

  const changes = ["name", "email", "role"]
    .filter((f) => f in data && data[f] !== user[f])
    .map((f) => ({ field: f, from: user[f], to: data[f] }));
  if ("password" in data) changes.push({ field: "password", from: null, to: "reset" });
  user.set(data);
  await user.save();
  if (changes.length) {
    const roleOnly = changes.length === 1 && changes[0].field === "role";
    await logAudit({ actor: req.user, action: roleOnly ? "user.role_changed" : "user.updated", targetUser: user._id, extraInvolved: [user._id], changes });
  }
  res.json({ user });
};

// DELETE /api/users/:id
// Their assigned tasks become unassigned; tasks they created move to the person deleting them.
export const deleteUser = async (req, res) => {
  const [user, err] = await manageable(req, req.params.id);
  if (err) return fail(res, err);
  if (isSameId(user._id, req.user._id)) return res.status(400).json({ message: "You can't delete your own account" });
  if (user.role === "admin" && (await User.countDocuments({ role: "admin" })) <= 1) {
    return res.status(400).json({ message: "Can't delete the last admin" });
  }

  const [unassigned, moved] = await Promise.all([
    Task.updateMany({ assignedTo: user._id }, { assignedTo: null }),
    Task.updateMany({ createdBy: user._id }, { createdBy: req.user._id }),
    Notification.deleteMany({ recipient: user._id }),
  ]);
  await user.deleteOne();
  await logAudit({
    actor: req.user,
    action: "user.deleted",
    changes: [{ field: "user", from: `${user.name} <${user.email}>`, to: null }],
  });
  res.json({ message: "User deleted", unassignedTasks: unassigned.modifiedCount, movedTasks: moved.modifiedCount });
};

// PATCH /api/users/:id/role   { role }  (kept for the Team page's role picker)
export const updateRole = async (req, res) => {
  req.body = { role: req.body?.role };
  return updateUser(req, res);
};

const PREF_PATHS = [
  "muteAll",
  "inApp.taskAssigned",
  "inApp.taskUpdated",
  "inApp.dueReminder",
  "email.taskAssigned",
  "email.taskUpdated",
  "email.dueReminder",
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

// PATCH /api/users/me   { name }
// Lets a user rename themselves. Email stays fixed (it is the login).
export const updateProfile = async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({ message: "Please fix the errors below", errors: { name: "Name must be 2–50 characters" } });
  }
  const user = await User.findByIdAndUpdate(req.user._id, { name }, { new: true, runValidators: true });
  res.json({ user });
};

// PUT /api/users/me/password   { currentPassword, newPassword }
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const errors = {};
  if (!currentPassword) errors.currentPassword = "Enter your current password";
  if (typeof newPassword !== "string" || newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters";
  if (Object.keys(errors).length) return res.status(400).json({ message: "Please fix the errors below", errors });

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(String(currentPassword)))) {
    return res.status(400).json({ message: "Current password is incorrect", errors: { currentPassword: "Current password is incorrect" } });
  }
  if (await user.comparePassword(newPassword)) {
    return res.status(400).json({ message: "Please fix the errors below", errors: { newPassword: "Choose a password different from the current one" } });
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: "Password updated" });
};
