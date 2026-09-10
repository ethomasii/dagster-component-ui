import { useState } from "react";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";

/**
 * Floating DCC Agent widget mounted in Layout — a chat-style popup in
 * the bottom-right corner, available on every page.
 *
 *   closed → FAB (sparkles button) in bottom-right
 *   open   → fixed-position panel ~400×600
 *   expanded → same panel scaled up ~700×80vh
 *
 * Submits intent to /api/dcc-agent (see api/dcc-agent.ts) and renders
 * the ranked recommendations + install commands + defs.yaml snippets,
 * optionally with a full project-scaffold shell script.
 */

type Recommendation = {
  component_name: string;
  why: string;
  category: string;
  install_command: string;
  defs_snippet: string;
};

type AgentResponse = {
  recommendations: Recommendation[];
  assumptions: string[];
  shell_script?: string;
  meta?: {
    model: string;
    input_tokens: number;
    output_tokens: number;
    manifest_total: number;
    candidates_sent?: number;
    playbooks_matched?: string[];
    schemas_fetched?: number;
    readmes_fetched?: number;
    walkthroughs_fetched?: number;
    readme_searches?: number;
  };
};

const STARTER_PROMPTS = [
  "Sync Salesforce contacts into BigQuery every 6 hours with schema validation",
  "Ingest CSV drops from S3 into DuckDB, deduped by primary key",
  "Score customer churn nightly with XGBoost, write predictions to Postgres",
  "Run a dbt transformation on Snowflake with freshness alerts",
];

export function DccAgentWidget() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [intent, setIntent] = useState("");
  const [includeShell, setIncludeShell] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AgentResponse | null>(null);

  async function submit(text?: string) {
    const q = (text ?? intent).trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const r = await fetch("/api/dcc-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: q,
          options: { include_shell_script: includeShell },
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      setAnswer(data as AgentResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setIntent("");
    setAnswer(null);
    setError(null);
  }

  // ── Closed: FAB ──────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ask the DCC Agent"
        aria-label="Ask the DCC Agent"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 18px",
          fontSize: 14,
          fontWeight: 600,
          borderRadius: 999,
          border: "none",
          background: "linear-gradient(135deg, var(--accent) 0%, #5b21b6 100%)",
          color: "#fff",
          cursor: "pointer",
          boxShadow: "0 10px 25px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        <Sparkles size={16} aria-hidden />
        <span>Ask DCC</span>
      </button>
    );
  }

  // The remainder renders the open panel.

  // ── Open: floating panel ─────────────────────────────────────────
  const panelWidth = expanded ? "min(700px, 92vw)" : "min(420px, 92vw)";
  const panelHeight = expanded ? "min(80vh, 720px)" : "min(620px, 80vh)";

  return (
    <div
      role="dialog"
      aria-label="DCC Agent"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 50,
        width: panelWidth,
        height: panelHeight,
        display: "flex",
        flexDirection: "column",
        borderRadius: 16,
        border: "1px solid var(--border-strong)",
        background: "var(--bg-card)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px",
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(180deg, rgba(6, 182, 212, 0.06), transparent)",
        }}
      >
        <Sparkles size={16} color="var(--cyan)" aria-hidden />
        <div style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>DCC Agent</div>
        {answer && (
          <button
            type="button"
            onClick={reset}
            title="New question"
            style={iconBtnStyle}
          >
            <span style={{ fontSize: 11 }}>New</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          title={expanded ? "Collapse" : "Expand"}
          style={iconBtnStyle}
        >
          {expanded ? <Minimize2 size={13} aria-hidden /> : <Maximize2 size={13} aria-hidden />}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Close"
          style={iconBtnStyle}
        >
          <X size={14} aria-hidden />
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 14px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {!answer && !loading && !error && (
          <>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
              Describe what you want to build. The agent picks the DCC components that fit,
              generates install commands + <code>defs.yaml</code> snippets, and can produce a full
              project-scaffold shell script.
            </p>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>
                Try one:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setIntent(p);
                      void submit(p);
                    }}
                    style={starterChipStyle}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13 }}>
            <Loader2 size={14} className="spin" aria-hidden /> Thinking …
          </div>
        )}

        {error && (
          <div className="callout-help" style={{ borderLeftColor: "var(--error)" }}>
            <p style={{ margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <AlertCircle size={14} aria-hidden /> Agent error
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{error}</p>
          </div>
        )}

        {answer && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {answer.assumptions?.length > 0 && (
              <section>
                <div style={sectionTitleStyle}>Assumptions</div>
                <ul style={{ margin: "6px 0 0 18px", padding: 0, lineHeight: 1.55, fontSize: 12 }}>
                  {answer.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <div style={sectionTitleStyle}>
                Recommended ({answer.recommendations.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                {answer.recommendations.map((r) => (
                  <RecommendationCard key={r.component_name} rec={r} />
                ))}
              </div>
            </section>

            {answer.shell_script && (
              <section>
                <div style={sectionTitleStyle}>Project scaffold script</div>
                <CodeBlock code={answer.shell_script} lang="bash" />
              </section>
            )}

            {answer.meta && (
              <p style={{ fontSize: 10, color: "var(--text-dim, var(--text-muted))", margin: 0 }}>
                {answer.meta.model} · in {answer.meta.input_tokens} tok · out{" "}
                {answer.meta.output_tokens} tok · catalog {answer.meta.manifest_total}
                {answer.meta.candidates_sent != null &&
                  ` (top ${answer.meta.candidates_sent})`}
                {(answer.meta.schemas_fetched ?? 0) > 0 &&
                  ` · ${answer.meta.schemas_fetched} schema${answer.meta.schemas_fetched === 1 ? "" : "s"}`}
                {(answer.meta.readmes_fetched ?? 0) > 0 &&
                  ` · ${answer.meta.readmes_fetched} README${answer.meta.readmes_fetched === 1 ? "" : "s"}`}
                {(answer.meta.walkthroughs_fetched ?? 0) > 0 &&
                  ` · ${answer.meta.walkthroughs_fetched} walkthrough${answer.meta.walkthroughs_fetched === 1 ? "" : "s"}`}
                {(answer.meta.readme_searches ?? 0) > 0 &&
                  ` · ${answer.meta.readme_searches} README search${answer.meta.readme_searches === 1 ? "" : "es"}`}
                {answer.meta.playbooks_matched && answer.meta.playbooks_matched.length > 0 &&
                  ` · playbook: ${answer.meta.playbooks_matched.join(", ")}`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        style={{
          borderTop: "1px solid var(--border)",
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="e.g. Sync Salesforce contacts into BigQuery every 6 hours"
          rows={2}
          maxLength={2000}
          disabled={loading}
          style={{
            width: "100%",
            padding: "8px 10px",
            fontSize: 13,
            fontFamily: "inherit",
            lineHeight: 1.5,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text)",
            resize: "none",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--text-muted)",
              cursor: "pointer",
              flex: 1,
            }}
          >
            <input
              type="checkbox"
              checked={includeShell}
              onChange={(e) => setIncludeShell(e.target.checked)}
              disabled={loading}
            />
            Include scaffold script
          </label>
          <button
            type="submit"
            disabled={!intent.trim() || loading}
            style={{
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              cursor: intent.trim() && !loading ? "pointer" : "not-allowed",
              background:
                intent.trim() && !loading
                  ? "linear-gradient(135deg, var(--accent) 0%, #5b21b6 100%)"
                  : "var(--bg-elevated)",
              color: intent.trim() && !loading ? "#fff" : "var(--text-muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {loading ? (
              <Loader2 size={12} className="spin" aria-hidden />
            ) : (
              <Send size={12} aria-hidden />
            )}
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 10,
        background: "var(--bg-elevated)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 4,
        }}
      >
        <a
          href={`/c/${encodeURIComponent(rec.component_name)}`}
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
            fontSize: 13,
            color: "var(--cyan)",
            textDecoration: "none",
          }}
        >
          {rec.component_name}
        </a>
        <span
          style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 999,
            background: "rgba(20, 184, 166, 0.14)",
            color: "var(--teal, #14b8a6)",
            fontWeight: 600,
            letterSpacing: 0.2,
            textTransform: "uppercase",
          }}
        >
          {rec.category}
        </span>
      </div>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
        {rec.why}
      </p>
      <div style={{ marginBottom: 6 }}>
        <div style={mutedLabelStyle}>Install</div>
        <CodeBlock code={rec.install_command} lang="bash" small />
      </div>
      <div>
        <div style={mutedLabelStyle}>defs.yaml</div>
        <CodeBlock code={rec.defs_snippet} lang="yaml" small />
      </div>
    </div>
  );
}

function CodeBlock({ code, lang, small = false }: { code: string; lang: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }
  return (
    <div style={{ position: "relative" }}>
      <pre
        style={{
          margin: 0,
          padding: small ? "8px 10px" : "10px 12px",
          fontSize: small ? 11 : 12.5,
          fontFamily: "var(--font-mono, monospace)",
          // Explicit dark surface + light text so it's readable in both
          // light and dark themes. Site's --code-bg maps to the theme's
          // elevated bg which is too close to --text-muted for code to
          // read cleanly.
          background: "#0f172a",
          color: "#e2e8f0",
          border: "1px solid rgba(148, 163, 184, 0.15)",
          borderRadius: 6,
          overflowX: "auto",
          lineHeight: 1.5,
          maxHeight: small ? 140 : 220,
          whiteSpace: "pre",
        }}
      >
        <code data-lang={lang}>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        title="Copy"
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          padding: "3px 5px",
          borderRadius: 5,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(15, 23, 42, 0.85)",
          color: "#e2e8f0",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          fontSize: 10,
        }}
      >
        {copied ? <Check size={10} aria-hidden /> : <Copy size={10} aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  padding: 4,
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: "var(--text-muted)",
};

const mutedLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text-muted)",
  marginBottom: 3,
  fontWeight: 600,
};

const starterChipStyle: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  textAlign: "left",
  lineHeight: 1.4,
};
