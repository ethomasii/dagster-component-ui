import type { Manifest, SchemaSpec } from "../types";

/**
 * Canonical catalog: always published on the templates repo (main branch).
 * Use the raw URL — `/blob/` pages are HTML and cannot be parsed as JSON.
 */
const MANIFEST_REMOTE =
  typeof import.meta.env.VITE_MANIFEST_URL === "string" && import.meta.env.VITE_MANIFEST_URL.trim()
    ? import.meta.env.VITE_MANIFEST_URL.trim()
    : "https://raw.githubusercontent.com/eric-thomas-dagster/dagster-component-templates/main/manifest.json";

const MANIFEST_FALLBACK = "/manifest.json";

/** Schema spec for field widgets + I/O semantics — same repo as the manifest. */
const SCHEMA_SPEC_REMOTE =
  typeof import.meta.env.VITE_SCHEMA_SPEC_URL === "string" &&
  import.meta.env.VITE_SCHEMA_SPEC_URL.trim()
    ? import.meta.env.VITE_SCHEMA_SPEC_URL.trim()
    : "https://raw.githubusercontent.com/eric-thomas-dagster/dagster-component-templates/main/schema-spec.json";

const SCHEMA_SPEC_FALLBACK = "/schema-spec.json";

async function fetchJsonWithFallback<T>(
  urls: readonly string[],
  resourceLabel: string
): Promise<T> {
  /** Cross-origin manifests are often CDN-cached; unique URL avoids stale counts/dates after GitHub publish. */
  function withCacheBust(url: string): string {
    if (!url.startsWith("http")) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}_=${Date.now()}`;
  }

  const unique = [...new Set(urls)].map(withCacheBust);
  let lastStatus: number | undefined;
  let lastErr: unknown;
  for (const url of unique) {
    try {
      const res = await fetch(url, { cache: "no-store", credentials: "omit" });
      if (!res.ok) {
        lastStatus = res.status;
        continue;
      }
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
    }
  }
  const suffix =
    typeof lastStatus === "number"
      ? ` (last HTTP ${lastStatus})`
      : lastErr instanceof Error
        ? `: ${lastErr.message}`
        : "";
  throw new Error(`Failed to load ${resourceLabel}${suffix}`);
}

export async function loadManifest(): Promise<Manifest> {
  return fetchJsonWithFallback<Manifest>(
    [MANIFEST_REMOTE, MANIFEST_FALLBACK],
    "manifest"
  );
}

export async function loadSchemaSpec(): Promise<SchemaSpec> {
  return fetchJsonWithFallback<SchemaSpec>(
    [SCHEMA_SPEC_REMOTE, SCHEMA_SPEC_FALLBACK],
    "schema specification"
  );
}
