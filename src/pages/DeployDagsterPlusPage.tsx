import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";
import { ExamplesMarkdown } from "../components/ExamplesMarkdown";
import {
  COMMUNITY_CLI_DEPLOY_DAGSTER_PLUS_BLOB_WEB,
  COMMUNITY_CLI_DEPLOY_DAGSTER_PLUS_MD_RAW,
  COMMUNITY_CLI_DEPLOY_DAGSTER_PLUS_SCRIPT_BLOB_WEB,
  COMMUNITY_CLI_DEPLOY_DAGSTER_PLUS_SCRIPT_RAW,
  COMMUNITY_CLI_REPO_WEB,
} from "../lib/registryRequirements";
import { markdownFirstH1, stripMarkdownFirstH1 } from "../lib/loadCommunityExamples";
import { PageEyebrow } from "../components/PageEyebrow";

export function DeployDagsterPlusPage() {
  const [md, setMd] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setMd(null);
    void fetch(COMMUNITY_CLI_DEPLOY_DAGSTER_PLUS_MD_RAW, { credentials: "omit" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Could not load guide (HTTP ${res.status})`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setMd(text);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const titleFromDoc = md ? markdownFirstH1(md) : null;
  const displayTitle = titleFromDoc ?? "Deploy to Dagster+";
  const bodyMd = md ? (titleFromDoc ? stripMarkdownFirstH1(md) : md) : "";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" }}>
      <p style={{ margin: "0 0 8px" }}>
        <Link to="/" style={{ fontSize: 14, color: "var(--cyan)", textDecoration: "none" }}>
          ← Registry
        </Link>
      </p>

      <PageEyebrow style={{ margin: "16px 0 10px" }}>Dagster+</PageEyebrow>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            flex: "1 1 280px",
            minWidth: 0,
            padding: "18px 20px",
            borderRadius: 14,
            border: "1px solid var(--border)",
            background:
              "linear-gradient(145deg, rgba(124, 58, 237, 0.12) 0%, var(--bg-card) 42%, var(--bg-card) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(124, 58, 237, 0.25)",
                color: "var(--accent-bright)",
              }}
              aria-hidden
            >
              <Rocket size={22} strokeWidth={2} />
            </span>
            <h1
              style={{
                fontSize: "clamp(1.45rem, 3.5vw, 1.85rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              {loading ? "Deploy to Dagster+…" : displayTitle}
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.55 }}>
            This guide is maintained in the{" "}
            <a href={COMMUNITY_CLI_REPO_WEB} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
              dagster-community-components-cli
            </a>{" "}
            repo under <span className="mono">examples/</span>. The registry mirrors the Markdown here so you can read
            it next to templates and demos.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 24,
          alignItems: "center",
        }}
      >
        <a
          href={COMMUNITY_CLI_DEPLOY_DAGSTER_PLUS_SCRIPT_BLOB_WEB}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text-muted)",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          deploy_to_dagster_plus.sh
        </a>
        <a
          href={COMMUNITY_CLI_DEPLOY_DAGSTER_PLUS_SCRIPT_RAW}
          target="_blank"
          rel="noreferrer"
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            textDecoration: "none",
            wordBreak: "break-all",
          }}
        >
          raw script
        </a>
      </div>

      {loading && <p style={{ color: "var(--text-muted)" }}>Loading guide…</p>}
      {err && !loading && (
        <div className="callout-help" style={{ borderLeftColor: "var(--error)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Could not load this page</p>
          <p style={{ margin: "10px 0 0", color: "var(--text-muted)" }}>{err}</p>
          <p style={{ margin: "14px 0 0", fontSize: 14 }}>
            <a href={COMMUNITY_CLI_DEPLOY_DAGSTER_PLUS_BLOB_WEB} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
              Open deploy_to_dagster_plus.md on GitHub
            </a>
          </p>
        </div>
      )}
      {bodyMd.length > 0 && !err && (
        <div
          style={{
            padding: "22px 24px 28px",
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
          }}
        >
          <ExamplesMarkdown>{bodyMd}</ExamplesMarkdown>
        </div>
      )}
    </div>
  );
}
