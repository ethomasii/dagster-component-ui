import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { ExamplesMarkdown } from "../components/ExamplesMarkdown";
import { CLIS, findCli } from "../data/clis";

/**
 * `/cli/:id` — per-CLI detail page. Fetches the dedicated README from
 * `cli/<id>/README.md` in the templates repo and renders it as markdown.
 *
 * Each CLI has its own README that expands on the module-level docstring
 * with sections (install, usage, subcommands, options, common failure
 * modes, sharing-with-customers notes). The shared cli/README.md
 * overview lives at its historical URL for customer bookmark compat.
 */

export function CliDetail() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = rawId ? decodeURIComponent(rawId) : "";
  const cli = findCli(id);

  const [md, setMd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cli) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMd(null);
    (async () => {
      try {
        const r = await fetch(cli.readmeUrl);
        if (!r.ok) throw new Error(`HTTP ${r.status} fetching README`);
        const text = await r.text();
        if (!cancelled) setMd(text);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cli]);

  if (!cli) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 64px" }}>
        <p style={{ margin: "0 0 8px" }}>
          <Link to="/cli" style={{ fontSize: 14, color: "var(--cyan)", textDecoration: "none" }}>
            ← CLIs
          </Link>
        </p>
        <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, margin: "12px 0 8px" }}>
          Not found: {id}
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Available: {CLIS.map((c) => c.id).join(", ")}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" }}>
      <p style={{ margin: "0 0 8px" }}>
        <Link to="/cli" style={{ fontSize: 14, color: "var(--cyan)", textDecoration: "none" }}>
          ← CLIs
        </Link>
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", margin: "12px 0 8px" }}>
        <h1 style={{
          fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em",
          margin: 0, lineHeight: 1.2, fontFamily: "var(--font-mono, monospace)",
        }}>
          {cli.title}
        </h1>
        <span style={{
          fontSize: 11, padding: "3px 8px", borderRadius: 999,
          background: cli.category === "sync" ? "rgba(59, 130, 246, 0.12)" : "rgba(20, 184, 166, 0.12)",
          color: cli.category === "sync" ? "#3b82f6" : "var(--teal, #14b8a6)",
          fontWeight: 600, letterSpacing: 0.2, textTransform: "uppercase",
        }}>
          {cli.category}
        </span>
      </div>
      <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
        {cli.oneLiner}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24, fontSize: 13 }}>
        <a href={cli.githubUrl} target="_blank" rel="noreferrer" style={linkStyle}>
          Source on GitHub <ExternalLink size={12} />
        </a>
        <a href={cli.rawUrl} target="_blank" rel="noreferrer" style={linkStyle}>
          Raw .py <ExternalLink size={12} />
        </a>
        <a href={cli.readmeUrl} target="_blank" rel="noreferrer" style={linkStyle}>
          Raw README.md <ExternalLink size={12} />
        </a>
        <a href={cli.sharedReadmeUrl} target="_blank" rel="noreferrer" style={linkStyle}>
          Shared overview README <ExternalLink size={12} />
        </a>
      </div>

      {loading && <p style={{ color: "var(--text-muted)" }}>Loading README …</p>}
      {error && (
        <div className="callout-help" style={{ borderLeftColor: "var(--error)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Could not fetch {cli.title} README</p>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-muted)" }}>{error}</p>
          <p style={{ margin: "12px 0 0", fontSize: 13 }}>
            Try opening directly on GitHub:{" "}
            <a href={cli.githubUrl} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
              {cli.title} →
            </a>
          </p>
        </div>
      )}
      {md != null && md !== "" && <ExamplesMarkdown>{md}</ExamplesMarkdown>}
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: "var(--cyan)",
  textDecoration: "none",
};
