import { enqueueOffline, isQueueable } from "./offlineQueue";

export type Role = "admin" | "manager" | "user";

export type User = {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

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
  };
  recentTasks: Task[];
  overdueTasks: Task[];
};

export type Notification = {
  _id: string;
  type: "task_assigned" | "task_updated";
  message: string;
  task?: { _id: string; title: string } | null;
  read: boolean;
  createdAt: string;
};

export type NotificationPrefs = {
  muteAll: boolean;
  inApp: { taskAssigned: boolean; taskUpdated: boolean };
  email: { taskAssigned: boolean; taskUpdated: boolean };
};

export type AuditAction =
  | "task.created"
  | "task.updated"
  | "task.assigned"
  | "task.status_changed"
  | "task.deleted"
  | "task.recurred"
  | "user.registered"
  | "user.role_changed";

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
    open: number;
    overdue: number;
    completionRate: number;
    onTimeRate: number;
    avgCompletionDays: number | null;
  };
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<TaskPriority, number>;
  trend: { weekStart: string; created: number; completed: number; overdue: number }[];
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
  login: (body: { email: string; password: string }) =>
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

export const analyticsApi = {
  get: (scope: "me" | "team") => request<Analytics>(`/analytics?scope=${scope}`),
};
