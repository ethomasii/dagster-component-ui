import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Rss } from "lucide-react";
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
    <main
      style={{
        maxWidth: 780,
        margin: "0 auto",
        padding: "48px 24px 96px",
      }}
    >
      <header style={{ marginBottom: 40 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0,
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
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Rss size={14} strokeWidth={2} />
            RSS
          </a>
        </div>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 16 }}>
          Long-form posts from Eric Thomas on the Dagster community components
          registry — design essays, component tours, honest retrospectives.
        </p>
      </header>

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
  );
}
