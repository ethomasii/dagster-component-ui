import type { CSSProperties } from "react";
import type { ManifestComponent } from "../types";
import { resolveVerification, type VerificationTone } from "../lib/verification";

function toneStyle(tone: VerificationTone): CSSProperties {
  switch (tone) {
    case "positive":
      return {
        background: "rgba(52, 211, 153, 0.14)",
        border: "1px solid rgba(52, 211, 153, 0.35)",
        color: "var(--success)",
      };
    case "negative":
      return {
        background: "rgba(248, 113, 113, 0.12)",
        border: "1px solid rgba(248, 113, 113, 0.35)",
        color: "var(--error)",
      };
    case "caution":
      return {
        background: "rgba(251, 191, 36, 0.12)",
        border: "1px solid rgba(251, 191, 36, 0.35)",
        color: "#d97706",
      };
    case "neutral":
    default:
      return {
        background: "var(--code-bg)",
        border: "1px solid var(--border)",
        color: "var(--text-dim)",
      };
  }
}

export function VerificationBadge({
  c,
  size = "md",
}: {
  c: ManifestComponent;
  size?: "sm" | "md";
}) {
  const v = resolveVerification(c);
  const { shortLabel, tone, label } = v;
  const pad = size === "sm" ? "2px 8px" : "3px 10px";
  const fontSize = size === "sm" ? 10 : 11;
  return (
    <span
      title={label}
      style={{
        display: "inline-block",
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        padding: pad,
        borderRadius: 6,
        ...toneStyle(tone),
      }}
    >
      {shortLabel}
    </span>
  );
}
