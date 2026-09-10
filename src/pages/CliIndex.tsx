import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, ExternalLink, ArrowRight } from "lucide-react";
import { CLIS, CLI_REPO } from "../data/clis";

/**
 * `/cli` — standalone Dagster+ CLI scripts (not components, not installed
 * via `dagster-component add`). These are Python 3.8+ stdlib-only scripts
 * customers can `curl` and run against their Dagster+ deployment via a
 * user API token.
 *
 * Each card links to `/cli/:id` for the full per-script docstring rendered
 * as markdown (usage examples, notes on Dagster+ schema versioning,
 * retry behavior, retention story for pull_credit_usage, etc.).
 */

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 6,
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        color: "var(--text-muted)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : label}
    </button>
  );
}


export function CliIndex() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          margin: "0 0 12px",
        }}
      >
        CLIs
      </p>
      <h1
        style={{
          fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          margin: "0 0 12px",
          lineHeight: 1.2,
        }}
      >
        Standalone Dagster+ CLI scripts
      </h1>
      <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
        Python 3.8+ stdlib-only scripts for GitOps-managing your Dagster+ deployment and pulling
        Insights data the web UI doesn't expose. Different install model than components — <code
        className="mono" style={{ fontSize: 13 }}>curl</code> the file, <code className="mono"
        style={{ fontSize: 13 }}>chmod +x</code>, run against a Dagster+ user API token. Nothing
        gets installed into your Dagster project.
      </p>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 32px", lineHeight: 1.5 }}>
        All three scripts have been verified end-to-end against a live Dagster+ deployment. Safe to
        hand a customer directly — no dependency on any registry component or internal tooling.
        Click any card for the full per-script docs (fetched from the script's module docstring).
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {CLIS.map((cli) => (
          <div
            key={cli.id}
            style={{
              padding: 24,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
              <Link
                to={`/cli/${encodeURIComponent(cli.id)}`}
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  fontFamily: "var(--font-mono, monospace)",
                  color: "var(--text)",
                  textDecoration: "none",
                }}
              >
                {cli.title}
              </Link>
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: cli.category === "sync" ? "rgba(59, 130, 246, 0.12)" : "rgba(20, 184, 166, 0.12)",
                  color: cli.category === "sync" ? "#3b82f6" : "var(--teal, #14b8a6)",
                  fontWeight: 600,
                  letterSpacing: 0.2,
                  textTransform: "uppercase",
                }}
              >
                {cli.category}
              </span>
              <a
                href={cli.githubUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 12, color: "var(--text-dim)", textDecoration: "none",
                  marginLeft: "auto",
                }}
              >
                Source on GitHub <ExternalLink size={12} />
              </a>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 15, color: "var(--text)", fontWeight: 500 }}>
              {cli.oneLiner}
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.55 }}>
              {cli.description}
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: "var(--text-dim)",
              }}>
                Install + run
              </span>
              <CopyBtn text={cli.usage} />
            </div>
            <pre style={{
              margin: 0,
              padding: 16,
              borderRadius: 10,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              fontSize: 12.5,
              fontFamily: "var(--font-mono, monospace)",
              overflowX: "auto",
              lineHeight: 1.5,
              color: "var(--text)",
              whiteSpace: "pre",
            }}>{cli.usage}</pre>

            <div style={{
              marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12,
              alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase", color: "var(--text-dim)",
                }}>
                  Requires
                </span>
                {cli.requires.map((req, i) => (
                  <span key={i} style={{
                    fontSize: 12, color: "var(--text-muted)",
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                  }}>
                    {req}
                  </span>
                ))}
              </div>
              <Link
                to={`/cli/${encodeURIComponent(cli.id)}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 13, fontWeight: 600, color: "var(--cyan)",
                  textDecoration: "none",
                }}
              >
                Full docs <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 32, fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
        Missing something? Open an issue at{" "}
        <a href={`${CLI_REPO}/issues`} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
          {CLI_REPO.replace("https://github.com/", "")}/issues
        </a>
        {" "}or hand-roll the shape from the three above — they're all stdlib-only and follow the same
        `subcommand + arg` pattern.
      </p>
    </div>
  );
}
