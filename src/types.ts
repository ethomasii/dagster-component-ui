export interface ManifestDeps {
  pip?: string[];
}

/** Values allowed in manifest `verification.status`. */
export type ManifestVerificationStatus =
  | "not_recorded"
  | "ci_smoke"
  | "manual_spot_check"
  | "community_reported_working"
  | "known_issue";

/** Resolved trust status for UI (includes synthetic statuses from `validation.level`). */
export type VerificationStatus =
  | ManifestVerificationStatus
  | "validated_code"
  | "validated_infra"
  | "validated_live";

export interface ManifestVerification {
  status?: ManifestVerificationStatus;
  /** ISO-8601 date of last check or report */
  checked_at?: string;
  /** Maintainer or CI notes */
  notes?: string;
}

/** New-style manifest validation block (parallel to optional `verification`). */
export type ManifestValidationLevel = "code" | "infra" | "live";

export interface ManifestValidation {
  level: ManifestValidationLevel;
  /** ISO date or datetime of last validation */
  last_validated?: string;
  /** Alias some generators may emit */
  last_validated_at?: string;
}

/** Optional aggregated feedback (manual, synced, or future API). */
export interface ManifestCommunitySignals {
  /** e.g. GitHub 👍 or curated tally */
  helpful_count?: number;
}

export interface ManifestComponent {
  /** Omitted in some generated manifest rows; UI derives from `path` (see `componentId`). */
  id?: string;
  name?: string;
  category: string;
  description: string;
  version?: string;
  author?: string;
  path: string;
  tags: string[];
  dependencies?: ManifestDeps;
  readme_url?: string;
  component_url?: string;
  schema_url?: string;
  example_url?: string;
  requirements_url?: string;
  icon?: string;
  /** Primary vendor for grouping (see templates repo `vendors/` pages). */
  vendor?: string;
  vendors?: string[];
  verification?: ManifestVerification;
  /** Catalog validation tier + evidence (preferred when `verification.status` is absent). */
  validation?: ManifestValidation;
  community_signals?: ManifestCommunitySignals;
  /** Freeform keyword list for search + discovery. */
  keywords?: string[];
  /** What this component produces (e.g. ["asset"], ["job"], ["sensor"], multi-asset shapes). */
  produces?: string[];
  /** Structured hints for AI catalog agents (output_type, requires_pip, requires_resources...). */
  agent_hints?: Record<string, unknown>;
  /** ISO date when this component first entered the catalog (opt-in, not backfilled). */
  first_added?: string;
  /** Curated "always surface this one" flag — bumps the component in the Home spotlight
   *  above heuristic tiebreakers. Reserved for ~20-30 flagship components per registry. */
  featured?: boolean;
}

export interface Manifest {
  version: string;
  repository: string;
  last_updated: string;
  /** Optional authoritative count from manifest generator; fallback is `components.length`. */
  total?: number;
  components: ManifestComponent[];
}

export interface SchemaAttributeField {
  type: string;
  label?: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];
  items?: { type?: string };
  "ui:widget"?: string;
}

export interface SchemaIoPort {
  type?: string;
  required?: boolean;
  description?: string;
}

export interface ComponentSchema {
  component_type?: string;
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  tags?: string[];
  "x-dagster-io"?: {
    inputs?: SchemaIoPort;
    outputs?: SchemaIoPort;
  };
  "x-dagster-provides"?: string[];
  attributes?: Record<string, SchemaAttributeField>;
}

export interface SchemaSpec {
  version?: string;
  title?: string;
  connectors?: {
    byCategory?: Record<
      string,
      { left?: boolean; right?: boolean; note?: string }
    >;
  };
  componentRegistry?: {
    totalComponents?: number;
    folders?: Record<string, { category?: string; count?: number }>;
  };
}
