import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { isSameId } from "../utils/permissions.js";
import { sendEmail } from "./mailer.js";

const PREF_KEYS = { task_assigned: "taskAssigned", task_updated: "taskUpdated" };

/**
 * Notifies a user about a task event, respecting their notification preferences.
 * The in-app notification is stored in MongoDB and shown in the bell (the client
 * polls for new ones); an email is also sent when the user opted in and SMTP is set.
 */
export async function notifyUser({ recipient, actor, type, message, task }) {
  if (!recipient || isSameId(recipient, actor._id)) return null;

  const user = await User.findById(recipient).select("email notificationPrefs");
  if (!user) return null;
  const prefs = user.notificationPrefs ?? {};
  if (prefs.muteAll) return null;

  const key = PREF_KEYS[type];
  let notification = null;

  if (prefs.inApp?.[key] !== false) {
    notification = await Notification.create({ recipient, type, message, task: task._id });
  }
  if (prefs.email?.[key]) {
    const appUrl = process.env.CLIENT_URL || "http://localhost:3000";
    await sendEmail({
      to: user.email,
      subject: `NexTask: ${message}`,
      text: `${message}\n\nOpen the task: ${appUrl}/tasks?task=${task._id}`,
    });
  }
  return notification;
}
