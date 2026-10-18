import { AlertIcon, CheckIcon, ClockIcon, DoubleCheckIcon } from "@/components/icons";
import type { Tick } from "./chatFormat";

const LABELS: Record<Tick, string> = {
  pending: "Sending",
  failed: "Not sent",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
};

/** WhatsApp-style status: clock, ✓ sent, ✓✓ delivered, blue ✓✓ read. */
export default function Ticks({ tick }: { tick: Tick }) {
  const icon =
    tick === "pending" ? (
      <ClockIcon className="h-3.5 w-3.5 text-chat-meta" />
    ) : tick === "failed" ? (
      <AlertIcon className="h-4 w-4 text-red-500" />
    ) : tick === "sent" ? (
      <CheckIcon className="h-4 w-4 text-chat-meta" />
    ) : (
      <DoubleCheckIcon className={`h-4 w-4 ${tick === "read" ? "text-chat-read" : "text-chat-meta"}`} />
    );
  return (
    <span title={LABELS[tick]} className="inline-flex">
      {icon}
      <span className="sr-only">{LABELS[tick]}</span>
    </span>
  );
}
