"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import FormAlert from "@/components/auth/FormAlert";
import FormField from "@/components/auth/FormField";
import { ACTION_STYLE } from "@/components/activity/actionStyle";
import StatCard from "@/components/dashboard/StatCard";
import {
  ActivityIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  MailIcon,
  PencilIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/icons";
import { useUser } from "@/components/layout/UserContext";
import { Skeleton } from "@/components/ui/Loader";
import { PageHeader, SectionHeader, TONE_BADGE, cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/Surface";
import { useToast } from "@/components/ui/Toast";
import {
  analyticsApi,
  auditApi,
  dashboardApi,
  userApi,
  type Analytics,
  type ApiError,
  type AuditLog,
  type DashboardData,
  type FieldErrors,
} from "@/lib/api";
import { describeAudit, getUserDirectory, type UserDirectory } from "@/lib/audit";
import { formatDate, initials, timeAgo } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";

type Loaded = {
  dashboard: DashboardData;
  analytics: Analytics;
  activity: AuditLog[];
  users: UserDirectory;
};

const ROLE_ACCESS: Record<string, string> = {
  admin: "Full access: manage roles, every task and team analytics.",
  manager: "Team view: see and assign everyone's tasks and team analytics.",
  user: "Your work: tasks you created or that are assigned to you.",
};

async function loadProfile(userId: string): Promise<Loaded> {
  const [dashboard, analytics, audit, users] = await Promise.all([
    dashboardApi.get(),
    analyticsApi.get("me"),
    auditApi.list({ page: 1, limit: 100 }),
    getUserDirectory(),
  ]);
  return { dashboard, analytics, activity: audit.logs.filter((l) => l.actor?._id === userId).slice(0, 6), users };
}

// ---- pieces ------------------------------------------------------------------

/** Circular progress ring with the value in the middle. */
function Ring({ value, label, hint, color }: { value: number | null; label: string; hint: string; color: string }) {
  const pct = value ?? 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-4">
      <span className="relative grid h-20 w-20 shrink-0 place-items-center">
        <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-slate-200/80 dark:stroke-white/10" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - Math.min(100, pct) / 100)}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <span className="text-lg font-bold tabular-nums text-fg">{value === null ? "—" : `${pct}%`}</span>
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-fg">{label}</p>
        <p className="text-sm text-muted">{hint}</p>
      </div>
    </div>
  );
}

/** How strong a new password looks: 0–4 plus a label. */
function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return { score, label: ["Too short", "Weak", "Okay", "Good", "Strong"][score] };
}

const STRENGTH_COLORS = ["bg-red-500", "bg-orange-500", "bg-amber-400", "bg-lime-500", "bg-brand-500"];

function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = strength(password);
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score ? STRENGTH_COLORS[score] : "bg-slate-200 dark:bg-white/10"}`} />
        ))}
      </div>
      <p className="text-xs text-muted">
        Strength: <span className="font-semibold text-fg">{label}</span>
        {score < 3 && " · mix upper/lower case, numbers and a symbol"}
      </p>
    </div>
  );
}

function ReadOnlyField({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-line bg-hover/40 px-4 py-3 text-sm text-muted">
        <span className="shrink-0 text-slate-400">{icon}</span>
        <span className="min-w-0 truncate">{value}</span>
      </div>
    </div>
  );
}

// ---- cards -------------------------------------------------------------------

function EditProfileCard() {
  const { user, updateUser } = useUser();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== user.name;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError("");
    if (name.trim().length < 2) return setErrors({ name: "Name must be 2–50 characters" });
    setSaving(true);
    try {
      const res = await userApi.updateProfile({ name: name.trim() });
      updateUser(res.user);
      setName(res.user.name);
      toast("Profile updated");
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.errors ?? {});
      if (!apiErr.errors?.name) setFormError(apiErr.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="edit-profile" className={`scroll-mt-28 p-5 sm:p-6 ${cardClass}`}>
      <SectionHeader icon={PencilIcon} tone="sky" title="Personal details" subtitle="How your name appears on tasks and to the team." />
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        {formError && <FormAlert message={formError} />}
        <FormField label="Full name" name="name" value={name} maxLength={50} autoComplete="name" onChange={(e) => setName(e.target.value)} error={errors.name} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Email" value={user.email} icon={<MailIcon className="h-4 w-4" />} />
          <ReadOnlyField label="Role" value={ROLE_LABELS[user.role]} icon={<UserIcon className="h-4 w-4" />} />
        </div>
        <p className="text-xs text-muted">Email is your login and can&apos;t be changed here. Roles are managed by an admin on the Team page.</p>
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" disabled={!dirty || saving} onClick={() => setName(user.name)} className={secondaryButtonClass}>
            Reset
          </button>
          <button type="submit" disabled={!dirty || saving} className={primaryButtonClass}>
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            Save changes
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    const found: FieldErrors = {};
    if (!values.currentPassword) found.currentPassword = "Enter your current password";
    if (values.newPassword.length < 8) found.newPassword = "Password must be at least 8 characters";
    if (values.confirm !== values.newPassword) found.confirm = "Passwords don't match";
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await userApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      setValues({ currentPassword: "", newPassword: "", confirm: "" });
      toast("Password updated");
    } catch (err) {
      const apiErr = err as ApiError;
      setErrors(apiErr.errors ?? {});
      if (!Object.keys(apiErr.errors ?? {}).length) setFormError(apiErr.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`p-5 sm:p-6 ${cardClass}`}>
      <SectionHeader icon={SettingsIcon} tone="violet" title="Password" subtitle="Use at least 8 characters you don't use elsewhere." />
      <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
        {formError && <FormAlert message={formError} />}
        <FormField
          label="Current password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={set("currentPassword")}
          error={errors.currentPassword}
        />
        <FormField
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={values.newPassword}
          onChange={set("newPassword")}
          error={errors.newPassword}
        />
        <StrengthMeter password={values.newPassword} />
        <FormField
          label="Confirm new password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={values.confirm}
          onChange={set("confirm")}
          error={errors.confirm}
        />
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={saving} className={`w-full sm:w-auto ${primaryButtonClass}`}>
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            Update password
          </button>
        </div>
      </form>
    </section>
  );
}

function ActivityCard({ logs, users }: { logs: AuditLog[]; users: UserDirectory }) {
  const { user } = useUser();
  return (
    <section className={`flex flex-col p-5 sm:p-6 ${cardClass}`}>
      <SectionHeader
        icon={ActivityIcon}
        tone="emerald"
        title="Your recent activity"
        subtitle="The latest things you did in TaskFlow."
        action={
          <Link href="/activity" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
            View all <ArrowRightIcon className="h-4 w-4" />
          </Link>
        }
      />
      {logs.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-line px-5 py-10 text-center text-sm text-muted">
          Nothing yet. Create or update a task and it will show up here.
        </p>
      ) : (
        <ol className="relative mt-5 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[1.1rem] before:w-px before:bg-line">
          {logs.map((log) => {
            const style = ACTION_STYLE[log.action] ?? { label: log.action, icon: ActivityIcon, tone: "brand" as const };
            const Icon = style.icon;
            return (
              <li key={log._id} className="relative flex gap-3.5">
                <span className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full ring-4 ring-surface ${TONE_BADGE[style.tone]}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm text-fg">{describeAudit(log, users, user._id)}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {style.label} · {timeAgo(log.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// ---- page --------------------------------------------------------------------

export default function ProfileView() {
  const { user } = useUser();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadProfile(user._id)
      .then((d) => !cancelled && setData(d))
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [user._id]);

  const s = data?.analytics.summary;
  const stats = data?.dashboard.stats;

  return (
    <div className="w-full space-y-6">
      <PageHeader title="My profile" subtitle="Your account details, how your work is going, and your password." />

      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_top_left,#16a34a_0%,transparent_55%),linear-gradient(125deg,#15803d_0%,#065f46_45%,#0b3b4a_100%)] p-6 text-white shadow-[0_24px_48px_-24px_rgba(22,163,74,0.7)] sm:p-8">
        <span className="pointer-events-none absolute -top-24 -right-16 -z-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-28 left-1/3 -z-10 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" aria-hidden="true" />
        <span
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:linear-gradient(to_left,black,transparent_75%)]"
          aria-hidden="true"
        />

        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative w-fit">
            <span className="absolute -inset-1.5 rounded-[2rem] bg-gradient-to-br from-lime-300 via-emerald-300 to-sky-400 opacity-80 blur-[2px]" aria-hidden="true" />
            <span className="relative grid h-24 w-24 place-items-center rounded-[1.75rem] bg-gradient-to-br from-emerald-900 to-slate-900 text-3xl font-black tracking-tight shadow-xl sm:h-28 sm:w-28 sm:text-4xl">
              {initials(user.name)}
            </span>
            <span className="absolute -right-1 -bottom-1 grid h-8 w-8 place-items-center rounded-full bg-brand-500 ring-4 ring-emerald-900" title="Active">
              <CheckCircleIcon className="h-4 w-4" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25 backdrop-blur-md">
              <UserIcon className="h-3.5 w-3.5" />
              {ROLE_LABELS[user.role]}
            </span>
            <h3 className="mt-2.5 truncate text-3xl font-bold tracking-tight sm:text-4xl">{user.name}</h3>
            <p className="mt-1 flex items-center gap-2 truncate text-sm text-white/80 sm:text-base">
              <MailIcon className="h-4 w-4 shrink-0" />
              {user.email}
            </p>
            <p className="mt-3 max-w-xl text-sm text-white/75">{ROLE_ACCESS[user.role]}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <dl className="grid grid-cols-2 gap-3 md:w-64">
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-md">
                <dt className="text-[11px] font-medium tracking-wide text-white/70 uppercase">Member since</dt>
                <dd className="mt-1 text-sm font-semibold">{formatDate(user.createdAt)}</dd>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-md">
                <dt className="text-[11px] font-medium tracking-wide text-white/70 uppercase">Tasks done</dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums">{s ? s.completed : "…"}</dd>
              </div>
            </dl>
            <a
              href="#edit-profile"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              <PencilIcon className="h-4 w-4" />
              Edit profile
            </a>
          </div>
        </div>
      </section>

      {error && <FormAlert message={error} />}

      {/* Work stats */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats ? (
          <>
            <StatCard label="Assigned to me" value={stats.assignedToMe} href="/tasks?view=assigned" icon={UserIcon} tone="brand" />
            <StatCard label="Created by me" value={stats.createdByMe} href="/tasks?view=created" icon={PencilIcon} tone="sky" />
            <StatCard label="Completed" value={stats.completed} href="/tasks?status=completed" icon={CheckCircleIcon} tone="emerald" />
            <StatCard label="Overdue" value={stats.overdue} href="/tasks?view=overdue" icon={ClockIcon} tone="red" />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={`flex items-start gap-4 p-6 ${cardClass}`}>
              <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-3 pt-1">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Performance */}
      <section className={`p-5 sm:p-6 ${cardClass}`}>
        <SectionHeader icon={CheckCircleIcon} tone="emerald" title="Your performance" subtitle="Across tasks you created or are assigned to." />
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {s ? (
            <>
              <Ring value={s.completionRate} label="Completion rate" hint={`${s.completed} of ${s.total} tasks done`} color="#22c55e" />
              <Ring value={s.completed ? s.onTimeRate : null} label="On time" hint="Completed tasks that met their due date" color="#38bdf8" />
              <div className="flex items-center gap-4">
                <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-600 ring-[7px] ring-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/15">
                  <span className="text-lg font-bold tabular-nums">
                    {s.avgCompletionDays === null ? "—" : s.avgCompletionDays < 1 ? "<1d" : `${s.avgCompletionDays}d`}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-fg">Avg. time to finish</p>
                  <p className="text-sm text-muted">From creation to completion · {s.open} still open</p>
                </div>
              </div>
            </>
          ) : (
            Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <EditProfileCard />
        <PasswordCard />
      </div>

      {data ? (
        <ActivityCard logs={data.activity} users={data.users} />
      ) : (
        <div className={`space-y-4 p-6 ${cardClass}`}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
