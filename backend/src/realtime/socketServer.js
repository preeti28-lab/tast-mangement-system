import { Server } from "socket.io";
import Notification from "../models/Notification.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { verifySocketToken } from "../utils/token.js";
import { isStaff } from "../utils/permissions.js";

const userRoom = (id) => `user:${id}`;
const STAFF_ROOM = "staff";
const POLL_MS = 5000;

/**
 * Attaches Socket.io to the HTTP server and pushes events to connected users:
 *   "notification"  – a new notification for that user
 *   "task:changed"  – a task the user can see was created or updated (lists refresh)
 *
 * Events are driven by MongoDB change streams, so it doesn't matter which server
 * instance (Vercel function, Render, local) wrote the change. If change streams are
 * unavailable (e.g. a standalone local mongod), it falls back to polling.
 */
export function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const { id } = verifySocketToken(socket.handshake.auth?.token);
      const user = await User.findById(id).select("role");
      if (!user) return next(new Error("Unauthorized"));
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { user } = socket.data;
    socket.join(userRoom(user._id));
    if (isStaff(user)) socket.join(STAFF_ROOM);
  });

  const emitNotification = async (doc) => {
    const notification = await Notification.findById(doc._id).populate("task", "title");
    if (notification) io.to(userRoom(notification.recipient)).emit("notification", notification);
  };

  const emitTaskChange = (task, op) => {
    const rooms = [STAFF_ROOM, task.createdBy, task.assignedTo]
      .filter(Boolean)
      .map((r) => (r === STAFF_ROOM ? r : userRoom(r)));
    io.to(rooms).emit("task:changed", { taskId: task._id, op });
  };

  startWatchers({ emitNotification, emitTaskChange });
  return io;
}

function startWatchers({ emitNotification, emitTaskChange }) {
  try {
    const notifications = Notification.watch([{ $match: { operationType: "insert" } }]);
    const tasks = Task.watch([{ $match: { operationType: { $in: ["insert", "update", "replace"] } } }], {
      fullDocument: "updateLookup",
    });

    notifications.on("change", (change) => emitNotification(change.fullDocument).catch(console.error));
    tasks.on("change", (change) => {
      if (change.fullDocument) emitTaskChange(change.fullDocument, change.operationType);
    });

    let fellBack = false;
    const fallback = (error) => {
      if (fellBack) return;
      fellBack = true;
      console.warn(`Change streams unavailable (${error.message}); polling every ${POLL_MS / 1000}s`);
      notifications.close().catch(() => {});
      tasks.close().catch(() => {});
      startPolling({ emitNotification, emitTaskChange });
    };
    notifications.on("error", fallback);
    tasks.on("error", fallback);
    console.log("Realtime: watching MongoDB change streams");
  } catch (error) {
    startPolling({ emitNotification, emitTaskChange });
  }
}

function startPolling({ emitNotification, emitTaskChange }) {
  let since = new Date();
  setInterval(async () => {
    const now = new Date();
    try {
      const [notifications, tasks] = await Promise.all([
        Notification.find({ createdAt: { $gt: since, $lte: now } }).select("_id"),
        Task.find({ updatedAt: { $gt: since, $lte: now } }).select("createdBy assignedTo"),
      ]);
      since = now;
      await Promise.all(notifications.map(emitNotification));
      tasks.forEach((task) => emitTaskChange(task, "update"));
    } catch (error) {
      console.error(`Realtime polling failed: ${error.message}`);
    }
  }, POLL_MS).unref();
}
