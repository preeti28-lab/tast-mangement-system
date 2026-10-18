import type { ComponentType, SVGProps } from "react";
import {
  CheckCircleIcon,
  PencilIcon,
  PlusIcon,
  RepeatIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";
import type { Tone } from "@/components/ui/Surface";
import type { AuditAction } from "@/lib/api";

/** Label, icon and color for each audit action (activity log, profile timeline). */
export const ACTION_STYLE: Record<AuditAction, { label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; tone: Tone }> = {
  "task.created": { label: "Created", icon: PlusIcon, tone: "emerald" },
  "task.updated": { label: "Edited", icon: PencilIcon, tone: "sky" },
  "task.assigned": { label: "Assigned", icon: UserIcon, tone: "brand" },
  "task.status_changed": { label: "Status changed", icon: CheckCircleIcon, tone: "emerald" },
  "task.deleted": { label: "Deleted", icon: XIcon, tone: "red" },
  "task.recurred": { label: "Recurring", icon: RepeatIcon, tone: "violet" },
  "user.registered": { label: "Joined", icon: UsersIcon, tone: "brand" },
  "user.role_changed": { label: "Role changed", icon: SettingsIcon, tone: "amber" },
};
