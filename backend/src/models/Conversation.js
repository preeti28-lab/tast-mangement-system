import mongoose from "mongoose";

// A one-to-one chat between two users. `key` is the two user ids sorted and joined,
// so there is at most one conversation per pair.
const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Messages from the other person sent up to these times count as read / delivered.
    lastReadAt: { type: Date, default: () => new Date(0) },
    lastDeliveredAt: { type: Date, default: () => new Date(0) },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    members: { type: [memberSchema], required: true },
    // Copy of the newest message, for the chat list.
    lastMessage: {
      _id: { type: mongoose.Schema.Types.ObjectId },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      text: { type: String },
      deleted: { type: Boolean, default: false },
      createdAt: { type: Date },
    },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true }
);

conversationSchema.index({ "members.user": 1, lastMessageAt: -1 });

export const pairKey = (a, b) => [a.toString(), b.toString()].sort().join(":");

export default mongoose.model("Conversation", conversationSchema);
