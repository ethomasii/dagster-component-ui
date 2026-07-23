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
 * Filter the examples README by query, operating at the TABLE-ROW level.
 *
 * The README is mostly markdown tables (~300 rows across ~15 sections). The old
 * behavior filtered whole H2 sections — one match brought back a whole 30-row
 * table. New behavior keeps only matching rows within each table, drops empty
 * tables entirely, and drops empty sections entirely. Section headings +
 * pre-table preamble stay so results have context.
 *
 * A row is kept if the row text matches ANY query alternative (comma-separated
 * OR), where within an alternative all words must appear (AND).
 */
export function filterExamplesReadmeByQuery(markdown: string, q: string): string {
  const alts = queryAlternatives(q);
  if (!alts.length) return markdown;
  const match = (text: string) => {
    const t = text.toLowerCase();
    return alts.some((words) => words.every((w) => t.includes(w)));
  };

  const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
  const isTableSeparator = (line: string) => /^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(line);
  const isHeading = (line: string) => /^#{1,6}\s+/.test(line);

  const sections = markdown.split(/(?=^#{1,3}\s+)/m);
  const outSections: string[] = [];

  for (const section of sections) {
    const lines = section.split("\n");
    const heading = isHeading(lines[0] ?? "") ? lines[0] : null;
    const body = heading ? lines.slice(1) : lines;

    const kept: string[] = [];
    let hasNonHeadingContent = false;
    let i = 0;
    while (i < body.length) {
      const line = body[i] ?? "";
      // Detect a table: header row followed by separator row
      if (isTableRow(line) && isTableRow(body[i + 1] ?? "") && isTableSeparator(body[i + 1] ?? "")) {
        const header = line;
        const separator = body[i + 1];
        const rows: string[] = [];
        let j = i + 2;
        while (j < body.length && isTableRow(body[j] ?? "")) {
          rows.push(body[j]);
          j++;
        }
        const keptRows = rows.filter((r) => match(r));
        if (keptRows.length > 0) {
          kept.push(header, separator, ...keptRows);
          hasNonHeadingContent = true;
        }
        i = j;
        continue;
      }
      // Non-table line — keep if it matches the query, or if it's whitespace between kept content
      const stripped = line.trim();
      if (stripped === "") {
        // Trailing whitespace after kept content only
        if (kept.length > 0 && kept[kept.length - 1] !== "") kept.push("");
      } else if (isHeading(line)) {
        // Sub-heading within the section — keep and let subsequent content decide
        kept.push(line);
      } else if (match(line)) {
        kept.push(line);
        hasNonHeadingContent = true;
      }
      i++;
    }

    // Only emit section if it has meaningful content beyond the heading
    if (hasNonHeadingContent) {
      if (heading) {
        outSections.push([heading, ...kept].join("\n"));
      } else {
        outSections.push(kept.join("\n"));
      }
    }
  }

  return outSections.join("\n\n").trim();
}
