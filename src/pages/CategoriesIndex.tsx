import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCatalog } from "../context/CatalogContext";
import { categoryLabel } from "../lib/format";
import { componentId } from "../lib/componentId";
import { ComponentIcon } from "../components/ComponentIcon";
import type { ManifestComponent } from "../types";

/**
 * `/categories` — grid of every category with counts + a hero component preview.
 *
 * Mirrors `/vendors` in intent: pick your entry point, get a landing
 * page with the right subset. Category = manifest.category field
 * (`ai`, `transformation`, `integration`, `resource`, …); slug is the
 * raw category string. Every hero pick uses the same 8-signal scoring
 * as the Home spotlight (featured → validation.level → walkthrough → …)
 * so alphabetically-first components don't hijack the tile.
 */
export function CategoriesIndex() {
  const { components } = useCatalog();

  const catData = useMemo(() => {
    const byCat = new Map<string, ManifestComponent[]>();
    for (const c of components) {
      const cat = c.category ?? "uncategorized";
      const arr = byCat.get(cat) ?? [];
      arr.push(c);
      byCat.set(cat, arr);
    }
    const lvlWeight = (l?: string) =>
      l === "live" ? 3 : l === "smoke" ? 2 : l ? 1 : 0;
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
    const rows: { cat: string; count: number; hero: ManifestComponent; liveCount: number }[] = [];
    for (const [cat, arr] of byCat.entries()) {
      const sorted = [...arr].sort((a, b) => {
        const sa = score(a), sb = score(b);
        for (let i = 0; i < sa.length; i++) if (sb[i] !== sa[i]) return sb[i] - sa[i];
        return idHash(componentId(a)) - idHash(componentId(b));
      });
      rows.push({
        cat,
        count: arr.length,
        hero: sorted[0],
        liveCount: arr.filter((c) => c.validation?.level === "live").length,
      });
    }
    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [components]);

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
        Categories
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
        Browse by category
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 28px", maxWidth: 720, lineHeight: 1.5 }}>
        Every component in the registry maps to one category. Pick one to see the full list with per-vendor and validation filters, or use search across all categories from the header.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {catData.map(({ cat, count, hero, liveCount }) => (
          <Link
            key={cat}
            to={`/categories/${encodeURIComponent(cat)}`}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: 20,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              color: "var(--text)",
              textDecoration: "none",
              transition: "border-color 120ms ease, transform 120ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {categoryLabel(cat)}
              </h3>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-dim)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {count} component{count === 1 ? "" : "s"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
              }}
            >
              <ComponentIcon icon={hero.icon} size={20} title={hero.name ?? componentId(hero)} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {hero.name ?? componentId(hero)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                  Featured pick{hero.featured ? "" : " (auto-ranked)"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {liveCount > 0 ? (
                <span
                  style={{
                    fontSize: 11,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "rgba(20, 184, 166, 0.12)",
                    color: "var(--teal, #14b8a6)",
                    fontWeight: 600,
                    letterSpacing: 0.2,
                  }}
                >
                  {liveCount} live-validated
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
