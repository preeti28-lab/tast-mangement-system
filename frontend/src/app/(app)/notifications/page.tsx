import type { Metadata } from "next";
import NotificationsView from "./NotificationsView";

export const metadata: Metadata = { title: "Notifications · NexTask" };

export default function NotificationsPage() {
  return <NotificationsView />;
}
