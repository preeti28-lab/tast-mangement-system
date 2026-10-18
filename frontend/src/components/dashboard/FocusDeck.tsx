"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PlayIcon, RestartIcon, XIcon } from "@/components/icons";
import { SectionHeader, cardClass } from "@/components/ui/Surface";
import { useToast } from "@/components/ui/Toast";
import { ApiError, OfflineQueuedError, taskApi, type Task, type TaskPriority } from "@/lib/api";
import { formatDue, isOverdue } from "@/lib/format";
import { emitTasksChanged } from "@/lib/taskEvents";

const LEAVE_MS = 350;

const PRIORITY_CARD: Record<TaskPriority, { emoji: string; label: string; bg: string }> = {
  high: { emoji: "🔥", label: "High priority", bg: "from-rose-400 to-red-500 dark:from-rose-600 dark:to-red-700" },
  medium: { emoji: "⚡", label: "Medium priority", bg: "from-amber-400 to-orange-500 dark:from-amber-600 dark:to-orange-700" },
  low: { emoji: "🌱", label: "Low priority", bg: "from-emerald-400 to-teal-500 dark:from-emerald-600 dark:to-teal-700" },
};

type Decision = "start" | "skip";

/**
 * Focus deck: your "To do" tasks as a stack of cards, soonest due first.
 * Start moves the top task to In progress (a real update); Skip sets it aside
 * for now without changing it. Arrow keys work too (← skip, → start).
 */
export default function FocusDeck({ currentUserId }: { currentUserId: string }) {
  const toast = useToast();
  const [deck, setDeck] = useState<Task[] | null>(null);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState<{ id: string; dir: Decision } | null>(null);
  const [decisions, setDecisions] = useState<{ id: string; dir: Decision }[]>([]);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancelled = false;
    taskApi
      .list({ view: "assigned", status: "todo", sort: "due_asc", limit: 10 })
      .then(({ tasks }) => {
        if (cancelled) return;
        setDeck(tasks);
        setDecisions([]);
        setError("");
      })
      .catch((err: ApiError) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [round]);

  const decide = useCallback(
    (dir: Decision) => {
      if (!deck?.length || leaving) return;
      const top = deck[0];
      setLeaving({ id: top._id, dir });

      if (dir === "start") {
        taskApi
          .update(top._id, { status: "in_progress" })
          .then(() => {
            toast(`Started "${top.title}"`);
            emitTasksChanged(); // refresh dashboard counts
          })
          .catch((err: ApiError) =>
            toast(
              err instanceof OfflineQueuedError ? `"${top.title}" will start when you're back online` : err.message,
              err instanceof OfflineQueuedError ? "success" : "error"
            )
          );
      }

      setTimeout(() => {
        setDeck((cards) => cards?.slice(1) ?? null);
        setDecisions((all) => [...all, { id: top._id, dir }]);
        setLeaving(null);
      }, LEAVE_MS);
    },
    [deck, leaving, toast]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") decide("start");
    if (e.key === "ArrowLeft") decide("skip");
  };

  const started = decisions.filter((d) => d.dir === "start").length;
  const skipped = decisions.length - started;

  return (
    <section className={`flex h-full flex-col p-5 sm:p-6 ${cardClass}`}>
      <SectionHeader
        icon={PlayIcon}
        tone="emerald"
        title="Focus deck"
        subtitle="Start or skip your to-dos, soonest due first."
      />

      <div
        className="mt-6 flex flex-1 flex-col items-center justify-center gap-5 outline-none"
        role="region"
        aria-roledescription="carousel"
        aria-label="To-do tasks deck"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <div className="relative h-64 w-60 max-w-full">
          {error ? (
            <p className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-300 px-4 text-center text-sm text-muted dark:border-slate-700">
              {error}
            </p>
          ) : !deck ? (
            <div className="h-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ) : deck.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 text-center dark:border-slate-700">
              <span className="text-4xl" aria-hidden="true">
                {decisions.length ? "🎉" : "✅"}
              </span>
              <p className="text-sm font-semibold text-fg">
                {decisions.length ? "Deck done!" : "Nothing to do right now"}
              </p>
              <p className="text-xs tabular-nums text-muted">
                {decisions.length
                  ? `${started} started · ${skipped} skipped`
                  : "Tasks assigned to you will show up here."}
              </p>
              {decisions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRound((r) => r + 1)}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:bg-hover dark:border-slate-700 dark:text-fg"
                >
                  <RestartIcon className="h-3.5 w-3.5" /> Start over
                </button>
              )}
            </div>
          ) : (
            deck.slice(0, 4).map((task, index) => {
              const isTop = index === 0;
              const isLeaving = leaving?.id === task._id;
              const style = PRIORITY_CARD[task.priority];
              const overdue = isOverdue(task);
              const from =
                task.createdBy._id === currentUserId ? "Created by you" : `From ${task.createdBy.name}`;
              return (
                <div
                  key={task._id}
                  aria-hidden={!isTop}
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br px-5 text-center text-white shadow-xl shadow-slate-300/50 ring-1 ring-black/5 transition-all ease-out motion-reduce:transition-none dark:shadow-black/50 dark:ring-white/10 ${style.bg} ${
                    isTop ? "shadow-2xl ring-2 ring-white/50 dark:ring-white/20" : ""
                  }`}
                  style={{
                    zIndex: 10 - index,
                    transform: isLeaving
                      ? `translateX(${leaving.dir === "start" ? 130 : -130}%) rotate(${leaving.dir === "start" ? 18 : -18}deg)`
                      : `translateY(${index * 12}px) scale(${1 - index * 0.06})`,
                    opacity: isLeaving || index > 2 ? 0 : 1,
                    transitionDuration: `${LEAVE_MS}ms`,
                  }}
                >
                  <span className="text-[44px] leading-none" aria-hidden="true">
                    {style.emoji}
                  </span>
                  <p className="line-clamp-2 text-[15px] font-bold tracking-tight drop-shadow-sm">{task.title}</p>
                  <p className="text-xs text-white/90">
                    {style.label} · {task.dueDate ? `${overdue ? "Overdue" : "Due"} ${formatDue(task.dueDate)}` : "No due date"}
                  </p>
                  <p className="text-[11px] text-white/75">{from}</p>
                  {isTop && (
                    <Link
                      href={`/tasks?task=${task._id}`}
                      className="mt-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold backdrop-blur-sm transition hover:bg-white/30"
                    >
                      Details
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>

        {deck && deck.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => decide("skip")}
              aria-label="Skip this task for now"
              title="Skip for now (←)"
              className="grid h-12 w-12 place-items-center rounded-full border-2 border-slate-200 bg-surface text-slate-500 shadow-md transition-all duration-150 hover:scale-110 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:border-slate-700 dark:text-slate-300"
            >
              <XIcon className="h-5 w-5" />
            </button>
            <span className="min-w-14 text-center text-xs font-semibold tabular-nums text-slate-400">
              {deck.length} left
            </span>
            <button
              type="button"
              onClick={() => decide("start")}
              aria-label="Start this task"
              title="Start now (→)"
              className="grid h-12 w-12 place-items-center rounded-full border-2 border-emerald-200 bg-surface text-emerald-600 shadow-md transition-all duration-150 hover:scale-110 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 dark:border-emerald-400/30 dark:text-emerald-400 dark:hover:bg-emerald-400/10"
            >
              <PlayIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
