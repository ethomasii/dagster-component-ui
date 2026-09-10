import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, AlertCircle } from "lucide-react";

/**
 * `/ask` — DCC Agent chat interface.
 *
 * User types a natural-language intent ("sync Salesforce contacts to
 * BigQuery every 6 hours"); the page posts to /api/dcc-agent, which
 * asks Claude to pick DCC components + generate install commands +
 * defs.yaml snippets, and optionally a full project-shell shell script.
 *
 * The API endpoint lives in dagster-component-ui/api/dcc-agent.ts and
 * runs as a Vercel serverless function.
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
  };
};

const SAMPLE_INTENTS = [
  "Sync Salesforce contacts into BigQuery every 6 hours with schema validation",
  "Run a dbt transformation on Snowflake and email alerts on freshness failures",
  "Ingest CSV drops from S3 into DuckDB, deduped by primary key",
  "Score customer churn nightly with an XGBoost model and write predictions back to Postgres",
];

export function AskPage() {
  const [intent, setIntent] = useState("");
  const [includeShell, setIncludeShell] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AgentResponse | null>(null);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!intent.trim() || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const r = await fetch("/api/dcc-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: intent.trim(),
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

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 12px" }}>
        <Sparkles size={26} color="var(--cyan)" aria-hidden />
        <h1
          style={{
            fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Ask the DCC Agent
        </h1>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 15, margin: "0 0 24px", lineHeight: 1.55 }}>
        Describe what you want to build. The agent picks the DCC components that fit, generates the
        install commands + <code>defs.yaml</code> snippet, and can produce a full project-shell shell
        script.
      </p>

      <form onSubmit={submit} style={{ marginBottom: 32 }}>
        <textarea
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="e.g. Sync Salesforce contacts into BigQuery every 6 hours with schema validation"
          rows={4}
          maxLength={2000}
          style={{
            width: "100%",
            padding: "14px 16px",
            fontSize: 15,
            fontFamily: "inherit",
            lineHeight: 1.5,
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text)",
            resize: "vertical",
            boxSizing: "border-box",
          }}
          disabled={loading}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={includeShell}
              onChange={(e) => setIncludeShell(e.target.checked)}
              disabled={loading}
            />
            Include full project-scaffold shell script
          </label>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>⌘+Enter to submit</span>
          <button
            type="submit"
            disabled={!intent.trim() || loading}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              cursor: intent.trim() && !loading ? "pointer" : "not-allowed",
              background:
                intent.trim() && !loading ? "var(--cyan)" : "var(--surface-elevated, #e5e7eb)",
              color: intent.trim() && !loading ? "#000" : "var(--text-muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="spin" aria-hidden /> Thinking …
              </>
            ) : (
              <>
                <Sparkles size={14} aria-hidden /> Ask
              </>
            )}
          </button>
        </div>
        {!intent && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
              Try one of these:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SAMPLE_INTENTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setIntent(s)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {error && (
        <div className="callout-help" style={{ borderLeftColor: "var(--error)" }}>
          <p style={{ margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={16} aria-hidden /> Agent error
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-muted)" }}>{error}</p>
        </div>
      )}

      {answer && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {answer.assumptions?.length > 0 && (
            <section>
              <h3 style={sectionTitle}>Assumptions</h3>
              <ul style={{ margin: "8px 0 0 20px", padding: 0, lineHeight: 1.6, fontSize: 14 }}>
                {answer.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 style={sectionTitle}>
              Recommended components ({answer.recommendations.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
              {answer.recommendations.map((r) => (
                <RecommendationCard key={r.component_name} rec={r} />
              ))}
            </div>
          </section>

          {answer.shell_script && (
            <section>
              <h3 style={sectionTitle}>Project scaffold script</h3>
              <CodeBlock code={answer.shell_script} lang="bash" />
            </section>
          )}

          {answer.meta && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "16px 0 0" }}>
              {answer.meta.model} · in {answer.meta.input_tokens} tok · out{" "}
              {answer.meta.output_tokens} tok · catalog {answer.meta.manifest_total}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 16,
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 6,
        }}
      >
        <a
          href={`/c/${encodeURIComponent(rec.component_name)}`}
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--cyan)",
            textDecoration: "none",
          }}
        >
          {rec.component_name}
        </a>
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 999,
            background: "rgba(20, 184, 166, 0.12)",
            color: "var(--teal, #14b8a6)",
            fontWeight: 600,
            letterSpacing: 0.2,
            textTransform: "uppercase",
          }}
        >
          {rec.category}
        </span>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.55 }}>
        {rec.why}
      </p>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>
          Install
        </div>
        <CodeBlock code={rec.install_command} lang="bash" />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>
          defs.yaml
        </div>
        <CodeBlock code={rec.defs_snippet} lang="yaml" />
      </div>
    </div>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
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
          padding: "10px 12px",
          fontSize: 12.5,
          fontFamily: "var(--font-mono, monospace)",
          background: "var(--code-bg, #0b0d12)",
          color: "var(--code-text, #e5e7eb)",
          borderRadius: 8,
          overflowX: "auto",
          lineHeight: 1.5,
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
          top: 6,
          right: 6,
          padding: "4px 6px",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.05)",
          color: "#e5e7eb",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
        }}
      >
        {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  color: "var(--text-muted)",
  margin: 0,
};
