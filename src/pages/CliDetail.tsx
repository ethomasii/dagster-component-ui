import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { ExamplesMarkdown } from "../components/ExamplesMarkdown";
import { CLIS, findCli } from "../data/clis";

/**
 * `/cli/:id` — per-CLI detail page. Fetches the raw .py file, extracts
 * the module-level docstring, and renders it as markdown. Docstrings
 * in the shipped CLIs are structured (usage examples, notes on
 * Dagster+ schema versioning, retry behavior, etc.) — no separate
 * .md files needed.
 */

function extractDocstring(pySource: string): string | null {
  // Skip shebang + `from __future__` etc. lines to find the first
  // triple-quoted string literal.
  const stripped = pySource.replace(/^#!.*\n/, "");
  const m = stripped.match(/^\s*(?:from\s+__future__[^\n]*\n)*\s*"""([\s\S]*?)"""/m);
  if (!m) return null;
  return m[1].trim();
}


export function CliDetail() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = rawId ? decodeURIComponent(rawId) : "";
  const cli = findCli(id);

  const [pySource, setPySource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cli) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPySource(null);
    (async () => {
      try {
        const r = await fetch(cli.rawUrl);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        if (!cancelled) setPySource(text);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cli]);

  const docMd = useMemo(() => {
    if (!pySource) return "";
    const doc = extractDocstring(pySource);
    if (!doc) return "";
    // Wrap the docstring in a markdown fenced block so multi-line
    // shell examples render as code, but let the description prose
    // render as regular text. The shipped docstrings already use
    // markdown-style headers + fenced code, so we can render directly.
    return doc;
  }, [pySource]);

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
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24, fontSize: 13 }}>
        <a href={cli.githubUrl} target="_blank" rel="noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          color: "var(--cyan)", textDecoration: "none",
        }}>
          Source on GitHub <ExternalLink size={12} />
        </a>
        <a href={cli.rawUrl} target="_blank" rel="noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          color: "var(--cyan)", textDecoration: "none",
        }}>
          Raw .py <ExternalLink size={12} />
        </a>
        <a href={cli.readmeUrl} target="_blank" rel="noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          color: "var(--cyan)", textDecoration: "none",
        }}>
          Shared cli/README.md <ExternalLink size={12} />
        </a>
      </div>

      {loading && <p style={{ color: "var(--text-muted)" }}>Loading module docstring …</p>}
      {error && (
        <div className="callout-help" style={{ borderLeftColor: "var(--error)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Could not fetch {cli.title}</p>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-muted)" }}>{error}</p>
          <p style={{ margin: "12px 0 0", fontSize: 13 }}>
            <a href={cli.githubUrl} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
              View on GitHub →
            </a>
          </p>
        </div>
      )}
      {docMd && (
        <ExamplesMarkdown>
{`\`\`\`
${docMd}
\`\`\``}
        </ExamplesMarkdown>
      )}
    </div>
  );
}
