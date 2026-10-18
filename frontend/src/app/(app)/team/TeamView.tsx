"use client";

import { useEffect, useState } from "react";
import FormAlert from "@/components/auth/FormAlert";
import { Spinner } from "@/components/layout/AppShell";
import { useUser } from "@/components/layout/UserContext";
import { selectClass } from "@/components/tasks/options";
import { useToast } from "@/components/ui/Toast";
import { userApi, type ApiError, type Role, type UserRef } from "@/lib/api";
import { formatDate, initials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";

type Member = UserRef & { role: Role; createdAt: string };

const ROLE_HELP: Record<Role, string> = {
  admin: "Full access, manages roles, deletes any task",
  manager: "Sees and edits every task, team analytics and activity",
  user: "Works on tasks they created or are assigned to",
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
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Team</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {members.length} member{members.length === 1 ? "" : "s"}.{" "}
          {isAdmin ? "As an admin you can change roles." : "Only admins can change roles."}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(ROLE_HELP) as Role[]).map((role) => (
          <div key={role} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <dt className="text-sm font-semibold text-zinc-900 dark:text-white">{ROLE_LABELS[role]}</dt>
            <dd className="mt-1 text-xs text-zinc-500">{ROLE_HELP[role]}</dd>
          </div>
        ))}
      </dl>

      <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {members.map((m) => {
          const isMe = m._id === user._id;
          return (
            <li key={m._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {initials(m.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {m.name} {isMe && <span className="text-xs font-normal text-zinc-500">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
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
                <span className="inline-flex w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {ROLE_LABELS[m.role]}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
