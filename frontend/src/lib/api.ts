export type User = {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type UserRef = Pick<User, "_id" | "name" | "email">;

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  _id: string;
  title: string;
  description: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
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
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: User }>("/auth/me"),
};

export type TaskView = "all" | "assigned" | "created" | "overdue";
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
    request<{ task: Task }>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => request<{ message: string }>(`/tasks/${id}`, { method: "DELETE" }),
};

export const userApi = {
  list: () => request<{ users: UserRef[] }>("/users"),
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
