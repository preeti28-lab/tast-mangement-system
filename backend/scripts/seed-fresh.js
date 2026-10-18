// Usage: node scripts/seed-fresh.js --confirm [--backup <file.json>]
//
// WIPES the database (users, tasks, activity log, notifications, chats) and fills it with a
// fresh demo team and ~8 weeks of realistic work, so every dashboard, chart and table
// has data. Role access settings are kept. With --backup, everything is first written
// to a JSON file. Without --confirm it only prints what it would do.
//
// Logins (password Test@123): admin@gmail.com (admin), manager@gmail.com (manager),
// ajay@gmail.com, priya@gmail.com, rohit@gmail.com, sneha@gmail.com (members).
import "dotenv/config";
import { writeFileSync } from "node:fs";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Task from "../src/models/Task.js";
import AuditLog from "../src/models/AuditLog.js";
import Notification from "../src/models/Notification.js";
import Conversation from "../src/models/Conversation.js";
import Message from "../src/models/Message.js";

const PASSWORD = "Test@123";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const TEAM = [
  { key: "admin", name: "Neha Kapoor", email: "admin@gmail.com", role: "admin", joinedDaysAgo: 62 },
  { key: "manager", name: "Rahul Mehta", email: "manager@gmail.com", role: "manager", joinedDaysAgo: 60 },
  { key: "ajay", name: "Ajay Kumar", email: "ajay@gmail.com", role: "user", joinedDaysAgo: 58 },
  { key: "priya", name: "Priya Sharma", email: "priya@gmail.com", role: "user", joinedDaysAgo: 57 },
  { key: "rohit", name: "Rohit Verma", email: "rohit@gmail.com", role: "user", joinedDaysAgo: 50 },
  { key: "sneha", name: "Sneha Patel", email: "sneha@gmail.com", role: "user", joinedDaysAgo: 44 },
];

const TITLES = [
  "Set up CI pipeline for the web app",
  "Design onboarding screens",
  "Fix login page validation bug",
  "Write API docs for tasks endpoint",
  "Prepare sprint planning agenda",
  "Review pull request backlog",
  "Migrate user table to new schema",
  "Add dark mode to settings",
  "Customer feedback survey analysis",
  "Update pricing page copy",
  "Optimise dashboard load time",
  "Create Q4 marketing calendar",
  "Fix notification badge count",
  "Write unit tests for auth module",
  "Plan team offsite in Goa",
  "Renew SSL certificate",
  "Prepare investor update deck",
  "Clean up unused feature flags",
  "Design email templates",
  "Audit accessibility on forms",
  "Set up error monitoring",
  "Draft hiring plan for Q1",
  "Record product walkthrough video",
  "Resolve escalation from Metro Bank",
  "Implement CSV export for reports",
  "Refactor task list component",
  "Publish monthly newsletter",
  "Security review of file uploads",
  "Organise customer meetup",
  "Update README and setup guide",
  "Build analytics funnel chart",
  "QA mobile release 2.4",
  "Negotiate contract with Zenith Ltd",
  "Create onboarding checklist for hires",
  "Investigate slow search queries",
  "Prepare board meeting summary",
];

const DETAILS = [
  "Share a draft with the team before the review.",
  "Customer asked for an update by end of week.",
  "Check the notes from last sprint retro first.",
  "Coordinate with design before starting.",
  "Keep it small; follow-ups can go in a new task.",
  "Link the related tickets in the description.",
  "",
];

// Seeded PRNG so every run produces the same data.
let seed = 7;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + rand() * (max - min);
const weighted = (pairs) => {
  let r = rand() * pairs.reduce((s, [, w]) => s + w, 0);
  for (const [value, w] of pairs) if ((r -= w) <= 0) return value;
  return pairs[0][0];
};

const confirm = process.argv.includes("--confirm");
const backupIdx = process.argv.indexOf("--backup");
const backupFile = backupIdx > -1 ? process.argv[backupIdx + 1] : null;

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
console.log(`Database: ${db.host} / ${db.name}`);

const counts = {
  users: await User.countDocuments(),
  tasks: await Task.countDocuments(),
  auditlogs: await AuditLog.countDocuments(),
  notifications: await Notification.countDocuments(),
  conversations: await Conversation.countDocuments(),
  messages: await Message.countDocuments(),
};
console.log("Current data:", counts);

if (!confirm) {
  console.log("Dry run. Re-run with --confirm to wipe and reseed.");
  await mongoose.disconnect();
  process.exit(0);
}

if (backupFile) {
  const dump = {};
  for (const name of ["users", "tasks", "auditlogs", "notifications", "conversations", "messages", "settings"]) {
    dump[name] = await db.collection(name).find({}).toArray();
  }
  writeFileSync(backupFile, JSON.stringify({ takenAt: new Date(), db: db.name, ...dump }, null, 1));
  console.log(`Backup written to ${backupFile}`);
}

await Promise.all([
  User.deleteMany({}),
  Task.deleteMany({}),
  AuditLog.deleteMany({}),
  Notification.deleteMany({}),
  Conversation.deleteMany({}),
  Message.deleteMany({}),
]);
console.log("Wiped users, tasks, activity log and notifications.");

const now = Date.now();
const audit = [];
const notifications = [];

// ---- users -------------------------------------------------------------------
const users = {};
for (const m of TEAM) {
  const user = await User.create({ name: m.name, email: m.email, password: PASSWORD, role: m.role });
  const joined = new Date(now - m.joinedDaysAgo * DAY);
  await User.collection.updateOne({ _id: user._id }, { $set: { createdAt: joined, updatedAt: joined } });
  users[m.key] = { ...user.toObject(), createdAt: joined };
}
const { admin, manager } = users;
const members = [users.ajay, users.priya, users.rohit, users.sneha];

audit.push({ actor: admin._id, action: "user.registered", targetUser: admin._id, involved: [admin._id], changes: [], createdAt: admin.createdAt });
for (const u of [manager, ...members]) {
  audit.push({
    actor: admin._id,
    action: "user.created",
    targetUser: u._id,
    involved: [u._id],
    changes: [{ field: "role", from: null, to: u.role === "manager" ? "user" : u.role }],
    createdAt: u.createdAt,
  });
}
// The manager started as a member and was promoted.
audit.push({
  actor: admin._id,
  action: "user.role_changed",
  targetUser: manager._id,
  involved: [manager._id],
  changes: [{ field: "role", from: "user", to: "manager" }],
  createdAt: new Date(manager.createdAt.getTime() + 2 * HOUR),
});

// ---- tasks -------------------------------------------------------------------
// Who creates work, and who gets it (Ajay does the most, so he tops the leaderboard).
const creators = [[manager, 6], [admin, 3], [users.ajay, 1], [users.priya, 1], [users.rohit, 1], [users.sneha, 1]];
const assigneePool = [[users.ajay, 6], [users.priya, 5], [users.rohit, 4], [users.sneha, 4], [manager, 2], [admin, 1]];
const doneSkill = { ajay: 0.85, priya: 0.75, rohit: 0.6, sneha: 0.7, manager: 0.7, admin: 0.65 };
const keyOf = (u) => TEAM.find((m) => m.email === u.email).key;

const tasks = [];
const TASK_COUNT = 80;
for (let i = 0; i < TASK_COUNT; i++) {
  const creator = weighted(creators);
  // Members mostly create tasks for themselves; staff hand work out.
  const assignee =
    creator.role === "user" ? (rand() < 0.75 ? creator : weighted(assigneePool)) : rand() < 0.93 ? weighted(assigneePool) : null;

  // Spread evenly over the last 8 weeks (one slot per task, jittered) so weekly charts are smooth.
  const createdAt = new Date(now - ((i + rand()) / TASK_COUNT) * 55 * DAY - between(0, 10) * HOUR);
  const ageDays = (now - createdAt) / DAY;
  const hasDue = rand() < 0.9;
  const dueDate = hasDue ? new Date(createdAt.getTime() + between(2, 18) * DAY) : undefined;
  if (dueDate) dueDate.setHours(18, 0, 0, 0);

  const skill = doneSkill[keyOf(assignee ?? creator)];
  const doneChance = Math.min(0.92, (ageDays / 30) * skill + 0.05);
  const status = rand() < doneChance ? "completed" : weighted([["todo", 4], ["in_progress", 5]]);

  let completedAt = null;
  if (status === "completed") {
    const onTime = dueDate && rand() < skill;
    const target = onTime
      ? dueDate.getTime() - between(0.2, Math.max(0.3, (dueDate - createdAt) / DAY - 0.5)) * DAY
      : createdAt.getTime() + between(1, 20) * DAY;
    completedAt = new Date(Math.min(now - 30 * 60 * 1000, Math.max(createdAt.getTime() + 2 * HOUR, target)));
  }
  const startedAt = new Date(Math.min(now - 10 * 60 * 1000, createdAt.getTime() + between(0.1, 2) * DAY));
  const updatedAt = completedAt ?? (status === "in_progress" ? startedAt : createdAt);

  const task = {
    _id: new mongoose.Types.ObjectId(),
    title: TITLES[i % TITLES.length] + (i >= TITLES.length ? ` (${Math.floor(i / TITLES.length) + 1})` : ""),
    description: pick(DETAILS),
    dueDate,
    priority: weighted([["high", 3], ["medium", 5], ["low", 3]]),
    status,
    completedAt,
    recurrence: rand() < 0.07 ? weighted([["weekly", 3], ["daily", 1], ["monthly", 1]]) : "none",
    nextOccurrence: null,
    reminderSentAt: null,
    createdBy: creator._id,
    assignedTo: assignee?._id ?? null,
    createdAt,
    updatedAt,
    __v: 0,
  };
  if (task.recurrence !== "none" && !task.dueDate) task.recurrence = "none";
  tasks.push(task);
  logTask(task, creator, assignee, startedAt);
}

// Upcoming work so "due this week" and the focus deck have something to show.
const upcoming = [
  ["Ship release notes for v2.5", users.ajay, 1, "high"],
  ["Prepare demo for Lotus Pharma", users.priya, 2, "high"],
  ["Review Q4 OKR draft", manager, 3, "medium"],
  ["Fix flaky end-to-end tests", users.rohit, 1, "medium"],
  ["Update team handbook", users.sneha, 5, "low"],
  ["Plan sprint 15 backlog", manager, 6, "medium"],
  ["Interview frontend candidate", admin, 4, "medium"],
  ["Write blog post on offline mode", users.priya, 6, "low"],
];
for (const [title, assignee, inDays, priority] of upcoming) {
  const createdAt = new Date(now - between(1, 4) * DAY);
  const dueDate = new Date(now + inDays * DAY);
  dueDate.setHours(17, 0, 0, 0);
  const status = rand() < 0.5 ? "in_progress" : "todo";
  const creator = assignee.role === "user" ? manager : admin;
  const startedAt = new Date(createdAt.getTime() + 6 * HOUR);
  const task = {
    _id: new mongoose.Types.ObjectId(),
    title,
    description: pick(DETAILS),
    dueDate,
    priority,
    status,
    completedAt: null,
    recurrence: "none",
    nextOccurrence: null,
    reminderSentAt: null,
    createdBy: creator._id,
    assignedTo: assignee._id,
    createdAt,
    updatedAt: status === "in_progress" ? startedAt : createdAt,
    __v: 0,
  };
  tasks.push(task);
  logTask(task, creator, assignee, startedAt);
}

function logTask(task, creator, assignee, startedAt) {
  const involved = [creator._id, assignee?._id].filter(Boolean);
  const base = { task: task._id, taskTitle: task.title, involved, targetUser: null };
  audit.push({ ...base, actor: creator._id, action: "task.created", changes: [], createdAt: task.createdAt });

  const self = assignee && assignee._id.equals(creator._id);
  if (assignee) {
    const at = new Date(task.createdAt.getTime() + 1000);
    audit.push({ ...base, actor: creator._id, action: "task.assigned", changes: [{ field: "assignedTo", from: null, to: assignee._id.toString() }], createdAt: at });
    if (!self) {
      notifications.push({
        recipient: assignee._id,
        type: "task_assigned",
        message: `${creator.name} assigned you a task: "${task.title}"`,
        task: task._id,
        read: (now - at) / DAY > 5 || rand() < 0.3,
        createdAt: at,
        updatedAt: at,
      });
    }
  }
  if (task.status === "todo") return;

  const actor = assignee ?? creator;
  audit.push({ ...base, actor: actor._id, action: "task.status_changed", changes: [{ field: "status", from: "todo", to: "in_progress" }], createdAt: startedAt });
  if (task.status === "completed") {
    audit.push({ ...base, actor: actor._id, action: "task.status_changed", changes: [{ field: "status", from: "in_progress", to: "completed" }], createdAt: task.completedAt });
    if (!actor._id.equals(creator._id)) {
      notifications.push({
        recipient: creator._id,
        type: "task_updated",
        message: `${actor.name} marked "${task.title}" as Completed`,
        task: task._id,
        read: (now - task.completedAt) / DAY > 3 || rand() < 0.5,
        createdAt: task.completedAt,
        updatedAt: task.completedAt,
      });
    }
  }
}

// Raw inserts keep the backdated timestamps (Mongoose would overwrite them).
await Task.collection.insertMany(tasks);
await AuditLog.collection.insertMany(audit);
await Notification.collection.insertMany(notifications);

const done = tasks.filter((t) => t.status === "completed").length;
const overdue = tasks.filter((t) => t.status !== "completed" && t.dueDate && t.dueDate < new Date(now)).length;
console.log(
  `Created ${TEAM.length} users, ${tasks.length} tasks (${done} completed, ${overdue} overdue), ` +
    `${audit.length} activity entries, ${notifications.length} notifications.`
);
for (const m of TEAM) {
  const mine = tasks.filter((t) => t.assignedTo?.equals(users[m.key]._id));
  console.log(`  ${m.role.padEnd(7)} ${m.email.padEnd(18)} assigned ${mine.length}, done ${mine.filter((t) => t.status === "completed").length}`);
}
console.log(`Password for every account: ${PASSWORD}`);
await mongoose.disconnect();
