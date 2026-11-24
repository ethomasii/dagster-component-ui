import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { componentId } from "../lib/componentId";
import { ComponentCard } from "../components/ComponentCard";
import { AGENTIC_GROUPS, ALL_GROUPED_IDS } from "../data/agenticGroups";
import { PageEyebrow } from "../components/PageEyebrow";
import type { ManifestComponent } from "../types";

/** One accent per group section, cycled by index -- gives each of the 7 groups a distinct,
 *  at-a-glance identity (dot + a faint tinted card wash) instead of 7 visually identical
 *  stacked blocks. Picked to read clearly in both themes, not tied to any one group's
 *  "meaning" (there's no natural color taxonomy for pipelines vs. agents vs. tool servers). */
const GROUP_ACCENTS = ["#8b5cf6", "#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#60a5fa", "#fb923c"];

/**
 * `/agentic` — every component tagged `agentic` in the manifest, grouped into named
 * sub-categories (Pipelines, Agents, MCP tool servers, Approval & review, Memory &
 * registry, Chat platform wiring, Skills & resources) rather than one flat 57-card grid.
 *
 * Grouping is a UI-only curation (`src/data/agenticGroups.ts`) layered on top of the
 * manifest's flat `agentic` tag — the tag says "this supports an agent loop," the groups
 * say what kind. An "Other agentic" catch-all covers anything tagged but not yet triaged
 * into a named group, so nothing is silently dropped as new components get tagged.
 */
export function AgenticIndex() {
  const { components } = useCatalog();
  const [params, setParams] = useSearchParams();
  const qParam = params.get("q") ?? "";
  const groupParam = params.get("group") ?? "";

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

  const byId = useMemo(() => {
    const m = new Map<string, ManifestComponent>();
    for (const c of agentic) m.set(componentId(c), c);
    return m;
  }, [agentic]);

  const sections = useMemo(() => {
    const named = AGENTIC_GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      description: g.description,
      items: g.componentIds.map((id) => byId.get(id)).filter((c): c is ManifestComponent => Boolean(c)),
    }));
    const other = agentic.filter((c) => !ALL_GROUPED_IDS.has(componentId(c)));
    if (other.length) {
      named.push({ id: "other", label: "Other agentic", description: "Tagged `agentic` but not yet triaged into a named group above.", items: other });
    }
    return named;
  }, [byId, agentic]);

  const matchesQuery = (c: ManifestComponent, q: string): boolean => {
    if (!q) return true;
    const haystack = [componentId(c), c.name ?? "", c.description ?? "", ...(c.keywords ?? [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  };

  const visibleSections = useMemo(() => {
    const q = qParam.trim().toLowerCase();
    return sections
      .filter((s) => !groupParam || s.id === groupParam)
      .map((s) => ({ ...s, items: s.items.filter((c) => matchesQuery(c, q)) }))
      .filter((s) => s.items.length > 0);
  }, [sections, qParam, groupParam]);

  const visibleCount = visibleSections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>
      <PageEyebrow>Agentic</PageEyebrow>
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
        loop, grouped by what kind — pipelines, agents, MCP tool servers an agent calls,
        human-in-the-loop approval, memory/registry, and the chat-platform wiring that triggers
        a run and posts its reply.
      </p>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 24px", lineHeight: 1.5 }}>
        Narrower than browsing <Link to="/categories/ai" style={{ color: "var(--cyan)" }}>category: ai</Link> directly —
        that category also holds single-shot LLM utilities that don't run an agent loop.
        Manifest key: <code className="mono" style={{ fontSize: 12 }}>tags: ["agentic", …]</code>.
      </p>

      <form
        onSubmit={(e) => e.preventDefault()}
        style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}
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
        {(qParam || groupParam) ? (
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 28 }}>
        {sections.map((s) => {
          const active = groupParam === s.id;
          return (
            <button
              key={s.id}
              type="button"
              title={s.description}
              onClick={() => setParam("group", active ? "" : s.id)}
              style={{
                padding: "5px 10px", borderRadius: 999,
                border: `1px solid ${active ? "var(--cyan)" : "var(--border)"}`,
                background: active ? "rgba(6, 182, 212, 0.12)" : "var(--bg-card)",
                color: active ? "var(--cyan)" : "var(--text-muted)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.label} <span style={{ opacity: 0.6 }}>· {s.items.length}</span>
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 20px" }}>
        Showing {visibleCount} of {agentic.length}
      </p>

      {visibleSections.map((s, i) => {
        const accent = GROUP_ACCENTS[i % GROUP_ACCENTS.length];
        return (
          <section
            key={s.id}
            style={{
              marginBottom: 28,
              padding: "26px 28px",
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: `linear-gradient(165deg, ${accent}14 0%, var(--bg-card) 38%)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: accent, flexShrink: 0 }} aria-hidden />
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>
                {s.label}
              </h2>
              <span style={{ fontSize: 13, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>
                {s.items.length}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 18px", maxWidth: 760, lineHeight: 1.5 }}>
              {s.description}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {s.items.map((c) => (
                <ComponentCard key={componentId(c)} c={c} />
              ))}
            </div>
          </section>
        );
      })}
      {visibleSections.length === 0 ? (
        <p style={{ color: "var(--text-muted)", marginTop: 24 }}>
          No components match the current filter. Clear filters to see all {agentic.length}.
        </p>
      ) : null}
    </div>
  );
}
