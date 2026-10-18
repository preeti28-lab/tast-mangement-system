import Task from "../models/Task.js";
import User from "../models/User.js";

const USER_FIELDS = "name email";

const completedExpr = { $eq: ["$status", "completed"] };
const DAY = 24 * 60 * 60 * 1000;
const WEEKS = 8;

/** Monday 00:00 UTC of the week containing `date`. */
function startOfWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY);
}

/**
 * The user's own activity for the dashboard charts: tasks created and completed per
 * week (last WEEKS weeks, oldest first) plus status and priority mix.
 */
async function getMyActivity(involved, now) {
  const tasks = await Task.find(involved).select("status priority createdAt completedAt").lean();
  const thisWeek = startOfWeek(now);
  const trend = Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(thisWeek.getTime() - (WEEKS - 1 - i) * 7 * DAY);
    const end = new Date(start.getTime() + 7 * DAY);
    const inWeek = (date) => date && date >= start && date < end;
    return {
      weekStart: start.toISOString(),
      created: tasks.filter((t) => inWeek(t.createdAt)).length,
      completed: tasks.filter((t) => inWeek(t.completedAt)).length,
    };
  });
  const count = (key, value) => tasks.filter((t) => t[key] === value).length;
  return {
    trend,
    byStatus: { todo: count("status", "todo"), in_progress: count("status", "in_progress"), completed: count("status", "completed") },
    byPriority: { high: count("priority", "high"), medium: count("priority", "medium"), low: count("priority", "low") },
  };
}

/**
 * Team leaderboard: the 3 people who completed the most assigned tasks (ties go
 * to whoever has more assigned). Shared with everyone as a friendly nudge.
 */
async function getTopPerformers() {
  const rows = await Task.aggregate([
    { $match: { assignedTo: { $ne: null } } },
    {
      $group: {
        _id: "$assignedTo",
        assigned: { $sum: 1 },
        completed: { $sum: { $cond: [completedExpr, 1, 0] } },
        onTime: {
          $sum: {
            $cond: [
              {
                $and: [
                  completedExpr,
                  { $gt: ["$dueDate", null] },
                  { $gt: ["$completedAt", null] },
                  { $lte: ["$completedAt", "$dueDate"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $match: { completed: { $gt: 0 } } },
    { $sort: { completed: -1, assigned: -1 } },
    { $limit: 3 },
  ]);

  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } }).select("name email role").lean();
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  return rows
    .filter((r) => byId.has(r._id.toString()))
    .map((r) => ({
      user: byId.get(r._id.toString()),
      assigned: r.assigned,
      completed: r.completed,
      onTime: r.onTime,
      completionRate: Math.round((r.completed / r.assigned) * 1000) / 10,
    }));
}

// GET /api/dashboard
// Summary counts plus recent and overdue tasks for the logged-in user.
export const getDashboard = async (req, res) => {
  const userId = req.user._id;
  const now = new Date();

  const involved = { $or: [{ createdBy: userId }, { assignedTo: userId }] };
  const overdue = { ...involved, dueDate: { $lt: now }, status: { $ne: "completed" } };

  const upcoming = {
    ...involved,
    dueDate: { $gte: now, $lt: new Date(now.getTime() + 7 * DAY) },
    status: { $ne: "completed" },
  };

  const [assignedToMe, createdByMe, overdueCount, completed, total, dueSoon, recentTasks, overdueTasks, topPerformers, upcomingTasks, activity] =
    await Promise.all([
      Task.countDocuments({ assignedTo: userId }),
      Task.countDocuments({ createdBy: userId }),
      Task.countDocuments(overdue),
      Task.countDocuments({ ...involved, status: "completed" }),
      Task.countDocuments(involved),
      Task.countDocuments(upcoming),
      Task.find(involved)
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate("createdBy assignedTo", USER_FIELDS),
      Task.find(overdue)
        .sort({ dueDate: 1 })
        .limit(5)
        .populate("createdBy assignedTo", USER_FIELDS),
      getTopPerformers(),
      Task.find(upcoming)
        .sort({ dueDate: 1 })
        .limit(6)
        .populate("createdBy assignedTo", USER_FIELDS),
      getMyActivity(involved, now),
    ]);

  res.json({
    stats: { total, assignedToMe, createdByMe, overdue: overdueCount, completed, dueSoon },
    recentTasks,
    overdueTasks,
    topPerformers,
    upcomingTasks,
    ...activity,
  });
};
