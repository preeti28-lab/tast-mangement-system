# NexTask – Task Management System

A task management app for small teams. Users can create tasks, assign them to teammates, get notified when something is assigned to them or about to be due, and keep track of what is due or overdue. Teammates can message each other in a WhatsApp-style chat. Admins decide what managers and members are allowed to do, manage the team, and get team analytics and an audit log. The UI works on phones, tablets and desktops, in light and dark mode.

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
| **Authentication** | Register and log in. Passwords are hashed with **bcrypt** (10 rounds; older 12-round hashes are upgraded on the next login). Sessions use a **JWT in an `httpOnly`, `SameSite=Lax` cookie** (`Secure` in production). Admins and managers have their own login pages (`/admin/login`, `/manager/login`) that only let that role in. **Forgot password** emails a 6-digit one-time code (valid 10 minutes, 5 attempts, 1-minute resend cooldown). |
| **Task CRUD** | Title, description, due date, priority, status. Create, read, update and delete, with validation on both client and server. |
| **Team collaboration** | Assign a task to any registered user. The assignee is **notified** in-app with the bell and a pop-up (checked every 30 s and whenever the tab regains focus), and optionally by email. |
| **Dashboard** | KPI tiles for *total*, *assigned to me*, *created by me*, *in progress*, *overdue* and *completed* (each opens the matching task list), a weekly activity chart, a status and priority breakdown, upcoming deadlines for the next 7 days, a *Focus deck* to start or skip to-do tasks, and a top-performer card. Refreshes when new notifications arrive. |
| **Search and filter** | Search by title or description. Filter by status, priority and due-date range. Sort, paginate, and keep the filters in the URL. Sidebar shortcuts for *Assigned to me*, *Created by me*, *Overdue* and *Team tasks*. Tasks can be **exported to CSV** for a date range (by created or due date). |

### Advanced tasks

| Task | Implementation |
|---|---|
| **RBAC** | Three roles: **Admin**, **Manager** and **Member**. The first account becomes Admin. What managers and members may do is **configurable by the admin** on *Settings → Role access* (see [roles and permissions](#roles-and-permissions)). Admins, or roles given *Manage users*, can add, edit and remove members and change roles on the *Team* page. The API checks permissions on every request, and the UI hides actions you can't take. |
| **Recurring tasks** | Tasks can repeat daily, weekly or monthly. Completing one creates the next occurrence with the due date moved forward. Monthly repeats clamp to the end of shorter months (Jan 31 → Feb 28). Re-completing never creates duplicates. |
| **Audit logging** | Every create, edit (with field-level *from → to* changes), assignment, status change, delete, automatic repeat, registration and role change is logged. There is an *Activity Log* page (filterable, paginated) and a *History* section on each task. |
| **Offline support (PWA)** | The app is installable, with a manifest and icons. A service worker caches the app shell, pages and API responses (network-first). When offline, task changes are **queued and synced automatically** when the connection comes back, with an offline banner and a pending count. |
| **Unit and integration tests** | **82 Jest + Supertest tests** run against an in-memory MongoDB. They cover auth and password reset, login portals, CRUD, configurable role access and user management, search and filters, notifications and preferences, due reminders, recurrence, profile and password change, chat (privacy, unread counts, read receipts, polling, paging, delete), audit and analytics. |
| **Analytics dashboard** | Completion rate, on-time rate, average time to complete, created vs. completed per week, overdue trend, breakdowns by status and priority, **completed tasks per user**, week-over-week comparison, a task funnel, completion cohorts and auto-generated insights. Roles with *Team analytics* can switch between *Team* and *Just me*, and see a workload map and a searchable team report on the *Team* page. |
| **Customizable notifications** | On the *Settings* page you can mute everything, or switch in-app and email alerts on or off separately for *assigned*, *status changed* and *due in 1 hour*. The **due reminder** goes to the assignee (or the creator if nobody is assigned) once per task, and again if the due date is moved. Email goes out through SMTP when it's configured. |

### Roles and permissions

Admins always have every permission, so nobody can lock the admin out. The switches for managers and members are set by the admin on *Settings → Role access* and apply immediately. The defaults are:

| Permission | Member | Manager | Admin |
|---|:-:|:-:|:-:|
| View all team tasks | – | ✅ | ✅ |
| Edit any task | – | ✅ | ✅ |
| Delete any task | – | – | ✅ |
| Assign tasks to others | ✅ | ✅ | ✅ |
| Team analytics | – | ✅ | ✅ |
| Full activity log | – | ✅ | ✅ |
| Manage users (never admins) | – | – | ✅ |

Whatever the settings say, everyone can see, edit and delete tasks they created, and see and change the status of tasks assigned to them. Only admins can change role access, edit admin accounts, or make someone an admin. Nobody can change their own role or delete their own account, and the last admin can't be deleted.

### Other features

- **Chat:** one-to-one messages between anyone in the organization, in a WhatsApp-style layout (chat list on the left, conversation on the right; one pane at a time on phones). Messages show ✓ sent, ✓✓ delivered and blue ✓✓ read, plus *online* / *last seen*. You can search chats, start a new chat from the contact list or with the *Message* button on the *Team* page, copy messages, and delete your own *for everyone*. Older messages load as you scroll up. New messages update an unread badge in the sidebar and navbar, show a pop-up on any page, and send a desktop notification when the tab is in the background (opt-in; off when *Mute all* is on). It uses the REST API only, no sockets: the open chat checks for new messages every 3 s and the rest of the app every 10 s.
- **Team page:** members grouped by role (tap a card to see what that role can do), and add / edit / remove members. Deleting a member unassigns their tasks and moves the tasks they created to the person deleting them.
- **Profile page:** your stats, completion and on-time rates, renaming yourself and changing your password.
- **Settings page:** light, dark or system theme, notification preferences, and role access (admins).
- **Responsive layout:** a slide-out sidebar on phones, card views instead of tables on small screens, and two-column KPI tiles.

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
- **Notifications by polling.** The bell asks for new notifications every 30 s, and again whenever the tab becomes visible. New ones show a pop-up and make open task lists and dashboards refresh. Chat uses the same approach, faster: every 3 s for the open conversation and every 10 s for the chat list.

### Project structure

```
backend/
  src/
    server.js              local entry (connect DB, listen)
    app.js                 express app (also the Vercel Function entry)
    config/db.js           cached MongoDB connection (serverless-friendly)
    models/                User (role, notificationPrefs, reset OTP, lastSeenAt), Task, Notification, AuditLog, Setting,
                           Conversation, Message
    controllers/           auth, task, user, notification, dashboard, audit, analytics, settings, chat
    services/              accessService (role access matrix), auditService, notificationService (prefs + email),
                           reminderService (due in 1 hour), mailer
    middleware/            auth (protect, authorize, requirePermission), error handler
    utils/                 permissions (RBAC checks), recurrence, tokens, regex escaping
  tests/                   Jest + Supertest suites
  scripts/
    set-role.js            promote/demote a user from the CLI
    seed-demo.js           add (or remove) a demo team and sample tasks next to real data
    seed-fresh.js          wipe the database and fill it with a fresh demo team
frontend/
  src/
    app/(auth)/            login, admin/login, manager/login, register, forgot-password
    app/(app)/             dashboard, tasks, analytics, activity, chat, team, notifications, settings, profile
    components/            layout (shell, sidebar, bell, offline sync), tasks, dashboard, analytics charts, team, chat, ui
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

Without SMTP settings, password-reset codes are printed in the backend console (development only).

### Demo data

```bash
cd backend
npm run seed:demo                  # add a demo team and ~70 tasks; real accounts are untouched
npm run seed:demo -- --reset       # remove the demo data again

node scripts/seed-fresh.js --confirm --backup backup.json   # WIPES the database, then seeds ~8 weeks of work
```

`seed-fresh.js` keeps the role access settings and creates these logins, all with the password `Test@123`: `admin@gmail.com` (admin), `manager@gmail.com` (manager), and `ajay@`, `priya@`, `rohit@`, `sneha@gmail.com` (members). Without `--confirm` it only prints what it would do; `--backup` is optional and saves the old data to a JSON file first.

### Tests

```bash
cd backend
npm test          # 82 tests, in-memory MongoDB (no database setup needed)
```

### Environment variables

| Where | Variable | Description |
|---|---|---|
| backend | `MONGODB_URI` | MongoDB connection string |
| backend | `JWT_SECRET` | Long random string used to sign session tokens |
| backend | `JWT_EXPIRES_IN` | Session lifetime (default `7d`) |
| backend | `CLIENT_URL` | Frontend origin. Used for CORS and for links in emails |
| backend | `NODE_ENV` | `production` turns on `Secure` cookies and hides error details |
| backend | `PORT` | Local API port (default `5000`) |
| backend | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional. Turns on email notifications, reminders and password-reset codes |
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

All routes except register, login, forgot/reset password and health require the auth cookie (or `Authorization: Bearer <token>`). Errors look like `{ "message": "...", "errors": { "field": "..." } }`.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }`. The first user becomes admin |
| POST | `/api/auth/login` | `{ email, password, portal? }`. `portal: "admin" \| "manager"` only lets that role in |
| POST | `/api/auth/logout` | End the session (clears the cookie) |
| POST | `/api/auth/forgot-password` | `{ email }`. Emails a 6-digit code (same reply whether or not the account exists) |
| POST | `/api/auth/reset-password` | `{ email, otp, password }` |
| GET | `/api/auth/me` | Current user, including `role` and effective `permissions` |
| GET | `/api/tasks` | `view=all\|assigned\|created\|overdue\|team` (`team` needs *View all team tasks*), `search`, `status`, `priority`, `dueFrom`, `dueTo`, `sort`, `page`, `limit` |
| POST | `/api/tasks` | `{ title, description?, dueDate?, priority?, status?, recurrence?, assignedTo? }` |
| GET / PATCH / DELETE | `/api/tasks/:id` | Permissions as in the matrix above. PATCH returns `nextOccurrence` when a recurring task is completed |
| GET | `/api/users` | Team members (id, name, email, role) |
| POST | `/api/users` | *Manage users*: `{ name, email, password, role }` |
| PATCH / DELETE | `/api/users/:id` | *Manage users*: edit `{ name?, email?, role?, password? }`, or remove a member |
| PATCH | `/api/users/:id/role` | *Manage users*: `{ role: "admin" \| "manager" \| "user" }` (only admins can grant admin) |
| PATCH | `/api/users/me` | `{ name }`. Rename yourself |
| PUT | `/api/users/me/password` | `{ currentPassword, newPassword }` |
| GET / PUT | `/api/users/me/preferences` | Notification preferences |
| GET | `/api/notifications` | Latest 20 plus the unread count. Also triggers the due-reminder sweep |
| PATCH | `/api/notifications/:id/read`, `/api/notifications/read-all` | Mark notifications as read |
| GET | `/api/dashboard` | Personal counts, recent and overdue tasks |
| GET | `/api/analytics?scope=me\|team` | Summary, breakdowns, 8-week trend, per-user stats (`team` needs *Team analytics*) |
| GET | `/api/audit-logs?task=&action=&page=` | Audit trail. Roles with *Full activity log* see everything; others see the tasks they're involved in |
| GET / PUT | `/api/settings/access` | Admin only: the role access matrix for managers and members |
| GET | `/api/chat/conversations` | Your chats with the other person's presence, last message and unread count, plus `unreadTotal`. Also marks incoming messages delivered and updates your *last seen* |
| POST | `/api/chat/conversations` | `{ userId }`. Opens (or creates) the one-to-one chat with a teammate |
| GET | `/api/chat/conversations/:id/messages` | Newest 40 messages; `?before=<iso>` for older pages, `?since=<iso>` for new or changed messages (polling). Includes read / delivered times |
| POST | `/api/chat/conversations/:id/messages` | `{ text }` (1–2000 characters) |
| POST | `/api/chat/conversations/:id/read` | Mark the chat as read |
| DELETE | `/api/chat/messages/:id` | Delete your own message for everyone |
| GET | `/api/health` | Liveness check and DB state |

---

## Approach and design decisions

- **Feature by feature, tested as I went.** The order was auth → shell and dashboard → task CRUD and search → advanced features. Every step was checked with API tests, then scripted browser runs (headless Edge) against the real database, including mobile widths.
- **Cookie-based JWT instead of `localStorage`.** It can't be read by injected scripts. `SameSite=Lax` plus the same-origin rewrite protects against CSRF.
- **RBAC in one place, configurable at runtime.** The task rules live in `utils/permissions.js` and the role access matrix in `services/accessService.js`. The matrix is stored as one `Setting` document and merged over the defaults, so a newly added permission gets a sensible value. Each request resolves the role's effective permissions, and `/api/auth/me` sends them to the UI, which uses `lib/permissions.ts` only to show or hide controls. Admins always have everything, and only admins can edit the matrix. A task a user can't see returns **404**, not 403, so task ids of other users aren't revealed.
- **Audit entries store a title snapshot and the people involved.** Logs stay readable after a task is deleted, and members still see entries for tasks they were part of, such as a task that was reassigned away from them.
- **Analytics need `completedAt`.** Completion time is recorded on the status change. The overdue trend asks "was this task past due and not yet completed at the end of week N?", so a task finished late still shows as overdue in the weeks before it was finished.
- **Offline writes are queued by the app, not the service worker.** The app knows which requests are safe to replay (task create, update, delete), shows them as pending, and replays them in order when the connection returns. Cached API data is cleared on logout so the next person on the device can't read it.
- **Chat receipts without extra writes per message.** Each conversation stores, per member, the time up to which they have *received* and *read* messages. Ticks are worked out by comparing a message's time with the other person's times, so reading a chat is one update, not one per message. Polling with `?since=` uses `updatedAt`, so deleted messages also reach the other side.
- **Reminders without a scheduler.** The "due in 1 hour" sweep runs at most once a minute, either from a timer (local server) or when a client polls notifications (serverless, where there is no always-on process). Each task is claimed with an atomic update before the reminder is sent, so overlapping sweeps never send twice.
- **Password reset can't be used to find accounts.** `forgot-password` gives the same answer for unknown emails. The code is stored hashed and stops working after 10 minutes or 5 wrong attempts.
- **Overdue and timezones.** A due date is stored as the end of the chosen local day, so "due today" only becomes overdue after local midnight.

## Assumptions and trade-offs

- **No WebSockets.** The backend runs as Vercel serverless functions, which can't keep WebSocket connections open. Socket.io would need a separate always-on server, so I chose polling instead: the bell checks every 30 s and on tab focus, and chat every 3 s (open conversation) or 10 s (elsewhere). Notifications can take up to about 30 s and chat messages a few seconds to appear. There is no typing indicator.
- **Chat is one-to-one.** There are no group chats or attachments yet.
- **Everyone is a teammate.** All users can see the member list and assign tasks to each other. There are no separate workspaces.
- **Email needs SMTP settings.** Preferences are saved either way, and the Settings page says when email isn't configured.
- **Analytics are computed in memory per request.** This is fine for a small team. A larger deployment would pre-aggregate them.
- **Offline conflicts use "last write wins".** If a queued change is rejected (for example, the task was deleted meanwhile), it is dropped and the user is told.
- **No refresh tokens.** Sessions last 7 days.

## How AI was used

This project was built with an AI coding assistant (Claude Code) in pair-programming style. I described each step and the requirements from the assignment, made the product and architecture decisions, and reviewed the results. Two decisions are examples: the permission matrix, and keeping notifications on polling so everything runs on Vercel. The assistant drafted the code, wrote and ran the Jest tests and the browser end-to-end scripts, and fixed what they caught. Examples: a 404 from prefetch requests on auth redirects, tasks without a due date sorting first, stack traces in 4xx responses, tiny chart labels on mobile, and Node failing TLS behind antivirus HTTPS inspection. I can walk through any part of the design in the interview.
