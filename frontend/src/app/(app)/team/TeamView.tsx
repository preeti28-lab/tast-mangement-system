"use client";

import { useEffect, useState } from "react";
import FormAlert from "@/components/auth/FormAlert";
import { useUser } from "@/components/layout/UserContext";
import { selectClass } from "@/components/tasks/options";
import { useToast } from "@/components/ui/Toast";
import FlipCard3D from "@/components/ui/FlipCard3D";
import { SettingsIcon, UserIcon, UsersIcon } from "@/components/icons";
import {
  IconBadge,
  PageHeader,
  SectionHeader,
  TONE_BADGE,
  cardClass,
  cardFlatClass,
  type Tone,
} from "@/components/ui/Surface";
import { userApi, type ApiError, type Role, type UserRef } from "@/lib/api";
import { formatDate, initials } from "@/lib/format";
import { ROLE_LABELS, isStaff } from "@/lib/permissions";
import TeamInsights from "@/components/team/TeamInsights";
import Avatar from "@/components/ui/Avatar";
import { tileInteractiveClass } from "@/components/ui/Tile";
import { TableSkeleton } from "@/components/ui/Loader";

type Member = UserRef & { role: Role; createdAt: string };

const ROLE_HELP: Record<Role, string> = {
  admin: "Full access, manages roles, deletes any task",
  manager: "Sees and edits every task, team analytics and activity",
  user: "Works on tasks they created or are assigned to",
};

const ROLE_STYLE: Record<Role, { icon: typeof UserIcon; tone: Tone; back: string }> = {
  admin: { icon: SettingsIcon, tone: "violet", back: "from-violet-500 to-fuchsia-600 shadow-violet-500/30" },
  manager: { icon: UsersIcon, tone: "sky", back: "from-sky-500 to-blue-600 shadow-sky-500/30" },
  user: { icon: UserIcon, tone: "brand", back: "from-brand-500 to-emerald-700 shadow-brand-500/30" },
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
  if (!members) return <TableSkeleton />;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Team"
        subtitle={`${members.length} member${members.length === 1 ? "" : "s"}. ${
          isAdmin ? "As an admin you can change roles." : "Only admins can change roles."
        }`}
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(ROLE_HELP) as Role[]).map((role) => {
          const inRole = members.filter((m) => m.role === role);
          return (
            <FlipCard3D
              key={role}
              direction="vertical"
              focusable
              height={176}
              frontClassName={`flex flex-col justify-between p-5 ${cardFlatClass}`}
              backClassName={`flex flex-col justify-between bg-gradient-to-br p-5 text-white shadow-xl ring-1 ring-white/20 ${ROLE_STYLE[role].back}`}
              front={
                <>
                  <div className="flex items-start gap-4">
                    <IconBadge icon={ROLE_STYLE[role].icon} tone={ROLE_STYLE[role].tone} />
                    <div className="min-w-0 pt-0.5">
                      <h3 className="font-bold text-fg">{ROLE_LABELS[role]}</h3>
                      <p className="mt-1 text-3xl font-bold leading-none tabular-nums text-fg">
                        {inRole.length}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-400">
                    member{inRole.length === 1 ? "" : "s"} &middot; hover or tap to see access
                  </p>
                </>
              }
              back={
                <>
                  <div>
                    <p className="text-xs font-bold tracking-[0.14em] text-white/70 uppercase">{ROLE_LABELS[role]} access</p>
                    <p className="mt-1.5 text-sm leading-snug text-white/95">{ROLE_HELP[role]}</p>
                  </div>
                  {inRole.length > 0 ? (
                    <div className="flex items-center">
                      {inRole.slice(0, 5).map((m) => (
                        <span
                          key={m._id}
                          title={m.name}
                          className="-ml-2 grid h-8 w-8 place-items-center rounded-full bg-white/25 text-[11px] font-semibold text-white ring-2 ring-white/40 backdrop-blur-sm first:ml-0"
                        >
                          {initials(m.name)}
                        </span>
                      ))}
                      {inRole.length > 5 && (
                        <span className="ml-2 text-xs font-semibold text-white/80">+{inRole.length - 5} more</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-white/75">No one has this role yet.</p>
                  )}
                </>
              }
            />
          );
        })}
      </div>

      {isStaff(user) && <TeamInsights />}

      <section className={`p-5 sm:p-6 ${cardClass}`}>
        <SectionHeader icon={UsersIcon} title="Members" subtitle="Everyone who can be assigned tasks." />
        <ul className="mt-5 grid gap-3 xl:grid-cols-2">
          {members.map((m) => {
            const isMe = m._id === user._id;
            return (
              <li
                key={m._id}
                className={`flex min-w-0 flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center ${tileInteractiveClass}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <Avatar name={m.name} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">
                      {m.name} {isMe && <span className="text-xs font-normal text-muted">(you)</span>}
                    </p>
                    <p className="truncate text-sm text-muted">
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
                    className={`${selectClass} w-full sm:w-40`}
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
