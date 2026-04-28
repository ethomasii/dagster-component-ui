import { ArrowDownToLine, ArrowDownUp, ArrowUpFromLine, SlidersHorizontal } from "lucide-react";
import type { FieldIoRole } from "../lib/schemaFieldIo";

const ROLE: Record<
  FieldIoRole,
  {
    Icon: typeof ArrowDownToLine;
    title: string;
    color: string;
  }
> = {
  in: {
    Icon: ArrowDownToLine,
    title: "Input / upstream — field relates to data or settings coming in",
    color: "var(--cyan)",
  },
  out: {
    Icon: ArrowUpFromLine,
    title: "Output / downstream — field relates to data or results going out",
    color: "var(--accent-bright)",
  },
  both: {
    Icon: ArrowDownUp,
    title: "Input and output — field ties together upstream and downstream",
    color: "var(--accent-bright)",
  },
  config: {
    Icon: SlidersHorizontal,
    title: "Configuration — wiring, credentials, or behavior (not a data port)",
    color: "var(--text-dim)",
  },
};

export function FieldIoIcon({
  role,
  size = 16,
  labeled = false,
}: {
  role: FieldIoRole;
  size?: number;
  /** If true, show a short text label next to the icon (for legends). */
  labeled?: boolean;
}) {
  const { Icon, title, color } = ROLE[role];
  const short =
    role === "in" ? "In" : role === "out" ? "Out" : role === "both" ? "In+Out" : "Config";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color,
        flexShrink: 0,
      }}
      title={title}
    >
      <Icon size={size} strokeWidth={2} aria-hidden />
      {labeled && (
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>{short}</span>
      )}
    </span>
  );
}
