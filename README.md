# NexTask – Task Management System

A task management app for small teams. Users can create tasks, assign them to teammates, get notified when something is assigned to them, and keep track of what is due or overdue. Admins and managers also get team analytics and an audit log.

Built for the *Software Developer Take-Home Assignment*. It covers **every core requirement** and **seven of the eight optional advanced tasks**. The one left out is WebSocket-based real-time notifications; see [trade-offs](#assumptions-and-trade-offs).

| | |
|---|---|
| **Live app** | https://taskflow-nu-lake.vercel.app |
| **REST API** | https://taskflow-backend-bay.vercel.app (health check: [`/api/health`](https://taskflow-backend-bay.vercel.app/api/health)) |
| **Stack** | Next.js 16 · Tailwind CSS v4 · Node.js · Express 5 · MongoDB (Mongoose) · Jest |

---

## Features

### Core requirements

| Requirement | Implementation |
|---|---|
| **Authentication** | Register and log in. Passwords are hashed with **bcrypt** (12 rounds). Sessions use a **JWT in an `httpOnly`, `SameSite=Lax` cookie** (`Secure` in production). |
| **Task CRUD** | Title, description, due date, priority, status. Create, read, update and delete, with validation on both client and server. |
| **Team collaboration** | Assign a task to any registered user. The assignee is **notified** in-app with the bell and a pop-up (checked every 30 s and whenever the tab regains focus), and optionally by email. |
| **Dashboard** | Counts for *assigned to me*, *created by me*, *overdue* and *completed*, plus lists of recent and overdue tasks. Refreshes when new notifications arrive. |
| **Search and filter** | Search by title or description. Filter by status, priority and due-date range. Sort, paginate, and keep the filters in the URL. |

### Advanced tasks

| Task | Implementation |
|---|---|
| **RBAC** | Three roles: **Admin**, **Manager** and **Member** (see the [permission matrix](#roles-and-permissions)). The first account becomes Admin. Admins change roles on the *Team* page. The API checks permissions on every request, and the UI hides actions you can't take. |
| **Recurring tasks** | Tasks can repeat daily, weekly or monthly. Completing one creates the next occurrence with the due date moved forward. Monthly repeats clamp to the end of shorter months (Jan 31 → Feb 28). Re-completing never creates duplicates. |
| **Audit logging** | Every create, edit (with field-level *from → to* changes), assignment, status change, delete, automatic repeat, registration and role change is logged. There is an *Activity Log* page (filterable, paginated) and a *History* section on each task. |
| **Offline support (PWA)** | The app is installable, with a manifest and icons. A service worker caches the app shell, pages and API responses (network-first). When offline, task changes are **queued and synced automatically** when the connection comes back, with an offline banner and a pending count. |
| **Unit and integration tests** | **39 Jest + Supertest tests** run against an in-memory MongoDB. They cover auth, CRUD, RBAC, search and filters, notifications and preferences, recurrence, audit and analytics. |
| **Analytics dashboard** | Completion rate, on-time rate, average time to complete, created vs. completed per week, overdue trend, breakdowns by status and priority, and **completed tasks per user**. Admins and managers can switch between *Team* and *Just me*. |
| **Customizable notifications** | On the *Settings* page you can mute everything, or switch in-app and email alerts on or off separately for *assigned* and *status changed*. Email goes out through SMTP when it's configured. |

### Roles and permissions

| Action | Member | Manager | Admin |
|---|:-:|:-:|:-:|
| See tasks they created or are assigned to | ✅ | ✅ | ✅ |
| See **all** team tasks | – | ✅ | ✅ |
| Edit a task | their own | any | any |
| Change status | own + assigned to them | any | any |
| Delete a task | their own | their own | any |
| Team analytics and full activity log | – | ✅ | ✅ |
| Change roles | – | – | ✅ (not their own) |

---

## Architecture

```
                 ┌──────────────────── Vercel ────────────────────┐
Browser ─────────► Next.js (frontend)                               │
  pages, /api    │   └─ rewrite /api/* ──► Express REST API ────────┼──► MongoDB Atlas
                 └────────────────────────────────────────────────┘
```

- **Same-origin API.** The browser only talks to the Next.js origin. `/api/*` is forwarded to Express, so the auth cookie is first-party and there's no CORS in the browser.
- **Serverless backend.** `src/app.js` runs as a single Vercel Function. The MongoDB connection is opened on the first request and cached for later ones. If the database can't be reached, the API returns a `503` instead of crashing.
- **Notifications by polling.** The bell asks for new notifications every 30 s, and again whenever the tab becomes visible. New ones show a pop-up and make open task lists and dashboards refresh.

### Project structure

```
backend/
  src/
    server.js              local entry (connect DB, listen)
    app.js                 express app (also the Vercel Function entry)
    config/db.js           cached MongoDB connection (serverless-friendly)
    models/                User (role, notificationPrefs), Task, Notification, AuditLog
    controllers/           auth, task, user, notification, dashboard, audit, analytics
    services/              auditService, notificationService (prefs + email), mailer
    utils/                 permissions (RBAC), recurrence, tokens, regex escaping
  tests/                   Jest + Supertest suites
  scripts/set-role.js      promote/demote a user from the CLI
frontend/
  src/
    app/(auth)/            login, register
    app/(app)/             dashboard, tasks, analytics, activity, team, notifications, settings
    components/            layout (shell, sidebar, bell, offline sync), tasks, analytics charts, ui
    lib/                   API client, permissions, audit text, offline queue, task events, formatting
  public/sw.js             service worker
```

---

## Running locally

**Requirements:** Node.js 20+ and a MongoDB database (a free Atlas cluster or a local `mongod`).

```bash
git clone https://github.com/preeti28-lab/tast-mangement-system.git
cd tast-mangement-system

# 1. Backend: http://localhost:5000
cd backend
cp .env.example .env        # fill in MONGODB_URI and JWT_SECRET
npm install
npm run dev

# 2. Frontend: http://localhost:3000 (second terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The first account you register becomes the **Admin**. To try assignments and notifications, register a second user in a private window. You can also change a role from the command line:

```bash
cd backend && npm run set-role -- someone@example.com manager
```

### Tests

```bash
cd backend
npm test          # 39 tests, in-memory MongoDB (no database setup needed)
```

### Environment variables

| Where | Variable | Description |
|---|---|---|
| backend | `MONGODB_URI` | MongoDB connection string |
| backend | `JWT_SECRET` | Long random string used to sign session tokens |
| backend | `JWT_EXPIRES_IN` | Session lifetime (default `7d`) |
| backend | `CLIENT_URL` | Frontend origin. Used for CORS and for links in emails |
| backend | `NODE_ENV` | `production` turns on `Secure` cookies and hides error details |
| backend | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional. Turns on email notifications |
| frontend | `BACKEND_URL` | Where `/api/*` is forwarded to (read at build time) |

---

## Deployment

| Service | Host | Root dir | Notes |
|---|---|---|---|
| Frontend | Vercel project `taskflow` | `frontend` | env: `BACKEND_URL` |
| REST API | Vercel project `taskflow-backend` | `backend` | Zero-config Express; `src/app.js` runs as a Vercel Function |
| Database | MongoDB Atlas | – | Network Access `0.0.0.0/0` (serverless IPs aren't fixed) |

```bash
cd backend  && vercel link --project taskflow-backend && vercel env add MONGODB_URI production && vercel env add JWT_SECRET production && vercel env add NODE_ENV production && vercel env add CLIENT_URL production && vercel deploy --prod
cd frontend && vercel link --project taskflow && vercel env add BACKEND_URL production && vercel deploy --prod
```

Both Vercel projects are connected to this GitHub repository, so **every push to `main` deploys automatically**. Pushes to other branches get preview URLs. `BACKEND_URL` is read when the frontend is built, so redeploy the frontend after changing it.

> **Windows note:** if the Vercel CLI fails with `fetch failed` / `SELF_SIGNED_CERT_IN_CHAIN`, antivirus or network software is inspecting HTTPS traffic. Run it with `$env:NODE_OPTIONS="--use-system-ca"`.

---

## API reference

All routes except register and login require the auth cookie (or `Authorization: Bearer <token>`). Errors look like `{ "message": "...", "errors": { "field": "..." } }`.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }`. The first user becomes admin |
| POST | `/api/auth/login` / `/api/auth/logout` | Start or end the session (cookie) |
| GET | `/api/auth/me` | Current user, including `role` |
| GET | `/api/tasks` | `view=all\|assigned\|created\|overdue\|team` (`team` for staff only), `search`, `status`, `priority`, `dueFrom`, `dueTo`, `sort`, `page`, `limit` |
| POST | `/api/tasks` | `{ title, description?, dueDate?, priority?, status?, recurrence?, assignedTo? }` |
| GET / PATCH / DELETE | `/api/tasks/:id` | Permissions as in the matrix above. PATCH returns `nextOccurrence` when a recurring task is completed |
| GET | `/api/users` | Team members (id, name, email, role) |
| PATCH | `/api/users/:id/role` | Admin only: `{ role: "admin" \| "manager" \| "user" }` |
| GET / PUT | `/api/users/me/preferences` | Notification preferences |
| GET | `/api/notifications` | Latest 20 plus the unread count |
| PATCH | `/api/notifications/:id/read`, `/api/notifications/read-all` | Mark notifications as read |
| GET | `/api/dashboard` | Personal counts, recent and overdue tasks |
| GET | `/api/analytics?scope=me\|team` | Summary, breakdowns, 8-week trend, per-user stats (`team` for staff only) |
| GET | `/api/audit-logs?task=&action=&page=` | Audit trail. Staff see everything; members see the tasks they're involved in |
| GET | `/api/health` | Liveness check and DB state |

---

## Approach and design decisions

- **Feature by feature, tested as I went.** The order was auth → shell and dashboard → task CRUD and search → advanced features. Every step was checked with API tests, then scripted browser runs (headless Edge) against the real database, including mobile widths.
- **Cookie-based JWT instead of `localStorage`.** It can't be read by injected scripts. `SameSite=Lax` plus the same-origin rewrite protects against CSRF.
- **RBAC in one module.** The rules live in `utils/permissions.js`. The frontend mirrors them in `lib/permissions.ts` only to show or hide controls. A task a user can't see returns **404**, not 403, so task ids of other users aren't revealed.
- **Audit entries store a title snapshot and the people involved.** Logs stay readable after a task is deleted, and members still see entries for tasks they were part of, such as a task that was reassigned away from them.
- **Analytics need `completedAt`.** Completion time is recorded on the status change. The overdue trend asks "was this task past due and not yet completed at the end of week N?", so a task finished late still shows as overdue in the weeks before it was finished.
- **Offline writes are queued by the app, not the service worker.** The app knows which requests are safe to replay (task create, update, delete), shows them as pending, and replays them in order when the connection returns. Cached API data is cleared on logout so the next person on the device can't read it.
- **Overdue and timezones.** A due date is stored as the end of the chosen local day, so "due today" only becomes overdue after local midnight.

## Assumptions and trade-offs

- **No WebSockets.** The backend runs as Vercel serverless functions, which can't keep WebSocket connections open. Socket.io would need a separate always-on server, so I chose polling instead: the bell checks every 30 s and on tab focus. Notifications can therefore take up to about 30 s to appear.
- **Everyone is a teammate.** All users can see the member list and assign tasks to each other. There are no separate workspaces.
- **Email needs SMTP settings.** Preferences are saved either way, and the Settings page says when email isn't configured.
- **Analytics are computed in memory per request.** This is fine for a small team. A larger deployment would pre-aggregate them.
- **Offline conflicts use "last write wins".** If a queued change is rejected (for example, the task was deleted meanwhile), it is dropped and the user is told.
- **No refresh tokens.** Sessions last 7 days.

## How AI was used

This project was built with an AI coding assistant (Claude Code) in pair-programming style. I described each step and the requirements from the assignment, made the product and architecture decisions, and reviewed the results. Two decisions are examples: the permission matrix, and keeping notifications on polling so everything runs on Vercel. The assistant drafted the code, wrote and ran the Jest tests and the browser end-to-end scripts, and fixed what they caught. Examples: a 404 from prefetch requests on auth redirects, tasks without a due date sorting first, stack traces in 4xx responses, tiny chart labels on mobile, and Node failing TLS behind antivirus HTTPS inspection. I can walk through any part of the design in the interview.
