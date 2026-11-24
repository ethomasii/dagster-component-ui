import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { componentId } from "../lib/componentId";
import { ComponentCard } from "../components/ComponentCard";
import type { ManifestComponent } from "../types";

/**
 * `/agentic` — every component tagged `agentic` in the manifest, across
 * whatever `category` they happen to live under.
 *
 * Unlike `/categories/:slug` (one manifest.category value), "agentic" is a
 * cross-cutting manifest.tags value: components that implement or directly
 * support an autonomous or semi-autonomous agent loop — MCP-aware tool-use
 * agents, agentic_pipeline, agent memory/card/review-queue infra, MCP tool
 * servers built for an agent to call, human-in-the-loop approval gates, and
 * the chat-platform (Slack/Teams) agent request/reply wiring. Deliberately
 * excludes single-shot LLM utilities (extractors, classifiers, embedders)
 * even where LLM-powered — most of those live under `category: "ai"` too,
 * which is why this view exists instead of just linking to that category.
 */
export function AgenticIndex() {
  const { components } = useCatalog();
  const [params, setParams] = useSearchParams();
  const qParam = params.get("q") ?? "";
  const vendorParam = params.get("vendor") ?? "";
  const validationParam = params.get("validation") ?? "";

  const setParam = (key: string, next: string) => {
    const p = new URLSearchParams(params);
    const t = next.trim();
    if (t) p.set(key, t); else p.delete(key);
    setParams(p, { replace: true });
  };

  const agentic = useMemo(
    () => components.filter((c) => (c.tags ?? []).includes("agentic")),
    [components]
  );

  const vendorCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of agentic) {
      const v = c.vendor?.trim();
      if (!v) continue;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [agentic]);

  const validationCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of agentic) {
      const v = c.validation?.level?.trim();
      if (!v) continue;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [agentic]);

  const filtered = useMemo(() => {
    const q = qParam.trim().toLowerCase();
    return agentic.filter((c) => {
      if (vendorParam && c.vendor !== vendorParam) return false;
      if (validationParam && c.validation?.level !== validationParam) return false;
      if (!q) return true;
      const haystack = [
        componentId(c),
        c.name ?? "",
        c.description ?? "",
        ...(c.keywords ?? []),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [agentic, qParam, vendorParam, validationParam]);

  const sorted = useMemo(() => {
    // Same 8-signal ranking as every other catalog grid in the app.
    const lvlWeight = (l?: string) => (l === "live" ? 3 : l === "smoke" ? 2 : l ? 1 : 0);
    const ts = (c: ManifestComponent) => {
      const raw = c.validation?.last_validated ?? "";
      const p = raw ? Date.parse(raw) : NaN;
      return Number.isFinite(p) ? p : 0;
    };
    const idHash = (id: string) => {
      let h = 5381;
      for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
      return h >>> 0;
    };
    const score = (c: ManifestComponent): number[] => [
      c.featured ? 1 : 0,
      lvlWeight(c.validation?.level),
      c.validation?.evidence ? 1 : 0,
      ts(c),
      c.agent_hints && Object.keys(c.agent_hints).length > 0 ? 1 : 0,
      c.keywords?.length ?? 0,
      (c.description ?? "").split(/\s+/).filter(Boolean).length,
    ];
    return [...filtered].sort((a, b) => {
      const sa = score(a), sb = score(b);
      for (let i = 0; i < sa.length; i++) if (sb[i] !== sa[i]) return sb[i] - sa[i];
      return idHash(componentId(a)) - idHash(componentId(b));
    });
  }, [filtered]);

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
        Agentic
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", margin: "0 0 8px" }}>
        <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2 }}>
          Agentic components
        </h1>
        <span style={{ fontSize: 14, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>
          {agentic.length} component{agentic.length === 1 ? "" : "s"}
        </span>
      </div>
      <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
        Everything that implements or directly supports an autonomous or semi-autonomous agent
        loop: MCP-aware tool-use agents (LiteLLM, OpenAI, Anthropic, Gemini, Vercel AI Gateway,
        Snowflake Cortex), <code className="mono" style={{ fontSize: 13 }}>agentic_pipeline</code>,
        agent memory + card registry + review queue, MCP tool servers built for an agent to call
        (Dagster, GitHub, Linear, Notion, OpenAPI, Slack, Teams, …), human-in-the-loop approval
        gates, and the Slack/Teams agent request-and-reply sensors and sinks.
      </p>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 24px", lineHeight: 1.5 }}>
        This is narrower than browsing <Link to="/categories/ai" style={{ color: "var(--cyan)" }}>category: ai</Link> directly —
        that category also holds single-shot LLM utilities (extractors, classifiers, embedders)
        that don't run an agent loop. Manifest key: <code className="mono" style={{ fontSize: 12 }}>tags: ["agentic", …]</code>.
      </p>

      <form
        onSubmit={(e) => e.preventDefault()}
        style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 20 }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          flex: "1 1 220px", minWidth: 0,
          padding: "10px 14px", borderRadius: 10,
          border: "1px solid var(--border)", background: "var(--bg-card)",
        }}>
          <Search size={18} strokeWidth={2} style={{ color: "var(--text-dim)", flexShrink: 0 }} aria-hidden />
          <input
            type="search"
            value={qParam}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder={`Filter ${agentic.length} agentic components`}
            aria-label="Filter agentic components"
            style={{
              flex: 1, minWidth: 0,
              border: "none", background: "transparent",
              color: "var(--text)", fontSize: 14, outline: "none",
            }}
          />
        </div>
        {(qParam || vendorParam || validationParam) ? (
          <button
            type="button"
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
            style={{
              padding: "10px 14px", borderRadius: 10,
              border: "1px solid var(--border)", background: "var(--bg-elevated)",
              color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Clear filters
          </button>
        ) : null}
      </form>

      {(vendorCounts.length > 0 || validationCounts.length > 0) ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 24 }}>
          {vendorCounts.length > 0 ? (
            <FacetBlock
              label="Vendor"
              options={vendorCounts}
              selected={vendorParam}
              onSelect={(v) => setParam("vendor", v === vendorParam ? "" : v)}
            />
          ) : null}
          {validationCounts.length > 0 ? (
            <FacetBlock
              label="Validation"
              options={validationCounts}
              selected={validationParam}
              onSelect={(v) => setParam("validation", v === validationParam ? "" : v)}
            />
          ) : null}
        </div>
      ) : null}

      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 12px" }}>
        Showing {sorted.length} of {agentic.length}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {sorted.map((c) => (
          <ComponentCard key={componentId(c)} c={c} />
        ))}
      </div>
      {sorted.length === 0 ? (
        <p style={{ color: "var(--text-muted)", marginTop: 24 }}>
          No components match the current filter. Clear filters to see all {agentic.length}.
        </p>
      ) : null}
    </div>
  );
}

function FacetBlock({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: [string, number][];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div style={{ minWidth: 200 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
        color: "var(--text-dim)", marginBottom: 8,
      }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(([v, n]) => {
          const active = selected === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onSelect(v)}
              style={{
                padding: "5px 10px", borderRadius: 999,
                border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`,
                background: active ? "rgba(6, 182, 212, 0.12)" : "var(--bg-card)",
                color: active ? "var(--cyan)" : "var(--text-muted)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {v} <span style={{ opacity: 0.6 }}>· {n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
