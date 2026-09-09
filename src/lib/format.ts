const CATEGORY_LABEL: Record<string, string> = {
  transformation: "Transformations",
  source: "Sources",
  sink: "Sinks",
  ingestion: "Ingestion",
  analytics: "Analytics",
  ai: "AI & ML",
  infrastructure: "Infrastructure",
  dbt: "dbt",   // brand — stays lowercase
  sensor: "Sensors",
  external: "External assets",
  observation: "Observations",
  check: "Asset checks",
  integration: "Integrations",
  resource: "Resources",
  io_manager: "I/O managers",
  jobs: "Jobs",
  decorator: "Decorators",
};

/**
 * Human-readable label for a category slug.
 *
 * Priority:
 *   1. Explicit label from CATEGORY_LABEL (respects brand casing like "dbt"
 *      and initialisms like "AI & ML").
 *   2. Fallback: replace underscores with spaces and capitalize the first
 *      letter. Keeps new/unknown categories readable without a code change.
 */
export function categoryLabel(cat: string): string {
  const explicit = CATEGORY_LABEL[cat];
  if (explicit) return explicit;
  const spaced = cat.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso + "T12:00:00Z").toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Accepts calendar dates or full ISO strings (e.g. verification checked_at). */
export function formatIsoDate(iso: string): string {
  try {
    const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
