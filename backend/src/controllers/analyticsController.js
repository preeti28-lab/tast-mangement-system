import Task from "../models/Task.js";
import User from "../models/User.js";
import { can } from "../utils/permissions.js";

const WEEKS = 8;
const COHORT_WEEKS = 6;
const DAY = 24 * 60 * 60 * 1000;

const rate = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

const wasOverdueAt = (task, at) =>
  !!task.dueDate && task.dueDate < at && task.createdAt <= at && (!task.completedAt || task.completedAt > at);

/** Monday 00:00 UTC of the week containing `date`. */
function startOfWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(d.getTime() - day * DAY);
}

// GET /api/analytics?scope=me|team
// Completion rates, workload per user and weekly trends. Calculated in memory,
// which is fine for a small team's task volume.
export const getAnalytics = async (req, res) => {
  const user = req.user;
  const scope = req.query.scope === "team" ? "team" : "me";
  if (scope === "team" && !can(user, "analytics.team")) {
    return res.status(403).json({ message: "Your role doesn't have access to team analytics" });
  }

  const filter = scope === "team" ? {} : { $or: [{ createdBy: user._id }, { assignedTo: user._id }] };
  const tasks = await Task.find(filter)
    .select("status priority dueDate completedAt createdAt assignedTo")
    .lean();

  const now = new Date();
  const completed = tasks.filter((t) => t.status === "completed");
  const overdue = tasks.filter((t) => wasOverdueAt(t, now));
  const completionDays = completed
    .filter((t) => t.completedAt)
    .map((t) => (t.completedAt - t.createdAt) / DAY);
  const completedOnTime = completed.filter((t) => t.dueDate && t.completedAt && t.completedAt <= t.dueDate).length;
  const completedWithDue = completed.filter((t) => t.dueDate && t.completedAt).length;

  const countBy = (key, values) =>
    Object.fromEntries(values.map((v) => [v, tasks.filter((t) => t[key] === v).length]));

  // Weekly trend for the last WEEKS weeks (oldest first).
  const thisWeek = startOfWeek(now);
  const trend = Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(thisWeek.getTime() - (WEEKS - 1 - i) * 7 * DAY);
    const end = new Date(Math.min(start.getTime() + 7 * DAY, now.getTime()));
    const inWeek = (date) => date && date >= start && date < end;
    return {
      weekStart: start.toISOString(),
      created: tasks.filter((t) => inWeek(t.createdAt)).length,
      completed: tasks.filter((t) => inWeek(t.completedAt)).length,
      overdue: tasks.filter((t) => wasOverdueAt(t, end)).length,
    };
  });

  // Completion cohorts: tasks grouped by the week they were created (last COHORT_WEEKS
  // weeks, oldest first); values[k] is the % of that cohort completed by the end of
  // week k after creation, or null when week k hasn't started yet.
  const cohorts = Array.from({ length: COHORT_WEEKS }, (_, i) => {
    const start = new Date(thisWeek.getTime() - (COHORT_WEEKS - 1 - i) * 7 * DAY);
    const end = new Date(start.getTime() + 7 * DAY);
    const members = tasks.filter((t) => t.createdAt >= start && t.createdAt < end);
    return {
      weekStart: start.toISOString(),
      size: members.length,
      values: Array.from({ length: COHORT_WEEKS }, (_, k) => {
        const weekK = new Date(start.getTime() + k * 7 * DAY);
        if (weekK > now || !members.length) return null;
        const at = new Date(Math.min(weekK.getTime() + 7 * DAY, now.getTime()));
        return rate(members.filter((t) => t.completedAt && t.completedAt <= at).length, members.length);
      }),
    };
  });

  let perUser = [];
  if (scope === "team") {
    const users = await User.find().select("name email role").lean();
    perUser = users
      .map((u) => {
        const mine = tasks.filter((t) => t.assignedTo && t.assignedTo.toString() === u._id.toString());
        const doneTasks = mine.filter((t) => t.status === "completed");
        const done = doneTasks.length;
        return {
          user: u,
          assigned: mine.length,
          completed: done,
          onTime: doneTasks.filter((t) => t.dueDate && t.completedAt && t.completedAt <= t.dueDate).length,
          overdue: mine.filter((t) => wasOverdueAt(t, now)).length,
          completionRate: rate(done, mine.length),
          // Tasks this person completed in each of the last 6 weeks (oldest first).
          weeklyCompleted: trend.slice(-6).map(({ weekStart }) => {
            const start = new Date(weekStart);
            const end = new Date(start.getTime() + 7 * DAY);
            return doneTasks.filter((t) => t.completedAt && t.completedAt >= start && t.completedAt < end).length;
          }),
        };
      })
      .sort((a, b) => b.completed - a.completed || b.assigned - a.assigned);
  }

  res.json({
    scope,
    summary: {
      total: tasks.length,
      completed: completed.length,
      open: tasks.length - completed.length,
      overdue: overdue.length,
      completedOnTime,
      completionRate: rate(completed.length, tasks.length),
      onTimeRate: rate(completedOnTime, completedWithDue),
      avgCompletionDays: completionDays.length
        ? Math.round((completionDays.reduce((a, b) => a + b, 0) / completionDays.length) * 10) / 10
        : null,
    },
    byStatus: countBy("status", ["todo", "in_progress", "completed"]),
    byPriority: countBy("priority", ["low", "medium", "high"]),
    trend,
    cohorts,
    perUser,
  });
};
