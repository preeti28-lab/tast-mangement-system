"use client";

import { useEffect, useState } from "react";
import FormAlert from "@/components/auth/FormAlert";
import { Spinner } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/Toast";
import { userApi, type ApiError, type NotificationPrefs } from "@/lib/api";

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`flex items-start justify-between gap-4 py-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <span>
        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-zinc-500">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}

export default function SettingsView() {
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

  if (error) return <FormAlert message={error} />;
  if (!prefs) return <Spinner />;

  const set = (channel: "inApp" | "email", key: "taskAssigned" | "taskUpdated", value: boolean) =>
    save({ [channel]: { [key]: value } } as Partial<NotificationPrefs>, {
      ...prefs,
      [channel]: { ...prefs[channel], [key]: value },
    });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h2>
        <p className="mt-1 text-sm text-zinc-500">Choose how and when TaskFlow notifies you.</p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white px-5 py-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <Toggle
          label="Mute all notifications"
          description="Pause every in-app and email notification. Your other choices are kept."
          checked={prefs.muteAll}
          onChange={(value) => save({ muteAll: value }, { ...prefs, muteAll: value })}
        />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white px-5 pb-2 pt-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="font-semibold text-zinc-900 dark:text-white">In-app alerts</h3>
        <p className="text-xs text-zinc-500">
          Shown in the bell, with a pop-up when a new one arrives.
        </p>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <Toggle
            label="A task is assigned to me"
            checked={prefs.inApp.taskAssigned}
            disabled={prefs.muteAll}
            onChange={(v) => set("inApp", "taskAssigned", v)}
          />
          <Toggle
            label="A task I'm on changes status"
            checked={prefs.inApp.taskUpdated}
            disabled={prefs.muteAll}
            onChange={(v) => set("inApp", "taskUpdated", v)}
          />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white px-5 pb-2 pt-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="font-semibold text-zinc-900 dark:text-white">Email</h3>
        <p className="text-xs text-zinc-500">
          {emailAvailable
            ? "Sent to your account email address."
            : "Email delivery isn't configured on this server yet. Your choice is saved and will apply once it is."}
        </p>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <Toggle
            label="A task is assigned to me"
            checked={prefs.email.taskAssigned}
            disabled={prefs.muteAll}
            onChange={(v) => set("email", "taskAssigned", v)}
          />
          <Toggle
            label="A task I'm on changes status"
            checked={prefs.email.taskUpdated}
            disabled={prefs.muteAll}
            onChange={(v) => set("email", "taskUpdated", v)}
          />
        </div>
      </section>
    </div>
  );
}
