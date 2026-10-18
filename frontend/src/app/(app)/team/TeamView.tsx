"use client";

import { useEffect, useState } from "react";
import FormAlert from "@/components/auth/FormAlert";
import { Spinner } from "@/components/layout/AppShell";
import { useUser } from "@/components/layout/UserContext";
import { selectClass } from "@/components/tasks/options";
import { useToast } from "@/components/ui/Toast";
import { SettingsIcon, UserIcon, UsersIcon } from "@/components/icons";
import {
  IconBadge,
  PageHeader,
  SectionHeader,
  TONE_BADGE,
  cardClass,
  type Tone,
} from "@/components/ui/Surface";
import { userApi, type ApiError, type Role, type UserRef } from "@/lib/api";
import { formatDate, initials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";

type Member = UserRef & { role: Role; createdAt: string };

const ROLE_HELP: Record<Role, string> = {
  admin: "Full access, manages roles, deletes any task",
  manager: "Sees and edits every task, team analytics and activity",
  user: "Works on tasks they created or are assigned to",
};

const ROLE_STYLE: Record<Role, { icon: typeof UserIcon; tone: Tone }> = {
  admin: { icon: SettingsIcon, tone: "violet" },
  manager: { icon: UsersIcon, tone: "sky" },
  user: { icon: UserIcon, tone: "indigo" },
};

export default function TeamView() {
  const { user } = useUser();
  const toast = useToast();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const isAdmin = user.role === "admin";

  useEffect(() => {
    userApi
      .list()
      .then(({ users }) => setMembers(users))
      .catch((err: Error) => setError(err.message));
  }, []);

  const changeRole = async (member: Member, role: Role) => {
    setSavingId(member._id);
    try {
      const { user: updated } = await userApi.updateRole(member._id, role);
      setMembers((list) => list?.map((m) => (m._id === member._id ? { ...m, role: updated.role } : m)) ?? null);
      toast(`${member.name} is now ${ROLE_LABELS[updated.role]}`);
    } catch (err) {
      toast((err as ApiError).message, "error");
    } finally {
      setSavingId(null);
    }
  };

  if (error) return <FormAlert message={error} />;
  if (!members) return <Spinner />;

  return (
    <div className="w-full max-w-5xl space-y-6">
      <PageHeader
        title="Team"
        subtitle={`${members.length} member${members.length === 1 ? "" : "s"}. ${
          isAdmin ? "As an admin you can change roles." : "Only admins can change roles."
        }`}
      />

      <dl className="grid gap-5 sm:grid-cols-3">
        {(Object.keys(ROLE_HELP) as Role[]).map((role) => (
          <div key={role} className={`flex items-start gap-4 p-5 ${cardClass}`}>
            <IconBadge icon={ROLE_STYLE[role].icon} tone={ROLE_STYLE[role].tone} />
            <div className="min-w-0 pt-0.5">
              <dt className="font-bold text-zinc-900 dark:text-white">{ROLE_LABELS[role]}</dt>
              <dd className="mt-1 text-sm text-zinc-500">{ROLE_HELP[role]}</dd>
            </div>
          </div>
        ))}
      </dl>

      <section className={`p-5 sm:p-6 ${cardClass}`}>
        <SectionHeader icon={UsersIcon} title="Members" subtitle="Everyone who can be assigned tasks." />
        <ul className="mt-5 space-y-3">
          {members.map((m) => {
            const isMe = m._id === user._id;
            return (
              <li
                key={m._id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 px-4 py-3.5 sm:flex-row sm:items-center dark:border-zinc-800"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 text-sm font-semibold text-white">
                    {initials(m.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                      {m.name} {isMe && <span className="text-xs font-normal text-zinc-500">(you)</span>}
                    </p>
                    <p className="truncate text-sm text-zinc-500">
                      {m.email} · joined {formatDate(m.createdAt)}
                    </p>
                  </div>
                </div>
                {isAdmin && !isMe ? (
                  <select
                    aria-label={`Role for ${m.name}`}
                    value={m.role}
                    disabled={savingId === m._id}
                    onChange={(e) => changeRole(m, e.target.value as Role)}
                    className={`${selectClass} sm:w-40`}
                  >
                    {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`inline-flex w-fit items-center rounded-lg px-3 py-1.5 text-[13px] font-medium leading-none ${
                      TONE_BADGE[ROLE_STYLE[m.role].tone]
                    }`}
                  >
                    {ROLE_LABELS[m.role]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
