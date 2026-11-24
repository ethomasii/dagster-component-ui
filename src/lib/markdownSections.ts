/** Splits a markdown document into its H2 ("## ") sections, and each section's own H3
 *  ("### ") subsections if it has any, for two-level collapsible rendering. A section with
 *  no H3 children (most of them) renders as a single flat body, same as before; a section
 *  WITH H3 children (the examples README's few big "depth catalog" sections) gets its own
 *  nested row of collapsible subsections instead of dumping every one of their tables at
 *  once. */

export type MarkdownSubsection = {
  /** Plain-text heading (markdown stripped), used for the collapsed `<summary>` label. */
  heading: string;
  /** github-slugger-compatible slug — shared counter with the parent document, so it matches
   *  what `rehype-slug` would assign the real heading even when sibling headings collide. */
  slug: string;
  /** This subsection's content with its own `### heading` line removed. */
  body: string;
  rowCount: number;
};

export type MarkdownSection = {
  heading: string;
  slug: string;
  /** Full section text including the `## heading` line — fed straight into ReactMarkdown
   *  when the section has no subsections. */
  text: string;
  /** `text` with the `## heading` line removed. */
  body: string;
  /** For a section WITH subsections: the prose between the `##` heading and its first `###`
   *  (e.g. "The biggest section — these run offline against synthetic data..."). Empty for a
   *  section with no subsections (its content is just `body`). */
  intro: string;
  /** Empty when this section has no `###` children. */
  subsections: MarkdownSubsection[];
  /** Total table rows in this section, summed across subsections when it has any. */
  rowCount: number;
};

/** github-slugger's common-case algorithm: lowercase, strip non-word/space/hyphen chars,
 *  spaces -> hyphens, trim. Good enough for plain-ASCII headings like these. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}

const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR_RE = /^\s*\|(\s*:?-+:?\s*\|)+\s*$/;

function countTableRows(body: string): number {
  const lines = body.split("\n");
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (TABLE_ROW_RE.test(lines[i]) && TABLE_SEPARATOR_RE.test(lines[i + 1] ?? "")) {
      let j = i + 2;
      while (j < lines.length && TABLE_ROW_RE.test(lines[j] ?? "")) {
        count++;
        j++;
      }
      i = j - 1;
    }
  }
  return count;
}

/** Slugifies `heading`, disambiguating repeats the same way github-slugger does (-1, -2, …)
 *  via a counter shared across the WHOLE document (H2s and H3s alike), not just one level. */
function nextSlug(heading: string, seen: Map<string, number>): string {
  let slug = slugifyHeading(heading);
  const n = seen.get(slug) ?? 0;
  seen.set(slug, n + 1);
  if (n > 0) slug = `${slug}-${n}`;
  return slug;
}

function stripHeadingLine(text: string): string {
  return text.split("\n").slice(1).join("\n").replace(/^\n+/, "");
}

/** Everything before the first `## ` heading, plus the list of H2 sections after it. */
export function splitIntoH2Sections(markdown: string): { preamble: string; sections: MarkdownSection[] } {
  const chunks = markdown.split(/(?=^##\s+)/m);
  const preamble = /^##\s+/.test(chunks[0] ?? "") ? "" : (chunks[0] ?? "");
  const rest = /^##\s+/.test(chunks[0] ?? "") ? chunks : chunks.slice(1);

  const seen = new Map<string, number>();
  const sections: MarkdownSection[] = rest
    .filter((c) => /^##\s+/.test(c))
    .map((text) => {
      const firstLine = text.split("\n", 1)[0];
      const heading = stripInlineMarkdown(firstLine.replace(/^##\s+/, ""));
      const slug = nextSlug(heading, seen);
      const body = stripHeadingLine(text);

      const h3Chunks = body.split(/(?=^###\s+)/m);
      const hasSubsections = h3Chunks.length > 1 || /^###\s+/.test(h3Chunks[0] ?? "");
      if (!hasSubsections) {
        return { heading, slug, text, body, intro: "", subsections: [], rowCount: countTableRows(body) };
      }

      const intro = /^###\s+/.test(h3Chunks[0] ?? "") ? "" : (h3Chunks[0] ?? "");
      const subChunks = /^###\s+/.test(h3Chunks[0] ?? "") ? h3Chunks : h3Chunks.slice(1);
      const subsections: MarkdownSubsection[] = subChunks
        .filter((c) => /^###\s+/.test(c))
        .map((subText) => {
          const subFirstLine = subText.split("\n", 1)[0];
          const subHeading = stripInlineMarkdown(subFirstLine.replace(/^###\s+/, ""));
          const subSlug = nextSlug(subHeading, seen);
          const subBody = stripHeadingLine(subText);
          return { heading: subHeading, slug: subSlug, body: subBody, rowCount: countTableRows(subBody) };
        });

      return {
        heading,
        slug,
        text,
        body,
        intro,
        subsections,
        rowCount: subsections.reduce((n, s) => n + s.rowCount, 0),
      };
    });

  return { preamble, sections };
}
