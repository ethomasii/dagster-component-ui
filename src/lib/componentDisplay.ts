import type { ComponentSchema, ManifestComponent } from "../types";
import { componentId } from "./componentId";

function titleFromSlug(slug: string): string {
  const s = slug.replace(/_/g, " ").trim();
  if (!s) return "Component";
  return s
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ")
    .trim();
}

/**
 * Human-readable title — manifest often omits `name` but includes `description` and `path`.
 */
export function componentDisplayName(
  c: ManifestComponent | null | undefined,
  schema?: ComponentSchema | null
): string {
  if (!c && !schema) return "Component";
  if (typeof c?.name === "string" && c.name.trim()) return c.name.trim();
  if (typeof schema?.name === "string" && schema.name.trim()) return schema.name.trim();
  const id = c ? componentId(c) : "";
  return titleFromSlug(id);
}
