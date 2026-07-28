import type { ManifestComponent } from "../types";
import { componentId } from "./componentId";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Router basename prefix, e.g. "" or "/app". */
export function catalogDetailHref(id: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const prefix = base === "/" ? "" : base.replace(/\/$/, "");
  return `${prefix}/c/${encodeURIComponent(id)}`;
}

/** Vendor markdown often links to the public registry; rewrite to this deployment. */
export function rewritePublishedRegistryComponentUrls(markdown: string): string {
  // [`component_id`](vercel) → [component_id](local) — drop code styling inside link text
  let s = markdown.replace(
    /\[(`([a-zA-Z0-9_.-]+)`)\]\(https:\/\/dagster-component-ui\.vercel\.app\/c\/([a-zA-Z0-9_.-]+)\)/g,
    (_m, _quoted, id: string) => `[${id}](${catalogDetailHref(id)})`
  );
  s = s.replace(
    /https:\/\/dagster-component-ui\.vercel\.app\/c\/([a-zA-Z0-9_.-]+)/g,
    (_m, id: string) => catalogDetailHref(id)
  );
  return s;
}

/**
 * Rewrite GitHub `tree`/`blob` URLs pointing at a component's directory in the
 * dagster-component-templates repo to internal `/c/<id>` pages.
 *
 * Handles every top-level category dir (`assets/*`, `resources`, `io_managers`,
 * `sensors`, `jobs`, `integrations`, `external_assets`, `compute_log_managers`,
 * `observations`, `asset_checks`). Optionally trims any trailing subpath (e.g.
 * `/README.md` or `/component.py`) so the click always lands on the component
 * detail page rather than a raw source file on GitHub.
 *
 * Idempotent; internal `/c/<id>` URLs are unaffected.
 */
const CATEGORY_PATH = "(?:assets\\/[a-z_]+|resources|io_managers|sensors|jobs|integrations|external_assets|compute_log_managers|observations|asset_checks)";
const GITHUB_COMPONENT_TREE_RE = new RegExp(
  "https?:\\/\\/github\\.com\\/[\\w.-]+\\/dagster-component-templates\\/(?:tree|blob)\\/[^/\\s)]+\\/" +
    CATEGORY_PATH +
    "\\/([a-z_][a-z0-9_]*)(?:\\/[^\\s)]*)?",
  "g",
);

export function rewriteGitHubComponentUrls(markdown: string): string {
  return markdown.replace(GITHUB_COMPONENT_TREE_RE, (_m, id: string) => catalogDetailHref(id));
}

/**
 * Rewrite the DISPLAY TEXT of `[<text>](<slug>.md)` markdown links using the
 * target walkthrough's H1 when the current display text is a filename or bare
 * slug (i.e. would render as `.md` visible garbage). User-authored labels
 * (anything that isn't just the slug/filename) are left alone.
 *
 * Requires the caller to have pre-fetched titles for the linked slugs (see
 * `fetchExampleTitle` + `extractLinkedExampleSlugs`). If a title isn't in
 * the map yet, the link is untouched — it'll be rewritten on the next render
 * once the fetch resolves.
 */
export function rewriteExampleLinkTextsFromTitles(
  markdown: string,
  titles: Record<string, string | null>,
): string {
  return markdown.replace(
    /\[([^\]]+)\]\((?:\.?\/)?([a-z_][a-z0-9_]*)\.md(#[^)]*)?\)/gi,
    (match, text: string, slug: string, anchor: string | undefined) => {
      const title = titles[slug];
      if (!title) return match;
      // Only rewrite when the display text is derivative of the filename —
      // preserves any human-authored labels.
      const t = text.trim().replace(/^`|`$/g, "");
      const looksFilenameish =
        t === slug ||
        t === `${slug}.md` ||
        t.toLowerCase() === `${slug}.md`.toLowerCase() ||
        t.toLowerCase() === slug.toLowerCase();
      if (!looksFilenameish) return match;
      return `[${title}](${slug}.md${anchor ?? ""})`;
    },
  );
}

const LINK_MASK = "\uE000";
const LINK_MASK_END = "\uE001";

function maskMarkdownLinks(markdown: string): { masked: string; links: string[] } {
  const links: string[] = [];
  const masked = markdown.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match) => {
    const i = links.length;
    links.push(match);
    return `${LINK_MASK}${i}${LINK_MASK_END}`;
  });
  return { masked, links };
}

function unmaskMarkdownLinks(masked: string, links: string[]): string {
  return masked.replace(new RegExp(`${LINK_MASK}(\\d+)${LINK_MASK_END}`, "g"), (_, i) => links[Number(i)] ?? "");
}

/**
 * Turn catalog ids in markdown into links to this registry’s component pages.
 * - Backtick-wrapped ids
 * - `dagster-component add <id>` and optional @ref
 */
export function linkifyCatalogMarkdown(markdown: string, components: ManifestComponent[]): string {
  const { masked, links } = maskMarkdownLinks(markdown);
  const ids = [...new Set(components.map(componentId).filter(Boolean))].sort((a, b) => b.length - a.length);
  let s = masked;
  for (const id of ids) {
    const href = catalogDetailHref(id);
    const esc = escapeRegExp(id);
    s = s.replace(
      new RegExp("`" + esc + "`", "g"),
      "[`" + id + "`](" + href + ")"
    );
  }
  for (const id of ids) {
    const esc = escapeRegExp(id);
    const href = catalogDetailHref(id);
    s = s.replace(
      new RegExp(`(dagster-component\\s+add\\s+)(${esc})(@[^\\s#\`]+)?`, "g"),
      (_, prefix: string, mid: string, pin: string | undefined) =>
        `${prefix}[${mid}${pin ?? ""}](${href})`
    );
  }
  return unmaskMarkdownLinks(s, links);
}
