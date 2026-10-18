import { enqueueOffline, isQueueable } from "./offlineQueue";

export type Role = "admin" | "manager" | "user";

/** Switches the admin can turn on or off per role (Settings → Role access). */
export type PermissionKey =
  | "tasks.viewAll"
  | "tasks.editAny"
  | "tasks.deleteAny"
  | "tasks.assignOthers"
  | "analytics.team"
  | "audit.viewAll"
  | "users.manage";

export type Permissions = Record<PermissionKey, boolean>;

export type User = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  /** Effective permissions of the user's role (sent by /auth/me). */
  permissions?: Permissions;
};

export type RoleAccess = {
  permissions: { key: PermissionKey; label: string; description: string }[];
  roles: Exclude<Role, "admin">[];
  access: Record<Exclude<Role, "admin">, Permissions>;
};

export type Portal = "admin" | "manager";

export type UserRef = Pick<User, "_id" | "name" | "email"> & { role?: Role };

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";
export type TaskRecurrence = "none" | "daily" | "weekly" | "monthly";

export type Task = {
  _id: string;
  title: string;
  description: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  recurrence: TaskRecurrence;
  completedAt?: string | null;
  nextOccurrence?: string | null;
  createdBy: UserRef;
  assignedTo: UserRef | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardData = {
  stats: {
    total: number;
    assignedToMe: number;
    createdByMe: number;
    overdue: number;
    completed: number;
    /** Not-completed tasks due in the next 7 days. */
    dueSoon?: number;
  };
  recentTasks: Task[];
  overdueTasks: Task[];
  /** Team top 3 by completed assigned tasks. */
  topPerformers: { user: UserRef; assigned: number; completed: number; onTime: number; completionRate: number }[];
  /** Not-completed tasks due in the next 7 days, soonest first. */
  upcomingTasks?: Task[];
  /** The user's created/completed tasks per week, last 8 weeks (oldest first). */
  trend?: { weekStart: string; created: number; completed: number }[];
  byStatus?: Record<TaskStatus, number>;
  byPriority?: Record<TaskPriority, number>;
};

export type Notification = {
  _id: string;
  type: "task_assigned" | "task_updated" | "task_reminder";
  message: string;
  task?: { _id: string; title: string } | null;
  read: boolean;
  createdAt: string;
};

export type NotificationPrefs = {
  muteAll: boolean;
  inApp: { taskAssigned: boolean; taskUpdated: boolean; dueReminder: boolean };
  email: { taskAssigned: boolean; taskUpdated: boolean; dueReminder: boolean };
};

export type AuditAction =
  | "task.created"
  | "task.updated"
  | "task.assigned"
  | "task.status_changed"
  | "task.deleted"
  | "task.recurred"
  | "user.registered"
  | "user.role_changed"
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "settings.access_changed";

export type AuditLog = {
  _id: string;
  actor: UserRef | null;
  action: AuditAction;
  task: string | null;
  taskTitle: string;
  targetUser: UserRef | null;
  changes: { field: string; from: unknown; to: unknown }[];
  createdAt: string;
};

export type Analytics = {
  scope: "me" | "team";
  summary: {
    total: number;
    completed: number;
    completedOnTime: number;
    open: number;
    overdue: number;
    completionRate: number;
    onTimeRate: number;
    avgCompletionDays: number | null;
  };
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  trend: { weekStart: string; created: number; completed: number; overdue: number }[];
  /** Tasks by creation week (last 6, oldest first); values[k] = % completed by week k, null = not yet. */
  cohorts: { weekStart: string; size: number; values: (number | null)[] }[];
  perUser: {
    user: UserRef;
    assigned: number;
    completed: number;
    onTime: number;
    overdue: number;
    completionRate: number;
    /** Completed per week, last 6 weeks (oldest first). */
    weeklyCompleted: number[];
  }[];
};

/** The other person in a chat, with presence. */
export type ChatUser = UserRef & { role: Role; lastSeenAt: string | null; online: boolean };

export type ChatMessage = {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  _id: string;
  user: ChatUser;
  lastMessage: { _id: string; sender: string; text: string; deleted: boolean; createdAt: string } | null;
  lastMessageAt: string | null;
  unread: number;
  myLastReadAt: string | null;
  /** The other person has read / received everything sent up to these times. */
  otherLastReadAt: string | null;
  otherLastDeliveredAt: string | null;
};

export type FieldErrors = Partial<Record<string, string>>;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: FieldErrors = {}
  ) {
    super(message);
  }
}

/** Thrown when a change was saved to the offline queue instead of being sent. */
export class OfflineQueuedError extends ApiError {
  constructor() {
    super("You're offline. The change was saved and will sync when you're back online.", 0);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method ?? "GET";
  const queueable = isQueueable(method, path);
  if (queueable && typeof navigator !== "undefined" && !navigator.onLine) {
    enqueueOffline({ method, path, body: init.body as string | undefined });
    throw new OfflineQueuedError();
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    if (queueable) {
      enqueueOffline({ method, path, body: init.body as string | undefined });
      throw new OfflineQueuedError();
    }
    throw new ApiError("Unable to reach the server. Please try again.", 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data.message ||
      (res.status >= 500 ? "Server error. Is the backend running?" : "Something went wrong");
    throw new ApiError(message, res.status, data.errors);
  }
  return data as T;
}

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    request<{ user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string; portal?: Portal }) =>
    request<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  forgotPassword: (body: { email: string }) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resetPassword: (body: { email: string; otp: string; password: string }) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: User }>("/auth/me"),
};

export type TaskView = "all" | "assigned" | "created" | "overdue" | "team";
export type TaskSort = "newest" | "oldest" | "due_asc" | "due_desc" | "updated";

export type TaskQuery = {
  view?: TaskView;
  search?: string;
  status?: TaskStatus | "";
  priority?: TaskPriority | "";
  dueFrom?: string; // ISO
  dueTo?: string; // ISO
  sort?: TaskSort;
  page?: number;
  limit?: number;
};

export type TaskInput = {
  title: string;
  description: string;
  dueDate: string | null; // ISO
  priority: TaskPriority;
  status: TaskStatus;
  recurrence: TaskRecurrence;
  assignedTo: string | null;
};

export type TaskListResponse = { tasks: Task[]; total: number; page: number; pages: number };

const toQueryString = (query: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

export const taskApi = {
  list: (query: TaskQuery) => request<TaskListResponse>(`/tasks${toQueryString(query)}`),
  get: (id: string) => request<{ task: Task }>(`/tasks/${id}`),
  create: (body: TaskInput) =>
    request<{ task: Task }>("/tasks", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<TaskInput>) =>
    request<{ task: Task; nextOccurrence?: Task }>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (id: string) => request<{ message: string }>(`/tasks/${id}`, { method: "DELETE" }),
};

export const userApi = {
  list: () => request<{ users: (UserRef & { role: Role; createdAt: string })[] }>("/users"),
  updateRole: (id: string, role: Role) =>
    request<{ user: User }>(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  getPreferences: () =>
    request<{ preferences: NotificationPrefs; emailAvailable: boolean }>("/users/me/preferences"),
  create: (body: { name: string; email: string; password: string; role: Role }) =>
    request<{ user: User }>("/users", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<{ name: string; email: string; role: Role; password: string }>) =>
    request<{ user: User }>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) =>
    request<{ message: string; unassignedTasks: number; movedTasks: number }>(`/users/${id}`, { method: "DELETE" }),
  updateProfile: (body: { name: string }) =>
    request<{ user: User }>("/users/me", { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>("/users/me/password", { method: "PUT", body: JSON.stringify(body) }),
  updatePreferences: (prefs: Partial<NotificationPrefs>) =>
    request<{ preferences: NotificationPrefs; emailAvailable: boolean }>("/users/me/preferences", {
      method: "PUT",
      body: JSON.stringify(prefs),
    }),
};

export const dashboardApi = {
  get: () => request<DashboardData>("/dashboard"),
};

export const notificationApi = {
  list: () =>
    request<{ notifications: Notification[]; unreadCount: number }>("/notifications"),
  markRead: (id: string) =>
    request<{ notification: Notification }>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request<{ message: string }>("/notifications/read-all", { method: "PATCH" }),
};

export const auditApi = {
  list: (query: { task?: string; action?: AuditAction | ""; page?: number; limit?: number }) =>
    request<{ logs: AuditLog[]; total: number; page: number; pages: number }>(
      `/audit-logs${toQueryString(query)}`
    ),
};

export const settingsApi = {
  getAccess: () => request<RoleAccess>("/settings/access"),
  updateAccess: (access: Partial<RoleAccess["access"]>) =>
    request<RoleAccess>("/settings/access", { method: "PUT", body: JSON.stringify(access) }),
};

export const chatApi = {
  conversations: () =>
    request<{ conversations: Conversation[]; unreadTotal: number; notify: boolean }>("/chat/conversations"),
  open: (userId: string) =>
    request<{ conversation: Conversation }>("/chat/conversations", { method: "POST", body: JSON.stringify({ userId }) }),
  messages: (id: string, query: { before?: string; since?: string } = {}) =>
    request<{ messages: ChatMessage[]; hasMore: boolean; conversation: Conversation }>(
      `/chat/conversations/${id}/messages${toQueryString(query)}`
    ),
  send: (id: string, text: string) =>
    request<{ message: ChatMessage }>(`/chat/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  markRead: (id: string) => request<{ readAt: string }>(`/chat/conversations/${id}/read`, { method: "POST" }),
  remove: (messageId: string) => request<{ message: ChatMessage }>(`/chat/messages/${messageId}`, { method: "DELETE" }),
};

export const analyticsApi = {
  get: (scope: "me" | "team") => request<Analytics>(`/analytics?scope=${scope}`),
};
