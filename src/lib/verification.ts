import type { ManifestComponent, VerificationStatus } from "../types";

export type VerificationTone = "neutral" | "positive" | "caution" | "negative";

export function resolveVerification(c: ManifestComponent): {
  status: VerificationStatus;
  label: string;
  shortLabel: string;
  tone: VerificationTone;
  checkedAt?: string;
  notes?: string;
} {
  const v = c.verification;
  const notes = v?.notes?.trim() || undefined;
  const checkedAt = v?.checked_at?.trim() || undefined;

  if (!v?.status) {
    return {
      status: "not_recorded",
      label:
        "This template is not marked as tested by the catalog. Treat it as community-maintained: validate in your project before production.",
      shortLabel: "Unverified",
      tone: "neutral",
      checkedAt,
      notes,
    };
  }

  switch (v.status) {
    case "ci_smoke":
      return {
        status: "ci_smoke",
        label: "A CI smoke test or automated check is recorded for this template.",
        shortLabel: "CI checked",
        tone: "positive",
        checkedAt,
        notes,
      };
    case "manual_spot_check":
      return {
        status: "manual_spot_check",
        label: "Someone manually spot-checked this template (see notes when present).",
        shortLabel: "Manual check",
        tone: "positive",
        checkedAt,
        notes,
      };
    case "community_reported_working":
      return {
        status: "community_reported_working",
        label: "Community feedback indicates this template worked in at least one real setup.",
        shortLabel: "Community OK",
        tone: "positive",
        checkedAt,
        notes,
      };
    case "known_issue":
      return {
        status: "known_issue",
        label: "A known problem is recorded—read notes and avoid for new work until fixed.",
        shortLabel: "Known issue",
        tone: "negative",
        checkedAt,
        notes,
      };
    case "not_recorded":
    default:
      return {
        status: "not_recorded",
        label:
          "Verification is explicitly marked as not recorded. Assume untested until you validate it.",
        shortLabel: "Unverified",
        tone: "neutral",
        checkedAt,
        notes,
      };
  }
}

export function countVerificationBreakdown(components: ManifestComponent[]): {
  total: number;
  withPositiveSignal: number;
  knownIssues: number;
  withAnyMetadata: number;
} {
  let withPositiveSignal = 0;
  let knownIssues = 0;
  let withAnyMetadata = 0;

  for (const c of components) {
    const s = c.verification?.status;
    if (s && s !== "not_recorded") withAnyMetadata += 1;
    if (s === "ci_smoke" || s === "manual_spot_check" || s === "community_reported_working") {
      withPositiveSignal += 1;
    }
    if (s === "known_issue") knownIssues += 1;
  }

  return {
    total: components.length,
    withPositiveSignal,
    knownIssues,
    withAnyMetadata,
  };
}

export function communityHelpfulCount(c: ManifestComponent): number {
  const n = c.community_signals?.helpful_count;
  if (typeof n !== "number" || n < 0) return 0;
  return Math.floor(n);
}
