# NexTask – Task Management System

NexTask is a task management app for small teams. You can create tasks, assign them to teammates, track what is due or overdue, chat with your team, and see how the work is going in dashboards and analytics. Admins decide what managers and members are allowed to do. It works on phones, tablets and desktops, in light and dark mode, and keeps working offline.

Built for the *Software Developer Take-Home Assignment*. It covers **every core requirement** and **seven of the eight optional advanced tasks**. The one left out is WebSocket-based real-time notifications; see [trade-offs](#assumptions-and-trade-offs).

| | |
|---|---|
| **Live app** | https://taskflow-nu-lake.vercel.app |
| **REST API** | https://taskflow-backend-bay.vercel.app (health check: [`/api/health`](https://taskflow-backend-bay.vercel.app/api/health)) |
| **Stack** | Next.js 16 · React 19 · Tailwind CSS v4 · Node.js · Express 5 · MongoDB (Mongoose) · Jest |
| **Tests** | 82 backend tests (Jest + Supertest, in-memory MongoDB) |

## Contents

- [Features at a glance](#features-at-a-glance)
- [Features in detail](#features-in-detail)
  - [1. Accounts and sign-in](#1-accounts-and-sign-in)
  - [2. Roles and permissions](#2-roles-and-permissions)
  - [3. Dashboard](#3-dashboard)
  - [4. Tasks](#4-tasks)
  - [5. Recurring tasks](#5-recurring-tasks)
  - [6. Notifications and reminders](#6-notifications-and-reminders)
  - [7. Chat](#7-chat)
  - [8. Analytics](#8-analytics)
  - [9. Team management](#9-team-management)
  - [10. Activity log](#10-activity-log)
  - [11. Profile](#11-profile)
  - [12. Settings](#12-settings)
  - [13. Offline support (PWA)](#13-offline-support-pwa)
  - [14. Design and responsiveness](#14-design-and-responsiveness)
  - [15. Security](#15-security)
- [Assignment checklist](#assignment-checklist)
- [Architecture](#architecture) · [Running locally](#running-locally) · [Deployment](#deployment) · [API reference](#api-reference) · [Design decisions](#approach-and-design-decisions) · [Trade-offs](#assumptions-and-trade-offs)

---

## Features at a glance

| Area | What you get |
|---|---|
| **Sign-in** | Register, log in, separate admin and manager login pages, forgot password with an emailed OTP |
| **Roles** | Admin, Manager, Member, with permissions the admin can switch on and off |
| **Tasks** | Create, edit, delete, assign, search, filter, sort, paginate, export to CSV, task history |
| **Recurring tasks** | Daily, weekly or monthly; the next one is created automatically on completion |
| **Dashboard** | KPI tiles, activity chart, status and priority breakdown, upcoming deadlines, focus deck, top performer |
| **Notifications** | Bell with pop-ups, "due in 1 hour" reminders, optional email, per-type preferences, mute all |
| **Chat** | WhatsApp-style one-to-one chat with ticks, online / last seen, unread badges, pop-ups and desktop alerts |
| **Analytics** | Completion and on-time rates, trends, funnel, cohorts, week-over-week, per-member stats, insights |
| **Team** | Add, edit and remove members, change roles, workload map, searchable team report |
| **Activity log** | Every change recorded with *from → to* values, filterable |
| **Offline** | Installable PWA; read cached data offline, task changes sync when you're back online |
| **Design** | Responsive layout, light / dark / system theme, glass UI with 3D touches |

---

## Features in detail

### 1. Accounts and sign-in

- **Register** with name, email and password (at least 8 characters). The **first account becomes the Admin**, so a fresh install can be managed right away.
- **Log in** at `/login`. Admins and managers also have their own login pages, **`/admin/login`** and **`/manager/login`**, which only let that role in (anyone else is told to use the regular login).
- **Forgot password** in two steps: enter your email, then the **6-digit OTP** that arrives by email plus a new password.
  - The code is valid for 10 minutes and allows 5 wrong attempts.
  - A new code can be requested after 1 minute.
  - The page gives the same answer whether or not the email is registered, so it can't be used to find accounts.
  - Without SMTP, the code is printed in the backend console during development.
- **Sessions** use a JWT in an `httpOnly` cookie and last 7 days. A stale or invalid session is cleared automatically and sends you back to the login page.
- **Log out** from the sidebar or the user menu. A short sign-out screen confirms it, and cached data and queued offline changes are cleared, so the next person on the device can't see them.

### 2. Roles and permissions

There are three roles: **Admin**, **Manager** and **Member**. Admins always have every permission, so nobody can lock the admin out. What managers and members may do is set by the admin on **Settings → Role access**, using a switch for each permission and role. Changes apply immediately on every device. The defaults are:

| Permission | Member | Manager | Admin |
|---|:-:|:-:|:-:|
| View all team tasks | – | ✅ | ✅ |
| Edit any task | – | ✅ | ✅ |
| Delete any task | – | – | ✅ |
| Assign tasks to others | ✅ | ✅ | ✅ |
| Team analytics | – | ✅ | ✅ |
| Full activity log | – | ✅ | ✅ |
| Manage users (never admins) | – | – | ✅ |

- Whatever the settings say, everyone can **see, edit and delete tasks they created**, and **see and change the status of tasks assigned to them**.
- Only admins can change role access, edit admin accounts, or make someone an admin.
- Nobody can change their own role or delete their own account, and the last admin can't be deleted.
- The API checks permissions on every request. The UI also hides buttons, pages and menu items you can't use.
- A task you aren't allowed to see returns *not found*, so other people's task ids aren't revealed.
- Roles can also be changed from the command line: `npm run set-role -- someone@example.com manager`.

### 3. Dashboard

- **Greeting header** with today's date, how many tasks are due in the next 7 days and how many are in progress, and a **New task** button. It sits over an animated 3D wireframe terrain.
- **Six KPI tiles:** *Total tasks* (with % completed), *Assigned to me*, *Created by me*, *In progress*, *Overdue* and *Completed* (with a change vs. last week). Some tiles have a sparkline or a progress meter. Each tile opens the matching filtered task list.
- **My activity:** a chart of tasks created vs. completed per week over the last 8 weeks.
- **Task breakdown:** a donut chart by status, and bars by priority.
- **Upcoming deadlines:** tasks due in the next 7 days, soonest first, with priority and "due in N days".
- **Focus deck:** your *To do* tasks as a stack of cards, soonest due first.
  - **Start** moves the top task to *In progress*; **Skip** sets it aside for now.
  - The arrow keys work too (← skip, → start), and **Start over** brings back skipped cards.
- **Top performer:** the team member with the most completed tasks, shown on a podium with a crown, plus a leaderboard.
- The dashboard refreshes by itself when a new notification arrives.

### 4. Tasks

**Each task has:** title (up to 120 characters), description (up to 2000), due date and time, priority (*Low*, *Medium*, *High*), status (*To do*, *In progress*, *Completed*), repeat setting, assignee and creator. Fields are validated on both the client and the server.

- **Create and edit** in a form dialog. *Assign to* lists your teammates; without the *Assign tasks to others* permission you can only leave a task unassigned or assign it to yourself.
- **Task details** dialog with every field and the task's full **History** (who changed what, and when).
- **Change status** right from the list with a status dropdown.
- **Delete** with a confirmation dialog.
- **Views** (tabs and sidebar shortcuts): *All*, *Assigned to me*, *Created by me*, *Overdue*, and *Team tasks* (with *View all team tasks*).
- **Search** by title or description.
- **Filter** by status, by priority, and by due date. The due-date filter has presets (*Today*, *Tomorrow*, *This week*, *Next 7 days*, *This month*, *Before today*) and a custom from–to range.
- **Sort** by newest, oldest, due date (soonest or latest), or recently updated.
- **Pagination** with a choice of rows per page. Filters, sort and page are **kept in the URL**, so a filtered list can be bookmarked or shared.
- **Export to CSV:** all time, today, last 7 or 30 days, this month, last month, or a custom range, by created date or due date.
- **Layout:** a table on large screens and cards on phones and tablets. Overdue tasks are highlighted, and completed tasks are shown struck through.
- Opening a link like `/tasks?task=<id>` (for example from a notification) opens that task directly.

### 5. Recurring tasks

- A task can repeat **daily**, **weekly** or **monthly**.
- When it is marked *Completed*, the **next occurrence is created automatically**, with the same details and the due date moved forward.
- Monthly repeats stay within the month: Jan 31 → Feb 28 (or 29).
- Completing the same task again (after reopening it) never creates a duplicate.
- Every automatic repeat is recorded in the activity log.

### 6. Notifications and reminders

- **You are notified when:**
  - someone **assigns you a task**;
  - a task you created or are assigned to **changes status**;
  - a task is **due in 1 hour** (sent once to the assignee, or to the creator if nobody is assigned, and again if the due date is moved).
- **Bell** in the navbar with an unread count and the latest notifications. Click one to open its task, or mark everything as read.
- **Pop-ups** appear for new notifications on any page, and open task lists and dashboards refresh.
- **Notifications page:** every notification in a searchable table, filterable by type and read status, with *Mark read* and *Mark all read*.
- **Email** for each event is optional (needs SMTP on the server).
- **Preferences:** in-app and email alerts can be switched on or off separately for each event type, or everything silenced with **Mute all**.
- New notifications are checked every 30 seconds, and immediately when you come back to the tab.

### 7. Chat

A WhatsApp-style chat for one-to-one messages between anyone in the organization.

- **Layout:**
  - On desktop, the chat list is on the left and the open conversation on the right.
  - On phones, one pane shows at a time, with a back button.
  - The open chat is kept in the URL (`/chat?c=<id>`).
- **Chat list:**
  - Each chat shows the person's avatar with a green **online** dot, the last message, its time ("5:02 PM", "Yesterday", a weekday or a date) and an unread count.
  - Your own last message shows its ticks.
  - Chats can be searched.
- **New chat:** the **+** button opens a searchable list of your teammates. The **Message** button on the *Team* page also opens a chat with that member.
- **Conversation:**
  - Green bubbles for your messages and white for theirs, with bubble tails, grouped by sender, on WhatsApp's beige wallpaper (dark green and grey in dark mode).
  - Date chips ("Today", "Yesterday", "Monday", "12 October 2026"), and a note that the messages are private between the two of you.
  - Older messages load as you scroll up.
  - When new messages arrive while you've scrolled up, a **↓ button** shows how many.
- **Message status:** 🕓 sending, ✓ sent, ✓✓ delivered, **blue ✓✓ read**.
- **Presence:** *online*, or *last seen today at 5:02 PM* / *yesterday at …* / a date.
- **Writing messages:**
  - The message box grows with the text. On desktop, **Enter** sends and **Shift + Enter** adds a new line; on phones, Enter adds a new line.
  - Messages are limited to 2000 characters, with a counter near the limit.
  - A message that fails to send can be **retried** or removed.
- **Message menu:** **Copy** any message, and **Delete for everyone** for your own (it becomes "🚫 This message was deleted" on both sides).
- **Notifications:**
  - an **unread badge** on *Chat* in the sidebar and on the chat icon in the navbar;
  - a **pop-up** with the sender and message on any page (click it to open the chat);
  - a **desktop notification** when the tab is in the background, after you turn it on with the button in the chat list.
  - Pop-ups and desktop alerts are off when *Mute all* is on.
- **Privacy:** only the two people in a chat can read or post in it. When a member is removed, their chats are deleted.
- **No sockets:** chat uses plain REST requests. The open chat checks for new messages every **3 seconds** and the rest of the app every **10 seconds**.

### 8. Analytics

- **Team / Just me** switch for roles with *Team analytics*; everyone else sees their own numbers.
- **KPI tiles:**
  - **Completion rate** and **Completed on time**, each with a meter;
  - **Completed per week**, with the average days from creation to done;
  - **Overdue now**, with the number of open tasks.
  - The last two show a sparkline and the change vs. last week.
- **Insights strip:** short, automatic observations, such as "7 tasks overdue", "4 fewer done than last week", "18 in progress, waiting to finish" or "28% high priority".
- **Throughput chart:** tasks created vs. completed per week (last 8 weeks), with a *View data table* option.
- **Overdue trend:** how many tasks were overdue at the end of each week.
- **Status mix** (donut) and a **priority** breakdown.
- **Week-over-week comparison** of this week against last week.
- **Task funnel:** created → started → completed → completed on time.
- **Completion cohorts:** for tasks created in each of the last 6 weeks, the share completed by each following week.
- **Top performer** card and leaderboard (team view).
- **Completed tasks per user:** a searchable table with assigned, completed, on time, overdue and completion rate for each person.

### 9. Team management

- **Role cards** for Admin, Manager and Member with the number of people in each. Hover or tap a card to flip it and see what that role can do, with the members' avatars.
- **Members list** with name, email, join date and role.
  - With *Manage users* you can change roles from a dropdown, **add members** (name, email, password, role), **edit** them (including resetting their password) and **remove** them.
  - Removing a member unassigns their tasks and moves the tasks they created to you.
- **Message** button on every member to start a chat.
- **Team workload map** (with *Team analytics*): a treemap of who has the most open work, a list of the busiest members, and each person's assigned, completed, overdue and on-time numbers.
- **Team report** (with *Team analytics*): a searchable table per member, with role filter, sorting, pagination and **CSV export**.

### 10. Activity log

- Records every task **create**, **edit** (each changed field with its *from → to* value), **assignment**, **status change**, **delete** and **automatic repeat**, plus **registrations**, **members added, edited or removed**, **role changes** and **role access changes**.
- Shown as a table: who did it, what happened, and when ("30 minutes ago" plus the exact time). Each entry has an **Open task** link.
- Search across all columns, filter by **action type** and by **person**, paginate, and **export to CSV**.
- Members see the entries for tasks they're involved in; roles with *Full activity log* see everything.
- Entries stay readable after a task is deleted, because they keep a copy of its title.
- Each task's own history is also shown in its details dialog.

### 11. Profile

- **Profile card:** avatar, role, name, email, a short description of what your role can do, member-since date, tasks done, and an *Edit profile* button.
- **Stats:** *Assigned to me*, *Created by me*, *Completed* and *Overdue*, each linking to the matching task list.
- **Your performance:** completion rate, on-time rate and average days to finish, shown as rings.
- **Personal details:** change your name. Email and role are shown read-only; roles are managed by an admin.
- **Password:** change it with your current password, a new one and a confirmation (with show / hide).
- **Your recent activity:** the latest things you did.

### 12. Settings

- **Account card** with your name, email, role and member-since date.
- **Appearance:** *Light*, *Dark* or *System* theme, with a preview of each. The navbar also has a quick theme toggle.
- **Notifications:** in-app and email switches for *assigned*, *status changed* and *due in 1 hour*. If the server has no SMTP, a note says so; your choice is saved and applies once email is set up.
- **Do not disturb:** *Mute all* silences everything at once and greys out the other switches.
- **Role access** (admins only): the permission switches described in [Roles and permissions](#2-roles-and-permissions).

### 13. Offline support (PWA)

- **Installable** as an app on phones and desktops, with a manifest, app icons and a maskable icon.
- A **service worker** caches the app shell and static files, pages, and API responses (always trying the network first). Dashboards, task lists and other pages can still be **read offline**, and an offline page is shown when nothing is cached.
- **Task changes made offline are queued.** Creates, edits, status changes and deletes are saved locally, shown with a **pending count** in an **offline banner**, and **synced automatically, in order,** when the connection returns.
- If a queued change is rejected (for example, the task was deleted meanwhile), it is dropped and you are told.

### 14. Design and responsiveness

- **Responsive** from small phones to wide desktops:
  - a slide-out sidebar on phones;
  - card views instead of tables on small screens;
  - two KPI tiles per row on phones;
  - a navbar that adapts its controls.
- **Light, dark and system themes**, with no flash of the wrong theme on load.
- **Glass UI:** frosted cards over soft colour blobs, a floating pill navbar, 3D buttons and switches, and cards that tilt toward the pointer.
- **3D visuals:**
  - a wireframe terrain on the dashboard and a neon grid on analytics;
  - a hologram projector on the login pages and the 404 page;
  - flip cards on the team page and a pop-out portrait for the top performer.
- **Branded loaders and skeletons** while data loads, toasts for confirmations and errors, and a custom 404 page.
- **Accessibility:**
  - keyboard focus rings;
  - labels for icon-only buttons;
  - `aria-live` regions for pop-ups;
  - respect for *reduced motion*;
  - text alternatives for chart data.

### 15. Security

- Passwords are hashed with **bcrypt** (10 rounds; older 12-round hashes are upgraded on the next login).
- The session JWT lives in an **`httpOnly`, `SameSite=Lax` cookie** (`Secure` in production), so scripts on the page can't read it.
- The API is served **from the same origin** through a Next.js rewrite, so the cookie is first-party and there is no CORS in the browser.
- **Permission checks on every request.** Hidden tasks return *not found*, and admins can't be edited by non-admins.
- **Password-reset codes** are stored hashed, expire, limit attempts, and don't reveal whether an email exists.
- **Security headers:** `X-Content-Type-Options`, `X-Frame-Options: DENY` and `Referrer-Policy`.
- **Error handling:** validation errors come back field by field, and stack traces are never sent in production.
- **On logout,** cached API data and queued offline changes are cleared.

---

## Assignment checklist

| Requirement | Status | Where |
|---|:-:|---|
| Authentication | ✅ | [Accounts and sign-in](#1-accounts-and-sign-in) |
| Task CRUD | ✅ | [Tasks](#4-tasks) |
| Team collaboration (assign + notify) | ✅ | [Tasks](#4-tasks), [Notifications](#6-notifications-and-reminders) |
| Dashboard | ✅ | [Dashboard](#3-dashboard) |
| Search and filter | ✅ | [Tasks](#4-tasks) |
| *Advanced:* RBAC | ✅ | [Roles and permissions](#2-roles-and-permissions) |
| *Advanced:* Recurring tasks | ✅ | [Recurring tasks](#5-recurring-tasks) |
| *Advanced:* Audit logging | ✅ | [Activity log](#10-activity-log) |
| *Advanced:* Offline support | ✅ | [Offline support](#13-offline-support-pwa) |
| *Advanced:* Unit and integration tests | ✅ | [Tests](#tests) |
| *Advanced:* Analytics dashboard | ✅ | [Analytics](#8-analytics) |
| *Advanced:* Customizable notifications | ✅ | [Notifications](#6-notifications-and-reminders), [Settings](#12-settings) |
| *Advanced:* Real-time notifications with WebSockets | – | Polling instead; see [trade-offs](#assumptions-and-trade-offs) |
| *Extra:* Team chat | ✅ | [Chat](#7-chat) |

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
