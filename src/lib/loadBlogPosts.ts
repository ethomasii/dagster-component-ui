/**
 * Blog loader — pulls the RSS 2.0 feed from the CLI repo's `blog/feed.xml`,
 * parses it into a post list, and fetches individual post markdown by slug.
 *
 * The RSS feed is the single source of truth for what's published — new
 * posts land in the UI as soon as `tools/generate_rss.py` is re-run and
 * committed.
 */

import {
  COMMUNITY_CLI_RAW_BASE,
  COMMUNITY_CLI_TREE_BASE,
} from "../data/communityCliRepo";

export const COMMUNITY_BLOG_RAW_BASE = `${COMMUNITY_CLI_RAW_BASE}/blog`;

export const COMMUNITY_BLOG_FEED_URL = `${COMMUNITY_BLOG_RAW_BASE}/feed.xml`;

export const COMMUNITY_BLOG_TREE_WEB = `${COMMUNITY_CLI_TREE_BASE}/blog`;

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: Date;
};

function textContentOf(el: Element | null, tag: string): string {
  const child = el?.getElementsByTagName(tag)?.[0];
  return child?.textContent?.trim() ?? "";
}

/** Extract the slug from a raw.githubusercontent.com URL to a blog .md file. */
function slugFromUrl(url: string): string {
  const tail = url.split("/").pop() ?? "";
  return tail.replace(/\.md$/i, "");
}

let feedCache: BlogPost[] | null = null;

/**
 * Fetch + parse the RSS feed. Cached for the session — call
 * `invalidateBlogFeedCache()` after a publish to force re-fetch.
 */
export async function fetchBlogPosts(): Promise<BlogPost[]> {
  if (feedCache) return feedCache;
  const res = await fetch(COMMUNITY_BLOG_FEED_URL, { credentials: "omit" });
  if (!res.ok) {
    throw new Error(`Could not load blog feed (HTTP ${res.status})`);
  }
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    throw new Error("Blog feed XML did not parse cleanly.");
  }
  const items = Array.from(doc.getElementsByTagName("item"));
  const posts: BlogPost[] = items.map((item) => {
    const link = textContentOf(item, "link");
    const guid = textContentOf(item, "guid");
    // Prefer guid (raw URL) → slug. Fall back to link (blob URL) → slug.
    const slug = slugFromUrl(guid || link);
    const dateRaw = textContentOf(item, "pubDate");
    const date = new Date(dateRaw);
    // Dublin Core `dc:creator` for author (RSS 2.0 <author> requires email).
    const dcCreator = item.getElementsByTagNameNS(
      "http://purl.org/dc/elements/1.1/",
      "creator",
    )[0]?.textContent?.trim();
    return {
      slug,
      title: textContentOf(item, "title"),
      description: textContentOf(item, "description"),
      author: dcCreator || textContentOf(item, "author") || "Eric Thomas",
      date,
    };
  });
  posts.sort((a, b) => b.date.getTime() - a.date.getTime());
  feedCache = posts;
  return posts;
}

export function invalidateBlogFeedCache(): void {
  feedCache = null;
}

const markdownCache = new Map<string, string>();

/** Fetch a single post's raw markdown by slug. Cached per-session. */
export async function fetchBlogPostMarkdown(slug: string): Promise<string> {
  const cached = markdownCache.get(slug);
  if (cached) return cached;
  const url = `${COMMUNITY_BLOG_RAW_BASE}/${encodeURIComponent(slug)}.md`;
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) {
    throw new Error(
      `Could not load blog post ${slug} (HTTP ${res.status}). URL: ${url}`,
    );
  }
  const text = await res.text();
  markdownCache.set(slug, text);
  return text;
}

/** Strip the YAML frontmatter block from a raw post's markdown before rendering. */
export function stripFrontmatter(md: string): string {
  if (!md.startsWith("---")) return md;
  const match = md.match(/^---\n[\s\S]*?\n---\n?/);
  return match ? md.slice(match[0].length) : md;
}

/** Human-friendly date string for post cards + detail pages. */
export function formatBlogDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
