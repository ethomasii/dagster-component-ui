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
