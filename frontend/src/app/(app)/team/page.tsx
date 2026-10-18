import type { Metadata } from "next";
import TeamView from "./TeamView";

export const metadata: Metadata = { title: "Team · TaskFlow" };

export default function Page() {
  return <TeamView />;
}
