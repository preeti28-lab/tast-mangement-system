import mongoose from "mongoose";

export const TASK_STATUSES = ["todo", "in_progress", "completed"];
export const TASK_PRIORITIES = ["low", "medium", "high"];
export const TASK_RECURRENCES = ["none", "daily", "weekly", "monthly"];

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [120, "Title must be at most 120 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description must be at most 2000 characters"],
      default: "",
    },
    dueDate: { type: Date },
    priority: { type: String, enum: TASK_PRIORITIES, default: "medium" },
    status: { type: String, enum: TASK_STATUSES, default: "todo" },
    // Set when the task is completed; used for analytics (completion rate, overdue trend).
    completedAt: { type: Date, default: null },
    recurrence: { type: String, enum: TASK_RECURRENCES, default: "none" },
    // Next occurrence created when this recurring task was completed (prevents duplicates
    // if the task is re-opened and completed again).
    nextOccurrence: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    // When the "due in 1 hour" reminder went out; cleared when the due date changes
    // so a rescheduled task gets a fresh reminder.
    reminderSentAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

taskSchema.index({ createdBy: 1, updatedAt: -1 });
taskSchema.index({ assignedTo: 1, updatedAt: -1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ reminderSentAt: 1, dueDate: 1 });

export default mongoose.model("Task", taskSchema);
