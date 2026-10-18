import type { Metadata } from "next";
import ProfileView from "./ProfileView";

export const metadata: Metadata = { title: "My profile · TaskFlow" };

export default function Page() {
  return <ProfileView />;
}
