const CATEGORY_LABEL: Record<string, string> = {
  transformation: "Transformations",
  source: "Sources",
  sink: "Sinks",
  ingestion: "Ingestion",
  analytics: "Analytics",
  ai: "AI & ML",
  infrastructure: "Infrastructure",
  dbt: "dbt",
  sensor: "Sensors",
  external: "External assets",
  observation: "Observations",
  check: "Asset checks",
  integration: "Integrations",
};

export function categoryLabel(cat: string): string {
  return CATEGORY_LABEL[cat] ?? cat.replace(/_/g, " ");
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
