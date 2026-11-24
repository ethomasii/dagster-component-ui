import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ExamplesMarkdown } from "../components/ExamplesMarkdown";
import { PageHeroBand } from "../components/PageHeroBand";
import { Breadcrumb } from "../components/Breadcrumb";
import {
  COMMUNITY_BLOG_RAW_BASE,
  COMMUNITY_BLOG_TREE_WEB,
  fetchBlogPostMarkdown,
  fetchBlogPosts,
  formatBlogDate,
  stripFrontmatter,
  type BlogPost,
} from "../lib/loadBlogPosts";
import { markdownFirstH1, stripMarkdownFirstH1 } from "../lib/loadCommunityExamples";

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

  const strippedFrontmatter = useMemo(() => (md ? stripFrontmatter(md) : ""), [md]);
  const titleFromDoc = useMemo(
    () => (strippedFrontmatter ? markdownFirstH1(strippedFrontmatter) : null),
    [strippedFrontmatter],
  );
  const displayTitle = titleFromDoc ?? meta?.title ?? slug;
  const body = useMemo(
    () => (titleFromDoc ? stripMarkdownFirstH1(strippedFrontmatter) : strippedFrontmatter),
    [strippedFrontmatter, titleFromDoc],
  );

  return (
    <>
      <PageHeroBand>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 32px" }}>
          <Breadcrumb
            crumbs={[
              { label: "Registry", to: "/" },
              { label: "Blog", to: "/blog" },
              { label: md !== null ? displayTitle : "…" },
            ]}
          />
          {md !== null && (
            <>
              <h1
                style={{
                  fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  margin: "0 0 10px",
                  lineHeight: 1.2,
                  color: "#fff",
                }}
              >
                {displayTitle}
              </h1>
              {meta && (
                <p style={{ color: "rgba(255,255,255,0.75)", margin: 0, fontSize: 14 }}>
                  {formatBlogDate(meta.date)} · {meta.author}
                </p>
              )}
            </>
          )}
          {md === null && !err && (
            <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 700, margin: 0, color: "#fff" }}>
              Loading…
            </h1>
          )}
        </div>
      </PageHeroBand>

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "28px 24px 96px",
        }}
      >
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

      {md !== null && (
        <>
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
    </>
  );
}
