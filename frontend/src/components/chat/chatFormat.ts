import type { ChatUser } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/permissions";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysAgo = (d: Date) => Math.round((startOfDay(new Date()) - startOfDay(d)) / 864e5);

/** "5:02 PM" */
export const clockTime = (value: string) =>
  new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** Chat list stamp: time today, "Yesterday", weekday this week, else a short date. */
export function listStamp(value: string) {
  const d = new Date(value);
  const ago = daysAgo(d);
  if (ago === 0) return clockTime(value);
  if (ago === 1) return "Yesterday";
  if (ago < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" });
}

/** Date chip between message groups: "Today", "Yesterday", "Monday", "12 Oct 2026". */
export function dayLabel(value: string) {
  const d = new Date(value);
  const ago = daysAgo(d);
  if (ago === 0) return "Today";
  if (ago === 1) return "Yesterday";
  if (ago < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export const sameDay = (a: string, b: string) => startOfDay(new Date(a)) === startOfDay(new Date(b));

/** Header subtitle: "online", "last seen today at 5:02 PM", or the role. */
export function presenceText(user: ChatUser) {
  if (user.online) return "online";
  if (!user.lastSeenAt) return ROLE_LABELS[user.role];
  const ago = daysAgo(new Date(user.lastSeenAt));
  const time = clockTime(user.lastSeenAt);
  if (ago === 0) return `last seen today at ${time}`;
  if (ago === 1) return `last seen yesterday at ${time}`;
  return `last seen ${new Date(user.lastSeenAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

export type Tick = "pending" | "failed" | "sent" | "delivered" | "read";

/** Status of one of my messages from the other person's read / delivered times. */
export function tickFor(createdAt: string, otherLastReadAt: string | null, otherLastDeliveredAt: string | null): Tick {
  const t = new Date(createdAt).getTime();
  if (otherLastReadAt && new Date(otherLastReadAt).getTime() >= t) return "read";
  if (otherLastDeliveredAt && new Date(otherLastDeliveredAt).getTime() >= t) return "delivered";
  return "sent";
}
