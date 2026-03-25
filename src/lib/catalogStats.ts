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

/** Treat tail of manifest as “newest” entries (common append order). */
export function newestComponents(components: ManifestComponent[], n: number): ManifestComponent[] {
  if (n <= 0 || !components.length) return [];
  return components.slice(-Math.min(n, components.length));
}
