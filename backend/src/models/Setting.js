import mongoose from "mongoose";

// App-wide key/value settings (e.g. the role access matrix the admin edits).
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model("Setting", settingSchema);
