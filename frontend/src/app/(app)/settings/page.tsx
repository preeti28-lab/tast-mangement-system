import type { Metadata } from "next";
import SettingsView from "./SettingsView";

export const metadata: Metadata = { title: "Settings · NexTask" };

export default function Page() {
  return <SettingsView />;
}
