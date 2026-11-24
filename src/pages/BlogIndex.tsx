import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Rss } from "lucide-react";
import { PageHeroBand } from "../components/PageHeroBand";
import { PageEyebrow } from "../components/PageEyebrow";
import {
  COMMUNITY_BLOG_FEED_URL,
  COMMUNITY_BLOG_TREE_WEB,
  fetchBlogPosts,
  formatBlogDate,
  type BlogPost,
} from "../lib/loadBlogPosts";

export function BlogIndex() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBlogPosts()
      .then((p) => {
        if (!cancelled) setPosts(p);
      })
      .catch((e: Error) => {
        if (!cancelled) setErr(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeroBand>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 36px" }}>
          <PageEyebrow light>Blog</PageEyebrow>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            <h1
              style={{
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                margin: 0,
                color: "#fff",
              }}
            >
              Blog
            </h1>
            <a
              href={COMMUNITY_BLOG_FEED_URL}
              target="_blank"
              rel="noreferrer"
              title="Subscribe via RSS"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Rss size={14} strokeWidth={2} />
              RSS
            </a>
          </div>
          <p style={{ color: "rgba(255,255,255,0.85)", margin: 0, fontSize: 16 }}>
            Long-form posts from Eric Thomas on the Dagster community components
            registry — design essays, component tours, honest retrospectives.
          </p>
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
            color: "var(--text)",
          }}
        >
          <strong>Could not load the blog feed.</strong>
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
              href={COMMUNITY_BLOG_TREE_WEB}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--text)", textDecoration: "underline" }}
            >
              Browse posts on GitHub
            </a>
          </div>
        </div>
      )}

      {!err && posts === null && (
        <div style={{ color: "var(--text-muted)" }}>Loading…</div>
      )}

      {posts && posts.length === 0 && (
        <div style={{ color: "var(--text-muted)" }}>No posts yet.</div>
      )}

      {posts && posts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {posts.map((p) => (
            <Link
              key={p.slug}
              to={`/blog/${encodeURIComponent(p.slug)}`}
              style={{
                display: "block",
                padding: "20px 22px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text)",
                textDecoration: "none",
                transition: "border-color 120ms ease, transform 120ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(124, 58, 237, 0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--border)";
              }}
            >
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                {formatBlogDate(p.date)} · {p.author}
              </div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: 8,
                  letterSpacing: "-0.01em",
                }}
              >
                {p.title}
              </h2>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 15,
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {p.description}
              </p>
            </Link>
          ))}
        </div>
      )}
      </main>
    </>
  );
}
