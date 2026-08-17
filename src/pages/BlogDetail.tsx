import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ExamplesMarkdown } from "../components/ExamplesMarkdown";
import {
  COMMUNITY_BLOG_RAW_BASE,
  COMMUNITY_BLOG_TREE_WEB,
  fetchBlogPostMarkdown,
  fetchBlogPosts,
  formatBlogDate,
  stripFrontmatter,
  type BlogPost,
} from "../lib/loadBlogPosts";

export function BlogDetail() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const slug = rawSlug ? decodeURIComponent(rawSlug) : "";

  const [md, setMd] = useState<string | null>(null);
  const [meta, setMeta] = useState<BlogPost | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setErr(null);
    setMd(null);
    // Fetch both in parallel — the metadata (title, date, author) comes
    // from the RSS feed; the body comes from the raw markdown file.
    Promise.all([fetchBlogPostMarkdown(slug), fetchBlogPosts()])
      .then(([markdown, posts]) => {
        if (cancelled) return;
        setMd(markdown);
        const found = posts.find((p) => p.slug === slug) ?? null;
        setMeta(found);
      })
      .catch((e: Error) => {
        if (!cancelled) setErr(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const body = useMemo(() => (md ? stripFrontmatter(md) : ""), [md]);

  return (
    <main
      style={{
        maxWidth: 780,
        margin: "0 auto",
        padding: "32px 24px 96px",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <Link
          to="/blog"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--text-muted)",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          <ArrowLeft size={14} strokeWidth={2} />
          All posts
        </Link>
      </div>

      {err && (
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
          }}
        >
          <strong>Could not load post.</strong>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: 14,
              marginTop: 6,
            }}
          >
            {err}
          </div>
          <div style={{ marginTop: 10 }}>
            <a
              href={`${COMMUNITY_BLOG_RAW_BASE}/${encodeURIComponent(slug)}.md`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--text)", textDecoration: "underline" }}
            >
              Read on GitHub
            </a>
            {" · "}
            <a
              href={COMMUNITY_BLOG_TREE_WEB}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--text)", textDecoration: "underline" }}
            >
              All posts on GitHub
            </a>
          </div>
        </div>
      )}

      {!err && md === null && (
        <div style={{ color: "var(--text-muted)" }}>Loading…</div>
      )}

      {md !== null && (
        <>
          {meta && (
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: 14,
                marginBottom: 24,
              }}
            >
              {formatBlogDate(meta.date)} · {meta.author}
            </div>
          )}
          <article className="doc-viewer-markdown" style={{ fontSize: 16 }}>
            <ExamplesMarkdown className="doc-viewer-markdown">
              {body}
            </ExamplesMarkdown>
          </article>
          <hr
            style={{
              margin: "48px 0 20px",
              border: "none",
              borderTop: "1px solid var(--border)",
            }}
          />
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Source:{" "}
            <a
              href={`${COMMUNITY_BLOG_RAW_BASE}/${encodeURIComponent(slug)}.md`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--text-muted)" }}
            >
              {slug}.md
            </a>
          </div>
        </>
      )}
    </main>
  );
}
