import {
  COMMUNITY_CLI_EXAMPLES_INDEX_README_URL,
  COMMUNITY_CLI_EXAMPLES_RAW_BASE,
} from "../data/examplesCatalog";

/** Turn relative `*.md` links in examples/README.md into in-app `/examples/:slug` routes. */
export function rewriteExamplesIndexLinks(markdown: string): string {
  return markdown.replace(/\]\(([^)]+\.md)\)/gi, (_full, rawPath: string) => {
    const tail = rawPath.replace(/^\.\//, "").split("/").pop() ?? rawPath;
    if (tail.toLowerCase() === "readme.md") {
      return `](${rawPath})`;
    }
    const slug = tail.replace(/\.md$/i, "");
    return `](/examples/${encodeURIComponent(slug)})`;
  });
}

export async function fetchExamplesIndexReadme(): Promise<string> {
  const res = await fetch(COMMUNITY_CLI_EXAMPLES_INDEX_README_URL, { credentials: "omit" });
  if (!res.ok) throw new Error(`Could not load examples index (HTTP ${res.status})`);
  return res.text();
}

let examplesIndexReadmeCache: string | null = null;

/** Reuse one fetch for the examples index (palette + examples page). */
export async function fetchExamplesIndexReadmeCached(): Promise<string> {
  if (examplesIndexReadmeCache) return examplesIndexReadmeCache;
  const t = await fetchExamplesIndexReadme();
  examplesIndexReadmeCache = t;
  return t;
}

/**
 * Prefer `examples/<slug>/README.md` (folder layout), fall back to `examples/<slug>.md` (flat layout).
 */
export async function fetchExampleMarkdown(
  slug: string
): Promise<{ sourceUrl: string; text: string }> {
  // Strip a trailing `.md` so relative links inside walkthroughs like
  // `[foo](./bar.md)` — which land on `/examples/bar.md` — resolve to the
  // same source as clean `/examples/bar` URLs. Without this, the fetch
  // would try `<slug>.md/README.md` and `<slug>.md.md`, both of which 404.
  const cleaned = slug.replace(/\.md$/i, "");
  const enc = encodeURIComponent(cleaned);
  const candidates = [
    `${COMMUNITY_CLI_EXAMPLES_RAW_BASE}/${enc}/README.md`,
    `${COMMUNITY_CLI_EXAMPLES_RAW_BASE}/${enc}.md`,
  ];
  let lastStatus = 0;
  for (const url of candidates) {
    const res = await fetch(url, { credentials: "omit" });
    if (res.ok) return { sourceUrl: url, text: await res.text() };
    lastStatus = res.status;
  }
  throw new Error(lastStatus ? `Example not found (HTTP ${lastStatus})` : "Example not found");
}

export function markdownFirstH1(text: string): string | null {
  const m = text.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

/** Remove leading `# Title` block so detail page can render our own headline. */
export function stripMarkdownFirstH1(text: string): string {
  return text.replace(/^#\s+.+\r?\n+/, "").trimStart();
}

// ─────────────────────────── H1 title cache ────────────────────────────
// Per-slug cache of the walkthrough's H1. Used by the link-text rewriter
// so any `[<slug>](<slug>.md)` or `[<slug>.md](<slug>.md)` reference gets
// its display text replaced with the target page's real title.

const exampleTitleCache: Map<string, string | null> = new Map();
const exampleTitleInFlight: Map<string, Promise<string | null>> = new Map();

/**
 * Extract slugs referenced by markdown-link syntax `[text](<slug>.md)` in the
 * given markdown body. Filters out `README.md` (kept as an outbound reference)
 * and any slug with a `/` or `#` (subpaths / anchors — not walkthrough refs).
 */
export function extractLinkedExampleSlugs(markdown: string): string[] {
  const slugs = new Set<string>();
  const re = /\]\((?:\.?\/)?([a-z_][a-z0-9_]*)\.md(?:#[^\)]*)?\)/gi;
  for (const m of markdown.matchAll(re)) {
    const s = m[1];
    if (s.toLowerCase() !== "readme") slugs.add(s);
  }
  return [...slugs];
}

/**
 * Fetch the H1 title of a walkthrough, caching per slug. Returns null when
 * the walkthrough is missing or has no H1. Never throws — the caller uses
 * the cache to enrich display text and it's fine to leave it un-enriched.
 */
export async function fetchExampleTitle(slug: string): Promise<string | null> {
  const key = slug.replace(/\.md$/i, "");
  if (exampleTitleCache.has(key)) return exampleTitleCache.get(key) ?? null;
  const existing = exampleTitleInFlight.get(key);
  if (existing) return existing;
  const p = (async () => {
    try {
      const { text } = await fetchExampleMarkdown(key);
      const h1 = markdownFirstH1(text);
      exampleTitleCache.set(key, h1);
      return h1;
    } catch {
      exampleTitleCache.set(key, null);
      return null;
    } finally {
      exampleTitleInFlight.delete(key);
    }
  })();
  exampleTitleInFlight.set(key, p);
  return p;
}
