import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const ROLES = ["admin", "manager", "user"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name must be at most 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: { type: String, enum: ROLES, default: "user" },
    // Password-reset OTP: only a SHA-256 hash is stored, never the code itself.
    resetOtp: {
      hash: { type: String, select: false },
      expiresAt: { type: Date, select: false },
      sentAt: { type: Date, select: false },
      attempts: { type: Number, default: 0, select: false },
    },
    // Per-user notification settings. `inApp` controls the bell / real-time alerts,
    // `email` controls emails (sent only when SMTP is configured on the server).
    notificationPrefs: {
      muteAll: { type: Boolean, default: false },
      inApp: {
        taskAssigned: { type: Boolean, default: true },
        taskUpdated: { type: Boolean, default: true },
        dueReminder: { type: Boolean, default: true },
      },
      email: {
        taskAssigned: { type: Boolean, default: false },
        taskUpdated: { type: Boolean, default: false },
        dueReminder: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.resetOtp;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
