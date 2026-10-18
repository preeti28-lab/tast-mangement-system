# TaskFlow – Task Management System

A task management app for small teams. Users can create tasks, assign them to teammates, get notified when something is assigned to them, and keep track of what is due or overdue.

Built for the *Software Developer Take-Home Assignment*.

| | |
|---|---|
| **Live app** | https://taskflow-nu-lake.vercel.app |
| **API** | https://taskflow-backend-bay.vercel.app (health check: [`/api/health`](https://taskflow-backend-bay.vercel.app/api/health)) |
| **Stack** | Next.js 16 · Tailwind CSS v4 · Node.js · Express 5 · MongoDB (Mongoose) |

---

## Features

### Core requirements
- **Authentication**: register and log in. Passwords are hashed with **bcrypt** (12 rounds). Sessions use a **JWT stored in an `httpOnly`, `SameSite=Lax` cookie** (`Secure` in production), so JavaScript can't read the token.
- **Task management**: full CRUD. Each task has a title, description, due date, priority (low / medium / high) and status (to do / in progress / completed).
- **Team collaboration**: assign a task to any registered user. The assignee gets an **in-app notification**: a bell in the navbar with an unread badge that refreshes every 30s, plus a notifications page. Clicking a notification opens that task.
- **Dashboard**: counts for *assigned to me*, *created by me*, *overdue* and *completed*, plus a list of recent tasks and a list of overdue tasks.
- **Search and filter**: search by title or description. Filter by status, priority and due-date range, and sort by created / due / updated date. Results are paginated.

### Extras
- **Permissions**: the creator can edit and delete a task. The assignee can only change its status. Anyone else can't see the task at all: the API returns 404, so task ids of other users aren't revealed.
- **Status notifications**: when the assignee changes a task's status, the creator is notified, and the other way round.
- **Filters in the URL**: filters live in the query string, so a filtered view survives a refresh and can be shared as a link.
- **Responsive UI**: on small screens the sidebar becomes a drawer and the task table becomes cards. There is a dark mode, plus toasts and loading, empty and error states.
- **Validation on both sides**: the client validates forms, and the server validates every request again.

---

## Architecture

```
Browser ──► Next.js (Vercel)
              ├─ pages: /login /register /dashboard /tasks /notifications
              ├─ proxy.ts   – redirects based on whether the auth cookie exists
              └─ rewrite /api/*  ─────────►  Express API (Vercel Function)
                                               ├─ auth   (JWT cookie)
                                               ├─ tasks  (CRUD, search, filters)
                                               ├─ users  (assignee list)
                                               ├─ notifications
                                               └─ dashboard
                                                     │
                                                     ▼
                                              MongoDB Atlas
```

**Why the `/api` rewrite?** The browser only ever talks to the Next.js origin. Next.js forwards `/api/*` to the Express backend (`next.config.ts`). This means:
- the auth cookie is a **first-party cookie** on the frontend domain, so it isn't blocked as a third-party cookie and doesn't need `SameSite=None`;
- the browser makes no cross-origin requests, so there is no CORS setup in the browser;
- `proxy.ts` can see the cookie and redirect logged-out users before a page renders.

### Project structure

```
backend/
  src/
    server.js              start-up: check env, connect to DB, listen
    app.js                 express app, middleware, routes
    config/db.js           MongoDB connection
    models/                User, Task, Notification
    controllers/           auth, task, user, notification, dashboard
    routes/                one router per resource
    middleware/            protect (JWT auth), error handler
    utils/                 JWT/cookie helpers, regex escaping
frontend/
  src/
    app/(auth)/            login + register (split-screen layout)
    app/(app)/             logged-in pages: dashboard, tasks, notifications
    components/layout/     AppShell, Sidebar, Navbar, NotificationBell, UserMenu
    components/tasks/      list, filters, form modal, detail modal, delete dialog
    components/ui/         Modal, Toast
    lib/                   typed API client, validation, date helpers
    proxy.ts               auth redirects
render.yaml                optional Render blueprint (alternative backend host)
```

---

## Running locally

**Requirements:** Node.js 20+ and a MongoDB database (a free MongoDB Atlas cluster or a local `mongod`).

```bash
git clone https://github.com/preeti28-lab/tast-mangement-system.git
cd tast-mangement-system

# 1. Backend  (http://localhost:5000)
cd backend
cp .env.example .env        # then fill in MONGODB_URI and JWT_SECRET
npm install
npm run dev

# 2. Frontend (http://localhost:3000) – in a second terminal
cd frontend
cp .env.example .env.local  # BACKEND_URL=http://localhost:5000
npm install
npm run dev
```

Open http://localhost:3000, create an account and start adding tasks. To try assignments and notifications, register a second user in a private window.

### Environment variables

| Where | Variable | Description |
|---|---|---|
| backend | `MONGODB_URI` | MongoDB connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/task_management` |
| backend | `JWT_SECRET` | Long random string used to sign tokens. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| backend | `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| backend | `CLIENT_URL` | Frontend origin allowed by CORS (default `http://localhost:3000`) |
| backend | `PORT` | Port for the local server (default `5000`; not used on Vercel) |
| backend | `NODE_ENV` | `production` turns on `Secure` cookies and hides error details |
| frontend | `BACKEND_URL` | Where `/api/*` is forwarded to. **Read at build time**, so redeploy after changing it |

---

## Deployment

Both apps run on **Vercel** as two separate projects from this one repository:

| Vercel project | Root directory | What it runs |
|---|---|---|
| `taskflow` | `frontend` | The Next.js app |
| `taskflow-backend` | `backend` | The Express API. Vercel detects Express with zero config and runs `src/app.js` as a single Vercel Function |

### 1. MongoDB Atlas
1. Create a free cluster and a database user.
2. In **Network Access**, allow `0.0.0.0/0`. Vercel Functions have no fixed outbound IP.
3. Copy the connection string and add the database name, e.g. `.../task_management?retryWrites=true&w=majority`.

### 2. Backend
```bash
cd backend
vercel link --project taskflow-backend
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production      # long random string
vercel env add NODE_ENV production        # value: production
vercel env add CLIENT_URL production      # the frontend URL, e.g. https://taskflow-nu-lake.vercel.app
vercel deploy --prod
```
Check that `https://<backend>.vercel.app/api/health` returns `{"status":"ok","db":"connected"}`.

To run on serverless, the backend opens its MongoDB connection lazily on the first request and caches it for later requests (`src/config/db.js`). If the database can't be reached, it returns a `503` instead of crashing. Locally, `src/server.js` connects first and then calls `app.listen`.

### 3. Frontend
```bash
cd frontend
vercel link --project taskflow
vercel env add BACKEND_URL production     # e.g. https://taskflow-backend-bay.vercel.app
vercel deploy --prod
```
`BACKEND_URL` is read when the app is built, so redeploy the frontend whenever it changes.

You can also connect both projects to the GitHub repository in the Vercel dashboard (Import Project → set the root directory) to deploy on every push.

> **Alternative:** `render.yaml` is a ready-made Render blueprint if you'd rather host the API on Render.
>
> **Windows note:** if the Vercel CLI fails with `fetch failed` / `SELF_SIGNED_CERT_IN_CHAIN`, it's usually antivirus or network software inspecting HTTPS traffic. Run it with `$env:NODE_OPTIONS="--use-system-ca"` so Node trusts the Windows certificate store.

---

## API reference

All routes except register and login require the auth cookie (an `Authorization: Bearer <token>` header also works). Errors look like `{ "message": "...", "errors": { "field": "..." } }`.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` → creates the user and sets the cookie |
| POST | `/api/auth/login` | `{ email, password }` → sets the cookie |
| POST | `/api/auth/logout` | Clears the cookie |
| GET | `/api/auth/me` | Current user |
| GET | `/api/tasks` | List tasks. Query parameters: `view=all\|assigned\|created\|overdue`, `search`, `status`, `priority`, `dueFrom`, `dueTo` (ISO dates), `sort=newest\|oldest\|due_asc\|due_desc\|updated`, `page`, `limit` (max 50) |
| POST | `/api/tasks` | Create `{ title, description?, dueDate?, priority?, status?, assignedTo? }` |
| GET | `/api/tasks/:id` | Task details (creator or assignee only) |
| PATCH | `/api/tasks/:id` | Update (creator: all fields; assignee: `status` only) |
| DELETE | `/api/tasks/:id` | Delete (creator only); also removes the task's notifications |
| GET | `/api/users?search=` | Users that a task can be assigned to |
| GET | `/api/dashboard` | Counts, recent tasks and overdue tasks |
| GET | `/api/notifications` | Latest 20 notifications and the unread count |
| PATCH | `/api/notifications/:id/read` | Mark one notification as read |
| PATCH | `/api/notifications/read-all` | Mark all notifications as read |
| GET | `/api/health` | Liveness check and DB connection state |

---

## Approach and design decisions

- **Feature by feature.** I built it in order: auth → app shell and dashboard → task CRUD, assignment, search and filters. Each step was tested against the real database before moving on.
- **Cookie-based JWT instead of `localStorage`.** An `httpOnly` cookie can't be read by injected scripts, which limits the damage from XSS. `SameSite=Lax`, together with the same-origin `/api` rewrite, protects against CSRF without needing a separate CSRF token.
- **Authorization is enforced on the server.** The UI hides the edit and delete buttons from non-creators, but the API checks permissions on every request. `proxy.ts` only does a quick redirect based on whether the cookie exists. The backend does the real token check.
- **What "overdue" means.** A task is overdue when its due date has passed and its status isn't *completed*. The user picks a due date as a calendar day in their own timezone, and it is stored as **the end of that day**. So a task due "today" becomes overdue only after local midnight, not at UTC midnight.
- **Search.** Search uses a case-insensitive regex on title and description, with the user's input escaped first. This allows partial matches like "rel" → "release". A MongoDB text index only matches whole words.
- **Sorting by due date.** When sorting by due date, tasks without one always come last. This needs a small aggregation stage, because MongoDB sorts `null` values first.
- **Notifications via polling.** The bell polls every 30 seconds instead of using WebSockets. This is simple, and it works on serverless hosting like Vercel Functions, which can't keep WebSocket connections open.

## Assumptions and trade-offs

- **Everyone is a teammate.** Every registered user can see the list of users and assign tasks to any of them. There are no workspaces or teams.
- **Unassigned tasks are allowed.** A task's creator always has access to it.
- **No past due dates on new tasks.** New tasks can't be given a due date in the past. An existing overdue task can still be edited without changing its due date.
- **No refresh tokens.** Sessions last 7 days and then the user logs in again.
- **No automated test suite yet.** Features were checked manually and with scripted end-to-end runs against a real database. Jest/Supertest tests are the next step.
- **Not implemented:** the optional advanced tasks (RBAC, Socket.io, recurring tasks, audit log, PWA, analytics, notification preferences).

## How AI was used

This project was built with an AI coding assistant (Claude Code) in pair-programming style. I described each step (setup, auth, dashboard, tasks) and the assistant drafted the code, ran builds and end-to-end checks, and fixed the issues they found. Examples: a 404 caused by prefetch requests on auth redirects, tasks without a due date sorting first, and stack traces leaking in 4xx responses. I reviewed the design choices listed above, such as cookie-based auth, the `/api` rewrite and timezone-aware overdue logic, and I can explain them.
