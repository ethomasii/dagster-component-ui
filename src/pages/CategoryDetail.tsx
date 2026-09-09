import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { categoryLabel, categoryDescription } from "../lib/format";
import { componentId } from "../lib/componentId";
import { ComponentCard } from "../components/ComponentCard";
import type { ManifestComponent } from "../types";

/**
 * `/categories/:slug` — every component in one category as a filterable grid.
 *
 * Secondary filters:
 *   - `?q=<text>` free-text over id / name / description
 *   - `?vendor=<vendor>` narrow to a vendor cohort
 *   - `?validation=live|smoke|code|infra` narrow by validation tier
 *
 * Cards use the same `ComponentCard` as everywhere else in the app, so
 * `featured`, validation badges, and per-component metadata render
 * identically to the Home spotlight and search results.
 */
export function CategoryDetail() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const slug = rawSlug ? decodeURIComponent(rawSlug) : "";
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

  const inCategory = useMemo(
    () => components.filter((c) => (c.category ?? "uncategorized") === slug),
    [components, slug]
  );

  const vendorCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of inCategory) {
      const v = c.vendor?.trim();
      if (!v) continue;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [inCategory]);

  const validationCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of inCategory) {
      const v = c.validation?.level?.trim();
      if (!v) continue;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [inCategory]);

  const filtered = useMemo(() => {
    const q = qParam.trim().toLowerCase();
    return inCategory.filter((c) => {
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
  }, [inCategory, qParam, vendorParam, validationParam]);

  const sorted = useMemo(() => {
    // Same 8-signal ranking as Home spotlight so the top of the grid
    // matches customers' expectations for "which are the good ones."
    const lvlWeight = (l?: string) => l === "live" ? 3 : l === "smoke" ? 2 : l ? 1 : 0;
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

  if (!slug) return <p style={{ padding: 48 }}>Missing category slug.</p>;

  if (inCategory.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 64px" }}>
        <p style={{ margin: "0 0 8px" }}>
          <Link to="/categories" style={{ fontSize: 14, color: "var(--cyan)", textDecoration: "none" }}>
            ← Categories
          </Link>
        </p>
        <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, margin: "12px 0 8px" }}>
          {categoryLabel(slug)}
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          No components in this category — either the slug isn't a real category, or nothing has been tagged with it yet.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>
      <p style={{ margin: "0 0 8px" }}>
        <Link to="/categories" style={{ fontSize: 14, color: "var(--cyan)", textDecoration: "none" }}>
          ← Categories
        </Link>
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", margin: "12px 0 8px" }}>
        <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2 }}>
          {categoryLabel(slug)}
        </h1>
        <span style={{ fontSize: 14, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>
          {inCategory.length} component{inCategory.length === 1 ? "" : "s"}
        </span>
      </div>
      <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
        {categoryDescription(slug)}
      </p>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 24px", lineHeight: 1.5 }}>
        Filter below by vendor, validation tier, or free text — or open a specific component for its full schema and walkthrough. Manifest key: <code className="mono" style={{ fontSize: 12 }}>category: {slug}</code>.
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
            placeholder={`Filter ${inCategory.length} ${categoryLabel(slug).toLowerCase()} component${inCategory.length === 1 ? "" : "s"}`}
            aria-label={`Filter components in ${slug}`}
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
        Showing {sorted.length} of {inCategory.length}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {sorted.map((c) => (
          <ComponentCard key={componentId(c)} c={c} />
        ))}
      </div>
      {sorted.length === 0 ? (
        <p style={{ color: "var(--text-muted)", marginTop: 24 }}>
          No components match the current filter. Clear filters to see all {inCategory.length}.
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
