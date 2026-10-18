import mongoose from "mongoose";

export const AUDIT_ACTIONS = [
  "task.created",
  "task.updated",
  "task.assigned",
  "task.status_changed",
  "task.deleted",
  "task.recurred",
  "user.registered",
  "user.role_changed",
];

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    // Kept even after the task is deleted, so the log stays readable.
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    taskTitle: { type: String, default: "" },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Users involved in the task at the time (creator + assignee), so they can see the entry.
    involved: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    changes: [
      {
        _id: false,
        field: String,
        from: mongoose.Schema.Types.Mixed,
        to: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ task: 1, createdAt: -1 });
auditLogSchema.index({ involved: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
