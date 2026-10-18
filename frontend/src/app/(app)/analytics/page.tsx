import type { Metadata } from "next";
import AnalyticsView from "./AnalyticsView";

export const metadata: Metadata = { title: "Analytics · TaskFlow" };

export default function Page() {
  return <AnalyticsView />;
}
