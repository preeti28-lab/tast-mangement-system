import Task from "../models/Task.js";

const USER_FIELDS = "name email";

// GET /api/dashboard
// Summary counts plus recent and overdue tasks for the logged-in user.
export const getDashboard = async (req, res) => {
  const userId = req.user._id;
  const now = new Date();

  const involved = { $or: [{ createdBy: userId }, { assignedTo: userId }] };
  const overdue = { ...involved, dueDate: { $lt: now }, status: { $ne: "completed" } };

  const [assignedToMe, createdByMe, overdueCount, completed, total, recentTasks, overdueTasks] =
    await Promise.all([
      Task.countDocuments({ assignedTo: userId }),
      Task.countDocuments({ createdBy: userId }),
      Task.countDocuments(overdue),
      Task.countDocuments({ ...involved, status: "completed" }),
      Task.countDocuments(involved),
      Task.find(involved)
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate("createdBy assignedTo", USER_FIELDS),
      Task.find(overdue)
        .sort({ dueDate: 1 })
        .limit(5)
        .populate("createdBy assignedTo", USER_FIELDS),
    ]);

  res.json({
    stats: { total, assignedToMe, createdByMe, overdue: overdueCount, completed },
    recentTasks,
    overdueTasks,
  });
};
