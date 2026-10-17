import type { Metadata } from "next";
import NotificationsView from "./NotificationsView";

export const metadata: Metadata = { title: "Notifications · TaskFlow" };

export default function NotificationsPage() {
  return <NotificationsView />;
}
