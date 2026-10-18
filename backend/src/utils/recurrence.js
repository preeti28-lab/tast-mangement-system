/**
 * Next due date for a recurring task. Monthly recurrence keeps the day of month,
 * clamped to the last day of shorter months (e.g. Jan 31 -> Feb 28).
 */
export function nextDueDate(from, recurrence) {
  const base = from ? new Date(from) : new Date();
  const next = new Date(base);
  switch (recurrence) {
    case "daily":
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
    case "weekly":
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    case "monthly": {
      const day = base.getUTCDate();
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + 1);
      const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
      next.setUTCDate(Math.min(day, lastDay));
      return next;
    }
    default:
      return null;
  }
}
