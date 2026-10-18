import type { ComponentType, ReactElement, SVGProps } from "react";
import type { IconProps as PhosphorProps } from "@phosphor-icons/react";
import {
  ArrowCounterClockwise,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowsDownUp,
  ArrowsClockwise,
  Bell,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  DownloadSimple,
  ChartBar,
  CheckCircle,
  Clock,
  EnvelopeSimple,
  FileText,
  Funnel,
  GearSix,
  House,
  List,
  ListChecks,
  MagnifyingGlass,
  Monitor,
  Moon,
  PencilSimpleLine,
  Play,
  Plus,
  Pulse,
  SignOut,
  SquaresFour,
  Sun,
  Target,
  Trash,
  Tray,
  TrendDown,
  TrendUp,
  Trophy,
  UserCircle,
  UsersThree,
  X,
} from "@phosphor-icons/react/ssr";

// App-wide icon set: Phosphor icons in the duotone weight (a solid tinted layer
// under a crisp outline). The `ssr` build has no React context, so these work in
// both server and client components. Exports keep the old names and props, so
// call sites don't change; sizing still comes from className (default h-5 w-5).

type IconProps = SVGProps<SVGSVGElement>;
type Weight = PhosphorProps["weight"];

function make(Glyph: ComponentType<PhosphorProps>, weight: Weight = "duotone"): (props: IconProps) => ReactElement {
  function AppIcon({ strokeWidth, className = "h-5 w-5", ...props }: IconProps) {
    // Old icons were stroked; a heavy stroke request maps to the bold weight.
    const w = strokeWidth !== undefined && Number(strokeWidth) >= 2.2 ? "bold" : weight;
    return <Glyph weight={w} aria-hidden="true" className={`shrink-0 ${className}`} {...(props as PhosphorProps)} />;
  }
  AppIcon.displayName = `${Glyph.displayName ?? "Phosphor"}Icon`;
  return AppIcon;
}

export const HomeIcon = make(House);
export const ListIcon = make(ListChecks);
export const InboxIcon = make(Tray);
export const PencilIcon = make(PencilSimpleLine);
export const ClockIcon = make(Clock);
export const CheckCircleIcon = make(CheckCircle);
export const BellIcon = make(Bell);
export const MenuIcon = make(List, "bold");
export const XIcon = make(X, "bold");
export const LogoutIcon = make(SignOut);
export const ChartIcon = make(ChartBar);
export const ActivityIcon = make(Pulse);
export const UsersIcon = make(UsersThree);
export const SettingsIcon = make(GearSix);
export const RepeatIcon = make(ArrowsClockwise);
export const UserIcon = make(UserCircle);
export const DocumentIcon = make(FileText);
export const ArrowRightIcon = make(ArrowRight, "bold");
export const ChevronDownIcon = make(CaretDown, "bold");
export const MailIcon = make(EnvelopeSimple);
export const TrophyIcon = make(Trophy);
export const PlayIcon = make(Play);
export const RestartIcon = make(ArrowCounterClockwise);
export const PlusIcon = make(Plus, "bold");
export const FilterIcon = make(Funnel);
export const TrendingUpIcon = make(TrendUp, "bold");
export const TrendingDownIcon = make(TrendDown, "bold");
export const TargetIcon = make(Target);
export const GridIcon = make(SquaresFour);
export const SunIcon = make(Sun);
export const MoonIcon = make(Moon);
export const ArrowDownIcon = make(ArrowDown, "bold");
export const ArrowUpIcon = make(ArrowUp, "bold");
export const ChevronLeftIcon = make(CaretLeft, "bold");
export const ChevronRightIcon = make(CaretRight, "bold");
export const DownloadIcon = make(DownloadSimple);
export const SearchIcon = make(MagnifyingGlass);
export const SortIcon = make(ArrowsDownUp);
export const CalendarIcon = make(CalendarBlank);
export const TrashIcon = make(Trash);
export const MonitorIcon = make(Monitor);
