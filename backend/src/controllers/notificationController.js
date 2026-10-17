import mongoose from "mongoose";
import Notification from "../models/Notification.js";

// GET /api/notifications
export const listNotifications = async (req, res) => {
  const recipient = req.user._id;
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient }).sort({ createdAt: -1 }).limit(20).populate("task", "title"),
    Notification.countDocuments({ recipient, read: false }),
  ]);
  res.json({ notifications, unreadCount });
};

// PATCH /api/notifications/:id/read
export const markRead = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid notification id" });
  }
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { read: true },
    { returnDocument: "after" }
  );
  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }
  res.json({ notification });
};

// PATCH /api/notifications/read-all
export const markAllRead = async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  res.json({ message: "All notifications marked as read" });
};
