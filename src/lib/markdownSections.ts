/** Splits a markdown document into its H2 ("## ") sections, for collapsible rendering.
 *  H3+ subheadings stay nested inside their parent H2's body (not split further) -- only
 *  the top-level section boundary collapses. */

export type MarkdownSection = {
  /** Plain-text heading (markdown stripped), used for the collapsed `<summary>` label. */
  heading: string;
  /** github-slugger-compatible slug, matches what `rehype-slug` gives the real heading --
   *  used to auto-open a section whose anchor is in the URL hash. */
  slug: string;
  /** Full section text including the `## heading` line — fed straight into ReactMarkdown. */
  text: string;
  /** `text` with the `## heading` line itself removed — for callers that render the heading
   *  separately (e.g. as a styled `<summary>`) and would otherwise show it twice. */
  body: string;
  /** Rough count of markdown table data rows in this section (for the summary badge). */
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
      let slug = slugifyHeading(heading);
      // github-slugger disambiguates repeats with -1, -2, ... — match that if headings collide.
      const n = seen.get(slug) ?? 0;
      seen.set(slug, n + 1);
      if (n > 0) slug = `${slug}-${n}`;
      const body = text.split("\n").slice(1).join("\n").replace(/^\n+/, "");
      return { heading, slug, text, body, rowCount: countTableRows(text) };
    });

  return { preamble, sections };
}
