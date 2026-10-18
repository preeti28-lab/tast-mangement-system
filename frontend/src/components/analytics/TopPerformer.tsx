"use client";

import TopPerformerCard from "@/components/dashboard/TopPerformerCard";
import { useUser } from "@/components/layout/UserContext";
import type { Analytics } from "@/lib/api";

/** Analytics view of the dashboard's top-performer spotlight: same card, fed from perUser. */
export default function TopPerformer({ perUser }: { perUser: Analytics["perUser"] }) {
  const { user } = useUser();
  // perUser is already ranked by completed tasks (then by assigned).
  const ranked = perUser.filter((row) => row.completed > 0).slice(0, 3);
  return <TopPerformerCard rows={ranked} currentUserId={user._id} showAnalyticsLink={false} />;
}
