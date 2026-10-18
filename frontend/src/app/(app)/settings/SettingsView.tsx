"use client";

import { useEffect, useState } from "react";
import FormAlert from "@/components/auth/FormAlert";
import { Spinner } from "@/components/layout/AppShell";
import { useThemePreference } from "@/components/layout/ThemeToggle";
import { useUser } from "@/components/layout/UserContext";
import { useToast } from "@/components/ui/Toast";
import { BellIcon, CheckCircleIcon, InboxIcon, MailIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon, UsersIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui/Loader";
import { PageHeader, SectionHeader, cardClass } from "@/components/ui/Surface";
import { settingsApi, userApi, type ApiError, type NotificationPrefs, type PermissionKey, type RoleAccess } from "@/lib/api";
import { formatDate, initials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import { setThemePreference, type ThemePreference } from "@/lib/theme";

/** 3D switch: recessed track, raised knob. */
function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "bg-gradient-to-b from-brand-600 to-brand-500 shadow-[inset_0_2px_4px_rgba(5,46,22,0.35)]"
          : "well-3d bg-slate-300! dark:bg-slate-700!"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-gradient-to-b from-white to-slate-100 shadow-[0_2px_4px_rgba(15,23,42,0.3),inset_0_-1px_0_rgba(15,23,42,0.08)] transition-all duration-200 ease-out ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

// Fixed colors: each preview shows the theme it stands for, whatever theme is active.
const PREVIEW = {
  light: { bg: "#f8fafc", side: "#ffffff", card: "#ffffff", line: "#e2e8f0", text: "#cbd5e1" },
  dark: { bg: "#0b1220", side: "#0f172a", card: "#151f2e", line: "#293548", text: "#334155" },
};

function MiniApp({ mode }: { mode: "light" | "dark" }) {
  const c = PREVIEW[mode];
  return (
    <div className="flex h-full w-full gap-1.5 p-2" style={{ background: c.bg }}>
      <div className="flex w-1/4 flex-col gap-1 rounded-md p-1.5" style={{ background: c.side, border: `1px solid ${c.line}` }}>
        <span className="h-1.5 w-3/4 rounded-full bg-brand-500" />
        <span className="h-1.5 w-full rounded-full" style={{ background: c.text }} />
        <span className="h-1.5 w-2/3 rounded-full" style={{ background: c.text }} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex gap-1.5">
          {[0, 1].map((i) => (
            <div key={i} className="h-7 flex-1 rounded-md shadow-sm" style={{ background: c.card, border: `1px solid ${c.line}` }}>
              <span className="m-1.5 block h-1.5 w-1/2 rounded-full" style={{ background: i ? c.text : "#22c55e" }} />
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-md shadow-sm" style={{ background: c.card, border: `1px solid ${c.line}` }}>
          <span className="m-1.5 block h-1.5 w-2/3 rounded-full" style={{ background: c.text }} />
          <span className="mx-1.5 block h-1.5 w-1/3 rounded-full" style={{ background: c.text }} />
        </div>
      </div>
    </div>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string; icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", hint: "Bright and clean", icon: SunIcon },
  { value: "dark", label: "Dark", hint: "Easy on the eyes", icon: MoonIcon },
  { value: "system", label: "System", hint: "Match your device", icon: MonitorIcon },
];

function AppearanceCard() {
  const preference = useThemePreference();

  return (
    <section className={`p-5 sm:p-6 ${cardClass}`}>
      <SectionHeader icon={SunIcon} tone="emerald" title="Appearance" subtitle="Pick how NexTask looks on this device." />
      <div role="radiogroup" aria-label="Theme" className="mt-5 grid gap-4 sm:grid-cols-3">
        {THEME_OPTIONS.map(({ value, label, hint, icon: Icon }) => {
          const selected = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setThemePreference(value)}
              className={`tilt-3d group rounded-2xl border-2 p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                selected
                  ? "border-brand-500 bg-brand-50/60 shadow-[0_12px_28px_-14px_rgba(22,163,74,0.55)] dark:bg-brand-500/10"
                  : "border-line bg-surface hover:border-brand-300 dark:hover:border-brand-700"
              }`}
            >
              <div className="relative h-24 overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/5">
                {value === "system" ? (
                  <>
                    <MiniApp mode="light" />
                    <div className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
                      <MiniApp mode="dark" />
                    </div>
                  </>
                ) : (
                  <MiniApp mode={value} />
                )}
              </div>
              <div className="flex items-center gap-2.5 px-2 pb-1 pt-3">
                <Icon className={`h-5 w-5 ${selected ? "text-brand-600 dark:text-brand-400" : "text-muted"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fg">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full border-2 transition ${
                    selected ? "border-brand-500 bg-brand-500" : "border-slate-300 dark:border-slate-600"
                  }`}
                  aria-hidden="true"
                >
                  {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ProfileCard() {
  const { user } = useUser();

  return (
    <section className="tilt-3d overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-900 p-6 text-white shadow-[0_24px_48px_-24px_rgba(22,163,74,0.7)] [transform-style:preserve-3d] sm:p-8">
      {/* Decorative depth layers */}
      <span className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden="true" />
      <span
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:linear-gradient(to_left,black,transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center [transform:translateZ(40px)]">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl sm:h-20 sm:w-20 bg-gradient-to-br from-white/30 to-white/5 text-2xl font-bold shadow-[0_14px_28px_-10px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-white/30 backdrop-blur-md">
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-100/80">Your account</p>
          <h3 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">{user.name}</h3>
          <p className="mt-0.5 truncate text-sm text-brand-50/90">{user.email}</p>
        </div>
        <dl className="grid shrink-0 grid-cols-2 gap-3 sm:w-64 md:w-72">
          <div className="rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur-md">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-brand-100/80">Role</dt>
            <dd className="mt-0.5 text-sm font-semibold">{ROLE_LABELS[user.role]}</dd>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur-md">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-brand-100/80">Member since</dt>
            <dd className="mt-0.5 text-sm font-semibold">{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

type EventKey = "taskAssigned" | "taskUpdated" | "dueReminder";

/** Admin-only matrix: which permission each role gets. Saves on every toggle. */
function RoleAccessCard() {
  const toast = useToast();
  const [data, setData] = useState<RoleAccess | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    settingsApi
      .getAccess()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  const toggle = async (role: "manager" | "user", key: PermissionKey, value: boolean) => {
    if (!data) return;
    const previous = data;
    setData({ ...data, access: { ...data.access, [role]: { ...data.access[role], [key]: value } } });
    setSaving(`${role}.${key}`);
    try {
      setData(await settingsApi.updateAccess({ [role]: { [key]: value } } as Partial<RoleAccess["access"]>));
      const label = data.permissions.find((p) => p.key === key)?.label ?? key;
      toast(`${ROLE_LABELS[role]}s: “${label}” ${value ? "on" : "off"}`);
    } catch (err) {
      setData(previous);
      toast((err as ApiError).message, "error");
    } finally {
      setSaving(null);
    }
  };

  const roles = ["manager", "user"] as const;
  const grid = "grid grid-cols-[minmax(0,1fr)_3.5rem_3.5rem_3.5rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5.5rem]";

  return (
    <section className={`p-5 sm:p-6 ${cardClass}`}>
      <SectionHeader
        icon={UsersIcon}
        tone="violet"
        title="Role access"
        subtitle="Choose what managers and members can do. Changes apply immediately, on every device."
      />
      {error ? (
        <div className="mt-5">
          <FormAlert message={error} />
        </div>
      ) : !data ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-line">
          <div className={`${grid} bg-hover/70 px-4 py-2.5 text-xs font-semibold tracking-wide text-muted uppercase`}>
            <span>Permission</span>
            <span className="text-center">Admin</span>
            {roles.map((r) => (
              <span key={r} className="text-center">
                {ROLE_LABELS[r]}
              </span>
            ))}
          </div>
          <ul className="divide-y divide-line">
            {data.permissions.map((p) => (
              <li key={p.key} className={`${grid} px-4 py-3.5 transition-colors hover:bg-hover/50`}>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-fg">{p.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{p.description}</span>
                </span>
                <span className="flex justify-center" title="Admins always have every permission">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400">
                    <CheckCircleIcon className="h-4 w-4" />
                  </span>
                </span>
                {roles.map((r) => (
                  <span key={r} className="flex justify-center">
                    <Switch
                      label={`${ROLE_LABELS[r]}: ${p.label}`}
                      checked={data.access[r][p.key]}
                      disabled={saving === `${r}.${p.key}`}
                      onChange={(v) => toggle(r, p.key, v)}
                    />
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 flex items-start gap-2 text-xs text-muted">
        <SettingsIcon className="mt-px h-4 w-4 shrink-0" />
        Admins always keep full access so nobody gets locked out. Everyone can still see, edit and delete tasks they created and
        update tasks assigned to them.
      </p>
    </section>
  );
}

const EVENTS: { key: EventKey; label: string; hint: string }[] = [
  { key: "taskAssigned", label: "A task is assigned to me", hint: "When someone puts you on a task" },
  { key: "taskUpdated", label: "A task I'm on changes status", hint: "To do, in progress, done" },
  { key: "dueReminder", label: "A task is due in 1 hour", hint: "A nudge to finish before the deadline" },
];

export default function SettingsView() {
  const { user } = useUser();
  const toast = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    userApi
      .getPreferences()
      .then((data) => {
        setPrefs(data.preferences);
        setEmailAvailable(data.emailAvailable);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const save = async (patch: Partial<NotificationPrefs>, optimistic: NotificationPrefs) => {
    const previous = prefs;
    setPrefs(optimistic);
    try {
      const data = await userApi.updatePreferences(patch);
      setPrefs(data.preferences);
      toast("Preferences saved");
    } catch (err) {
      setPrefs(previous);
      toast((err as ApiError).message, "error");
    }
  };

  const set = (channel: "inApp" | "email", key: EventKey, value: boolean) =>
    prefs &&
    save({ [channel]: { [key]: value } } as Partial<NotificationPrefs>, {
      ...prefs,
      [channel]: { ...prefs[channel], [key]: value },
    });

  return (
    <div className="w-full space-y-6">
      <PageHeader title="Settings" subtitle="Your account, how NexTask looks, and when it notifies you." />

      <ProfileCard />
      <AppearanceCard />
      {user.role === "admin" && <RoleAccessCard />}

      {error ? (
        <FormAlert message={error} />
      ) : !prefs ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className={`p-5 sm:p-6 ${cardClass}`}>
            <SectionHeader icon={BellIcon} title="Notifications" subtitle="Choose where each alert reaches you." />

            <div className="mt-5 overflow-hidden rounded-2xl border border-line">
              <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-2 bg-hover/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted sm:grid-cols-[minmax(0,1fr)_6rem_6rem]">
                <span>Event</span>
                <span className="flex items-center justify-center gap-1.5">
                  <InboxIcon className="h-4 w-4" /> <span className="hidden sm:inline">In-app</span>
                </span>
                <span className="flex items-center justify-center gap-1.5">
                  <MailIcon className="h-4 w-4" /> <span className="hidden sm:inline">Email</span>
                </span>
              </div>
              <ul className="divide-y divide-line">
                {EVENTS.map(({ key, label, hint }) => (
                  <li
                    key={key}
                    className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-2 px-4 py-4 transition-colors hover:bg-hover/50 sm:grid-cols-[minmax(0,1fr)_6rem_6rem]"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-fg">{label}</span>
                      <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                    </span>
                    <span className="flex justify-center">
                      <Switch
                        label={`In-app: ${label}`}
                        checked={prefs.inApp[key]}
                        disabled={prefs.muteAll}
                        onChange={(v) => set("inApp", key, v)}
                      />
                    </span>
                    <span className="flex justify-center">
                      <Switch
                        label={`Email: ${label}`}
                        checked={prefs.email[key]}
                        disabled={prefs.muteAll}
                        onChange={(v) => set("email", key, v)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs text-muted">
              <MailIcon className="mt-px h-4 w-4 shrink-0" />
              {emailAvailable
                ? "Emails go to your account address."
                : "Email delivery isn't configured on this server yet. Your choice is saved and will apply once it is."}
            </p>
          </section>

          <section
            className={`flex flex-col p-5 sm:p-6 ${cardClass} ${
              prefs.muteAll ? "ring-2 ring-amber-400/60 dark:ring-amber-400/40" : ""
            }`}
          >
            <SectionHeader icon={SettingsIcon} tone="amber" title="Do not disturb" subtitle="Silence everything at once." />
            <div
              className={`mt-5 flex flex-1 flex-col justify-between gap-5 rounded-2xl p-4 transition-colors ${
                prefs.muteAll ? "bg-amber-50 dark:bg-amber-400/10" : "well-3d"
              }`}
            >
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      prefs.muteAll ? "bg-amber-500" : "bg-brand-500 shadow-[0_0_0_3px_rgba(34,197,94,0.2)]"
                    }`}
                    aria-hidden="true"
                  />
                  {prefs.muteAll ? "Notifications paused" : "You're receiving notifications"}
                </p>
                <p className="mt-1.5 text-xs text-muted">
                  Pauses every in-app and email notification. Your other choices are kept for when you turn it off.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-fg">Mute all</span>
                <Switch
                  label="Mute all notifications"
                  checked={prefs.muteAll}
                  onChange={(value) => save({ muteAll: value }, { ...prefs, muteAll: value })}
                />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
