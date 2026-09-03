import type { ManifestComponent } from "../types";

/** Distinct Simple Icons slugs — SaaS / data tools with a branded template. */
export function countDistinctBrandIntegrations(components: ManifestComponent[]): number {
  const brands = new Set<string>();
  for (const c of components) {
    const icon = c.icon?.trim();
    if (icon?.startsWith("si:")) {
      brands.add(icon.slice(3).toLowerCase());
    }
  }
  return brands.size;
}

/**
 * Rank components by "recency" — prefers explicit `first_added`, falls back
 * to `validation.last_validated`. Undated entries land last, alphabetized.
 *
 * The manifest is stored alphabetically by id, so the previous `.slice(-n)`
 * always returned the alphabetically-last entries (Yelp / YouTube / ...) —
 * this replaces that with an actual time-based sort.
 */
export function newestComponents(components: ManifestComponent[], n: number): ManifestComponent[] {
  if (n <= 0 || !components.length) return [];
  const dated: Array<{ c: ManifestComponent; ts: number }> = components.map((c) => {
    // Prefer a first_added field if a future manifest version adds it.
    // Fall back to validation.last_validated (present on ~half the catalog).
    const raw = c.first_added ?? c.validation?.last_validated ?? "";
    const parsed = raw ? Date.parse(raw) : NaN;
    return { c, ts: Number.isFinite(parsed) ? parsed : 0 };
  });
  dated.sort((a, b) => {
    if (b.ts !== a.ts) return b.ts - a.ts;
    // Tie-breaker: alphabetical by id for stable ordering
    return (a.c.id ?? "").localeCompare(b.c.id ?? "");
  });
  return dated.slice(0, n).map((x) => x.c);
}
