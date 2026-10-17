import type { Metadata } from "next";
import DashboardView from "./DashboardView";

export const metadata: Metadata = { title: "Dashboard · TaskFlow" };

export default function DashboardPage() {
  return <DashboardView />;
}
