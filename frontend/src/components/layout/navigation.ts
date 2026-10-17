import {
  BellIcon,
  ClockIcon,
  HomeIcon,
  InboxIcon,
  ListIcon,
  PencilIcon,
} from "@/components/icons";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/tasks", label: "All Tasks", icon: ListIcon },
  { href: "/tasks?view=assigned", label: "Assigned to Me", icon: InboxIcon },
  { href: "/tasks?view=created", label: "Created by Me", icon: PencilIcon },
  { href: "/tasks?view=overdue", label: "Overdue", icon: ClockIcon },
  { href: "/notifications", label: "Notifications", icon: BellIcon },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tasks": "Tasks",
  "/notifications": "Notifications",
};

export function getPageTitle(pathname: string) {
  const match = Object.keys(PAGE_TITLES).find(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  return match ? PAGE_TITLES[match] : "TaskFlow";
}
