import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

/**
 * `/cli` — standalone Dagster+ CLI scripts (not components, not installed
 * via `dagster-component add`). These are Python 3.8+ stdlib-only scripts
 * customers can `curl` and run against their Dagster+ deployment via a
 * user API token.
 *
 * Kept out of the component `/categories` grid deliberately — they have a
 * different install model (curl + chmod, not `dagster-component add`),
 * different runtime (standalone script vs Dagster project file), and
 * different mental model (ops tooling vs pipeline building blocks).
 */

type CliScript = {
  id: string;
  title: string;
  category: "sync" | "pull";
  oneLiner: string;
  description: string;
  usage: string;
  rawUrl: string;
  githubUrl: string;
  requires: string[];
};

const REPO = "https://github.com/eric-thomas-dagster/dagster-community-components";
const RAW  = "https://raw.githubusercontent.com/eric-thomas-dagster/dagster-community-components/main";

const CLIS: CliScript[] = [
  {
    id: "sync_catalog_views",
    title: "sync_catalog_views.py",
    category: "sync",
    oneLiner: "GitOps sync of Catalog Views (named asset selections) to a Dagster+ deployment.",
    description:
      "Push a YAML manifest of Catalog Views into a Dagster+ deployment via the real GraphQL API " +
      "(`createOrUpdateCatalogView`). Idempotent — matches by view name and updates in place; " +
      "creates new views when unmatched. `--dry-run` previews without touching the deployment; " +
      "`--prune` optionally removes views not in the manifest.",
    usage:
`export DAGSTER_CLOUD_API_TOKEN=user:xxxxxxxx

curl -fsSL ${RAW}/cli/sync_catalog_views.py -o sync_catalog_views.py
chmod +x sync_catalog_views.py

./sync_catalog_views.py sync catalog_views.yaml \\
    --deployment-url https://acme.dagster.cloud/prod \\
    --dry-run`,
    rawUrl: `${RAW}/cli/sync_catalog_views.py`,
    githubUrl: `${REPO}/blob/main/cli/sync_catalog_views.py`,
    requires: ["Python 3.8+", "PyYAML (`pip install pyyaml`)", "Dagster+ user API token"],
  },
  {
    id: "sync_custom_metrics",
    title: "sync_custom_metrics.py",
    category: "sync",
    oneLiner: "GitOps sync of custom Insights metrics to a Dagster+ deployment.",
    description:
      "Push a YAML manifest of custom Insights metrics into a Dagster+ deployment via " +
      "`createCustomMetric` / `updateCustomMetric`. Idempotent — matches by " +
      "`metadata_key` and updates in place. Supports `unit_type: INTEGER | TIME_MS | " +
      "TIME_SECONDS | FLOAT | BYTES`. `--dry-run` + `--prune` flags as with catalog views.",
    usage:
`export DAGSTER_CLOUD_API_TOKEN=user:xxxxxxxx

curl -fsSL ${RAW}/cli/sync_custom_metrics.py -o sync_custom_metrics.py
chmod +x sync_custom_metrics.py

./sync_custom_metrics.py sync metrics.yaml \\
    --deployment-url https://acme.dagster.cloud/prod \\
    --dry-run`,
    rawUrl: `${RAW}/cli/sync_custom_metrics.py`,
    githubUrl: `${REPO}/blob/main/cli/sync_custom_metrics.py`,
    requires: ["Python 3.8+", "PyYAML (`pip install pyyaml`)", "Dagster+ user API token"],
  },
  {
    id: "pull_credit_usage",
    title: "pull_credit_usage.py",
    category: "pull",
    oneLiner: "Pull Dagster+ credit usage sliced by deployment × code location × asset × day.",
    description:
      "The Dagster+ UI shows credit usage under Insights but doesn't expose a cross-" +
      "deployment / per-code-location / per-asset download as one report. This CLI hits " +
      "the same GraphQL endpoints the UI does (`reportingMetricsByAsset` on both the " +
      "VICTORIA_METRICS + POSTGRES stores) and merges into one table. Handles the " +
      "120-day API cap by auto-chunking longer windows; unions the two metric stores so " +
      "date ranges spanning VM's ~6-month retention pick up the historical POSTGRES data.",
    usage:
`export DAGSTER_CLOUD_API_TOKEN=user:xxxxxxxx

curl -fsSL ${RAW}/cli/pull_credit_usage.py -o pull_credit_usage.py
chmod +x pull_credit_usage.py

# List deployments in the org (validates token):
./pull_credit_usage.py --org acme deployments

# 9-month credit usage per deployment × code location × asset × day, CSV:
./pull_credit_usage.py --org acme \\
    credits --start 2026-01-01 --end 2026-09-30 \\
    --group-by deployment,code_location,asset,day \\
    --output-csv credits.csv`,
    rawUrl: `${RAW}/cli/pull_credit_usage.py`,
    githubUrl: `${REPO}/blob/main/cli/pull_credit_usage.py`,
    requires: ["Python 3.8+ (stdlib only — no external deps)", "Dagster+ user API token"],
  },
];


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
              <h3 style={{
                margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em",
                fontFamily: "var(--font-mono, monospace)",
              }}>
                {cli.title}
              </h3>
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

            <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
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
          </div>
        ))}
      </div>

      <p style={{ marginTop: 32, fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
        Missing something? Open an issue at{" "}
        <a href={`${REPO}/issues`} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
          {REPO.replace("https://github.com/", "")}/issues
        </a>
        {" "}or hand-roll the shape from the three above — they're all stdlib-only and follow the same
        `subcommand + arg` pattern.
      </p>
    </div>
  );
}
