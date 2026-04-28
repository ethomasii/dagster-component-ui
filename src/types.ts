export interface ManifestDeps {
  pip?: string[];
}

/** Set in manifest when the templates repo or CI records trust signals (optional). */
export type VerificationStatus =
  | "not_recorded"
  | "ci_smoke"
  | "manual_spot_check"
  | "community_reported_working"
  | "known_issue";

export interface ManifestVerification {
  status?: VerificationStatus;
  /** ISO-8601 date of last check or report */
  checked_at?: string;
  /** Maintainer or CI notes */
  notes?: string;
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
  verification?: ManifestVerification;
  community_signals?: ManifestCommunitySignals;
}

export interface Manifest {
  version: string;
  repository: string;
  last_updated: string;
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
