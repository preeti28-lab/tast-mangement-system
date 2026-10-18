import Notification from "../models/Notification.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { sendEmail } from "./mailer.js";

/** How long before the deadline the reminder goes out. */
export const REMINDER_LEAD_MS = 60 * 60 * 1000;
/** Minimum gap between two sweeps on one server instance. */
const SWEEP_EVERY_MS = 60 * 1000;

let lastSweep = 0;
let running = null;

const minutesLeft = (dueDate, now) => Math.max(1, Math.round((dueDate.getTime() - now.getTime()) / 60_000));

function reminderMessage(task, now) {
  const mins = minutesLeft(task.dueDate, now);
  const left = mins >= 55 ? "1 hour" : `${mins} minute${mins === 1 ? "" : "s"}`;
  return `Reminder: "${task.title}" is due in ${left}. Time to wrap it up!`;
}

/**
 * Sends the "due in 1 hour" reminder for every open task whose deadline falls in
 * the next hour and hasn't been reminded yet. Each task is claimed with an atomic
 * update first, so overlapping sweeps (several server instances) never double-send.
 * The reminder goes to the assignee, or to the creator when nobody is assigned.
 */
export async function sendDueReminders(now = new Date()) {
  const due = await Task.find({
    reminderSentAt: null,
    status: { $ne: "completed" },
    dueDate: { $gt: now, $lte: new Date(now.getTime() + REMINDER_LEAD_MS) },
  })
    .select("_id")
    .lean();

  let sent = 0;
  for (const { _id } of due) {
    const task = await Task.findOneAndUpdate(
      { _id, reminderSentAt: null },
      { reminderSentAt: now },
      { returnDocument: "after" }
    );
    if (!task) continue; // another sweep got it first

    const recipient = task.assignedTo ?? task.createdBy;
    const user = await User.findById(recipient).select("email notificationPrefs");
    const prefs = user?.notificationPrefs ?? {};
    if (!user || prefs.muteAll) continue;

    const message = reminderMessage(task, now);
    if (prefs.inApp?.dueReminder !== false) {
      await Notification.create({ recipient, type: "task_reminder", message, task: task._id });
      sent += 1;
    }
    if (prefs.email?.dueReminder) {
      const appUrl = process.env.CLIENT_URL || "http://localhost:3000";
      await sendEmail({
        to: user.email,
        subject: `⏰ "${task.title}" is due in ${minutesLeft(task.dueDate, now)} minutes`,
        text: `${message}\n\nOpen the task: ${appUrl}/tasks?task=${task._id}`,
      });
    }
  }
  return sent;
}

/**
 * Runs a sweep at most once a minute per instance. Called from a timer on the
 * long-running server and from the notification poll, so reminders also go out
 * on serverless hosts where no timer survives between requests.
 */
export function maybeSendDueReminders() {
  if (running || Date.now() - lastSweep < SWEEP_EVERY_MS) return running;
  lastSweep = Date.now();
  running = sendDueReminders()
    .catch((error) => console.error(`Due reminders failed: ${error.message}`))
    .finally(() => {
      running = null;
    });
  return running;
}
