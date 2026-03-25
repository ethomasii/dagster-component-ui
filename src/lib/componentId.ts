import type { ManifestComponent } from "../types";

/**
 * Stable id for URLs and keys. Some manifest entries omit `id`; use the folder name from `path`
 * (e.g. `assets/ingestion/pubsub_to_database_asset` → `pubsub_to_database_asset`).
 */
export function componentId(c: Pick<ManifestComponent, "id" | "path">): string {
  const raw = typeof c.id === "string" ? c.id.trim() : "";
  if (raw) return raw;
  const seg = c.path?.replace(/\/+$/, "").split("/").pop()?.trim();
  return seg ?? "";
}
