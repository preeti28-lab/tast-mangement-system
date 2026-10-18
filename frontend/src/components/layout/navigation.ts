import type { ComponentType, SVGProps } from "react";
import {
  ActivityIcon,
  BellIcon,
  ChartIcon,
  ClockIcon,
  HomeIcon,
  InboxIcon,
  ListIcon,
  PencilIcon,
  SettingsIcon,
  UsersIcon,
} from "@/components/icons";
import type { PermissionKey, User } from "@/lib/api";
import { can } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Hidden unless the role has this permission. */
  permission?: PermissionKey;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/tasks", label: "My Tasks", icon: ListIcon },
  { href: "/tasks?view=assigned", label: "Assigned to Me", icon: InboxIcon },
  { href: "/tasks?view=created", label: "Created by Me", icon: PencilIcon },
  { href: "/tasks?view=overdue", label: "Overdue", icon: ClockIcon },
  { href: "/tasks?view=team", label: "Team Tasks", icon: UsersIcon, permission: "tasks.viewAll" },
  { href: "/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/activity", label: "Activity Log", icon: ActivityIcon },
  { href: "/team", label: "Team", icon: UsersIcon },
  { href: "/notifications", label: "Notifications", icon: BellIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export const navItemsFor = (user: User) => NAV_ITEMS.filter((item) => !item.permission || can(user, item.permission));

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tasks": "Tasks",
  "/analytics": "Analytics",
  "/activity": "Activity Log",
  "/team": "Team",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/profile": "My profile",
};

export function getPageTitle(pathname: string) {
  const match = Object.keys(PAGE_TITLES).find(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  return match ? PAGE_TITLES[match] : "NexTask";
}
