/** Search helpers for the CLI `examples/README.md` (markdown). */

/**
 * Backwards-compatible single-alternative word list.
 * Prefer `queryAlternatives` for OR search.
 */
export function queryWords(q: string): string[] {
  return q.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Split a query into OR alternatives. Comma separates alternatives; whitespace
 * within an alternative is AND-ed. So `temporal,vercel` returns
 * `[["temporal"], ["vercel"]]` and matches EITHER — great for showing off
 * multiple vendors in one shareable link.
 */
export function queryAlternatives(q: string): string[][] {
  return q
    .split(",")
    .map((alt) => alt.trim().toLowerCase().split(/\s+/).filter(Boolean))
    .filter((alt) => alt.length > 0);
}

export function haystackMatches(haystack: string, q: string): boolean {
  const alts = queryAlternatives(q);
  if (!alts.length) return true;
  const h = haystack.toLowerCase();
  return alts.some((words) => words.every((w) => h.includes(w)));
}

/** Rough plain text for full-document search. */
export function markdownToSearchPlain(md: string): string {
  let t = md;
  t = t.replace(/```[\s\S]*?```/g, " ");
  t = t.replace(/`([^`]+)`/g, "$1");
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  t = t.replace(/^#{1,6}\s+/gm, " ");
  t = t.replace(/[*_~>#|]/g, " ");
  t = t.replace(/\s+/g, " ");
  return t.trim();
}

export type ExampleLinkHit = { slug: string; title: string };

/** Count distinct example pages linked from `examples/README.md` (`[title](*.md)` rows, excluding README self-links). */
export function countExampleIndexEntries(markdown: string): number {
  const slugs = new Set<string>();
  const linkRe = /\[([^\]]*)\]\(([^)]+\.md)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(markdown)) !== null) {
    const rawPath = m[2];
    const tail = rawPath.replace(/^\.\//, "").split("/").pop() ?? rawPath;
    if (tail.toLowerCase() === "readme.md") continue;
    const slug = tail.replace(/\.md$/i, "").trim();
    if (slug) slugs.add(slug);
  }
  return slugs.size;
}

/** Entries that map to in-app `/examples/:slug` routes (from `[text](path.md)` links). */
export function findExampleLinkHits(markdown: string, q: string): ExampleLinkHit[] {
  const alts = queryAlternatives(q);
  if (!alts.length) return [];
  const hits: ExampleLinkHit[] = [];
  const seen = new Set<string>();
  const linkRe = /\[([^\]]*)\]\(([^)]+\.md)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(markdown)) !== null) {
    const title = m[1].trim();
    const rawPath = m[2];
    const tail = rawPath.replace(/^\.\//, "").split("/").pop() ?? rawPath;
    if (tail.toLowerCase() === "readme.md") continue;
    const slug = tail.replace(/\.md$/i, "");
    const hay = `${title} ${slug} ${rawPath}`.toLowerCase();
    if (!alts.some((words) => words.every((w) => hay.includes(w)))) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    hits.push({ slug, title: title || slug });
  }
  return hits;
}

export function examplesReadmeBodyMatches(markdown: string, q: string): boolean {
  const alts = queryAlternatives(q);
  if (!alts.length) return false;
  const plain = markdownToSearchPlain(markdown);
  return alts.some((words) => words.every((w) => plain.includes(w)));
}

/**
 * Keep markdown chunks that start at a line `## …` boundary (plus any preamble before the first `##`).
 * Drops sections that do not contain any query alternative's AND-set.
 */
export function filterExamplesReadmeByQuery(markdown: string, q: string): string {
  const alts = queryAlternatives(q);
  if (!alts.length) return markdown;
  const match = (chunk: string) => {
    const c = chunk.toLowerCase();
    return alts.some((words) => words.every((w) => c.includes(w)));
  };
  const parts = markdown.split(/(?=\n## )/);
  const kept = parts.filter((p) => match(p));
  return kept.join("").trim();
}
