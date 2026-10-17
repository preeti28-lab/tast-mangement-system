import mongoose from "mongoose";

export const TASK_STATUSES = ["todo", "in_progress", "completed"];
export const TASK_PRIORITIES = ["low", "medium", "high"];

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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

taskSchema.index({ createdBy: 1, updatedAt: -1 });
taskSchema.index({ assignedTo: 1, updatedAt: -1 });
taskSchema.index({ dueDate: 1, status: 1 });

export default mongoose.model("Task", taskSchema);
