// Usage: npm run seed:demo            -> add demo team + ~70 tasks (replaces earlier demo data)
//        npm run seed:demo -- --reset -> remove all demo data
//
// Fills the app with realistic sample data so the dashboard, task lists, analytics,
// activity log and notifications can be checked. Demo users have emails ending in
// DEMO_DOMAIN; everything they created (tasks, audit entries, notifications) is removed
// on --reset or before re-seeding, so real data is never touched. Some demo tasks are
// assigned to the existing real accounts so their dashboards show data too.
import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Task from "../src/models/Task.js";
import AuditLog from "../src/models/AuditLog.js";
import Notification from "../src/models/Notification.js";

const DEMO_DOMAIN = "@seed.taskflow.app";
const DEMO_PASSWORD = "Demo@12345";
const TASK_COUNT = 72;
const DAY = 24 * 60 * 60 * 1000;

const TEAM = [
  { name: "Aarav Sharma", role: "manager" },
  { name: "Isha Patel", role: "user" },
  { name: "Rohan Verma", role: "user" },
  { name: "Ananya Iyer", role: "user" },
  { name: "Kabir Singh", role: "user" },
  { name: "Meera Nair", role: "manager" },
  { name: "Vikram Rao", role: "user" },
];

const TITLES = [
  "Follow up with Acme Corp on renewal",
  "Prepare Q3 sales pipeline report",
  "Call back lead from website form",
  "Send proposal to Sunrise Retail",
  "Update CRM contact records",
  "Schedule product demo for BlueOrbit",
  "Fix login page validation bug",
  "Design onboarding email sequence",
  "Review support tickets backlog",
  "Negotiate contract terms with Zenith Ltd",
  "Prepare invoice for September",
  "Clean up duplicate leads",
  "Plan webinar on new features",
  "Write case study for Nova Foods",
  "Set up weekly team sync agenda",
  "Collect feedback from pilot customers",
  "Update pricing page copy",
  "Train new hires on CRM workflow",
  "Audit overdue payments",
  "Draft partnership pitch deck",
  "Migrate old customer notes",
  "Publish monthly newsletter",
  "Resolve escalation from Metro Bank",
  "Prepare board meeting summary",
  "Organise customer meetup in Pune",
  "Optimise lead scoring rules",
  "QA mobile app release",
  "Renew SSL certificate",
  "Close deal with Lotus Pharma",
  "Record product walkthrough video",
];

const DETAILS = [
  "Check the latest notes before reaching out.",
  "Share the draft with the team for review first.",
  "Customer asked for an update by end of week.",
  "Coordinate with finance before sending.",
  "Use the new template from the shared drive.",
  "",
];

// Small seeded PRNG so every run produces the same data.
let seed = 42;
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

async function removeDemoData() {
  const demoUsers = await User.find({ email: { $regex: `${DEMO_DOMAIN.replace(/\./g, "\\.")}$` } }).select("_id");
  const ids = demoUsers.map((u) => u._id);
  const tasks = await Task.find({ createdBy: { $in: ids } }).select("_id");
  const taskIds = tasks.map((t) => t._id);
  const [t, a, n, u] = await Promise.all([
    Task.deleteMany({ _id: { $in: taskIds } }),
    AuditLog.deleteMany({ $or: [{ actor: { $in: ids } }, { task: { $in: taskIds } }] }),
    Notification.deleteMany({ $or: [{ recipient: { $in: ids } }, { task: { $in: taskIds } }] }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
  console.log(`Removed demo data: ${u.deletedCount} users, ${t.deletedCount} tasks, ${a.deletedCount} activity entries, ${n.deletedCount} notifications`);
}

async function seedDemo() {
  const realUsers = await User.find({ email: { $not: new RegExp(`${DEMO_DOMAIN.replace(/\./g, "\\.")}$`) } }).lean();

  const team = [];
  for (const member of TEAM) {
    const email = `${member.name.split(" ")[0].toLowerCase()}${DEMO_DOMAIN}`;
    team.push(await User.create({ ...member, email, password: DEMO_PASSWORD }));
  }

  // Real accounts get a share of the work so their own dashboard has data; the
  // first admin (usually the person checking the app) gets a bigger share.
  const mainAdmin = realUsers.find((u) => u.role === "admin");
  const assignees = [...team, ...realUsers, ...(mainAdmin ? [mainAdmin, mainAdmin, mainAdmin] : [])];
  const now = Date.now();
  const tasks = [];
  const audit = [];
  const notifications = [];

  for (let i = 0; i < TASK_COUNT; i++) {
    const creator = pick(team);
    const assignee = rand() < 0.9 ? pick(assignees) : null;
    const createdAt = new Date(now - between(0.2, 56) * DAY);
    const ageDays = (now - createdAt) / DAY;
    const hasDue = rand() < 0.85;
    const dueDate = hasDue ? new Date(createdAt.getTime() + between(1, 16) * DAY) : undefined;

    // Older tasks are more likely to be finished.
    const doneChance = Math.min(0.85, ageDays / 40);
    const status = rand() < doneChance ? "completed" : weighted([["todo", 5], ["in_progress", 4]]);
    let completedAt = null;
    if (status === "completed") {
      // Mostly on time, some late.
      const target = dueDate && rand() < 0.7 ? dueDate.getTime() - between(0, 2) * DAY : createdAt.getTime() + between(0.3, 14) * DAY;
      completedAt = new Date(Math.min(now - 60 * 1000, Math.max(createdAt.getTime() + 60 * 60 * 1000, target)));
    }
    const updatedAt = completedAt ?? new Date(Math.min(now, createdAt.getTime() + between(0, 3) * DAY));

    const task = {
      _id: new mongoose.Types.ObjectId(),
      title: TITLES[i % TITLES.length] + (i >= TITLES.length ? ` #${Math.floor(i / TITLES.length) + 1}` : ""),
      description: pick(DETAILS),
      dueDate,
      priority: weighted([["high", 3], ["medium", 5], ["low", 3]]),
      status,
      completedAt,
      recurrence: rand() < 0.08 ? "weekly" : "none",
      nextOccurrence: null,
      createdBy: creator._id,
      assignedTo: assignee?._id ?? null,
      createdAt,
      updatedAt,
      __v: 0,
    };
    tasks.push(task);

    const involved = [creator._id, assignee?._id].filter(Boolean);
    audit.push({ actor: creator._id, action: "task.created", task: task._id, taskTitle: task.title, involved, changes: [], createdAt });
    if (assignee) {
      audit.push({
        actor: creator._id,
        action: "task.assigned",
        task: task._id,
        taskTitle: task.title,
        involved,
        changes: [{ field: "assignedTo", from: null, to: assignee._id.toString() }],
        createdAt: new Date(createdAt.getTime() + 1000),
      });
      notifications.push({
        recipient: assignee._id,
        type: "task_assigned",
        message: `${creator.name} assigned you a task: "${task.title}"`,
        task: task._id,
        read: ageDays > 7 || rand() < 0.4,
        createdAt: new Date(createdAt.getTime() + 1000),
        updatedAt: new Date(createdAt.getTime() + 1000),
      });
    }
    if (status !== "todo") {
      const actor = assignee ?? creator;
      if (status === "completed") {
        audit.push({
          actor: actor._id,
          action: "task.status_changed",
          task: task._id,
          taskTitle: task.title,
          involved,
          changes: [{ field: "status", from: "in_progress", to: "completed" }],
          createdAt: completedAt,
        });
      } else {
        audit.push({
          actor: actor._id,
          action: "task.status_changed",
          task: task._id,
          taskTitle: task.title,
          involved,
          changes: [{ field: "status", from: "todo", to: "in_progress" }],
          createdAt: updatedAt,
        });
      }
    }
  }

  // Raw inserts keep the backdated createdAt/updatedAt (Mongoose would overwrite them).
  await Task.collection.insertMany(tasks);
  await AuditLog.collection.insertMany(audit);
  if (notifications.length) await Notification.collection.insertMany(notifications);

  const done = tasks.filter((t) => t.status === "completed").length;
  console.log(`Added ${team.length} demo users, ${tasks.length} tasks (${done} completed), ${audit.length} activity entries, ${notifications.length} notifications.`);
  console.log(`Demo logins: e.g. aarav${DEMO_DOMAIN} (manager), isha${DEMO_DOMAIN} (member). Password: ${DEMO_PASSWORD}`);
  if (realUsers.length) console.log(`Some tasks are assigned to your existing accounts: ${realUsers.map((u) => u.email).join(", ")}`);
}

await mongoose.connect(process.env.MONGODB_URI);
await removeDemoData();
if (!process.argv.includes("--reset")) await seedDemo();
await mongoose.disconnect();
