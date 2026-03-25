import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ManifestComponent } from "../types";
import { loadManifest } from "../data/loadManifest";
import { SearchPalette } from "../components/SearchPalette";
import { ComponentCard } from "../components/ComponentCard";
import { matchesQuery, sortByRelevance } from "../lib/search";
import { categoryLabel, formatDate } from "../lib/format";
import { countDistinctBrandIntegrations, newestComponents } from "../lib/catalogStats";
import { countVerificationBreakdown } from "../lib/verification";
import { pipInstallDagsterCore } from "../lib/registryRequirements";
import { PopularCategoryCard } from "../components/PopularCategoryCard";
import { CopyButton } from "../components/CopyButton";

const PAGE_SIZE = 48;

/** Ecosystem tiles: each maps to a primary category. */
const ECOSYSTEM_TILES: { slug: string; title: string; blurb: string }[] = [
  {
    slug: "ingestion",
    title: "Databases & warehouses",
    blurb: "PostgreSQL, MySQL, warehouses, and database-backed ingestion.",
  },
  {
    slug: "integration",
    title: "Cloud platforms",
    blurb: "AWS, GCP, Azure, Databricks, Glue, BigQuery, and similar.",
  },
  {
    slug: "ai",
    title: "AI & ML",
    blurb: "LLMs, embeddings, LangChain, and ML-adjacent enrichment.",
  },
  {
    slug: "analytics",
    title: "Analytics & processing",
    blurb: "Transforms, segmentation, attribution, and warehouse analytics.",
  },
];

const USE_CASES: { slug: string; title: string; blurb: string }[] = [
  {
    slug: "ingestion",
    title: "Data ingestion",
    blurb: "Cloud storage, messaging, APIs, and databases into your warehouse.",
  },
  {
    slug: "analytics",
    title: "Analytics & BI",
    blurb: "Segmentation, attribution, experimentation, and warehouse-native analytics.",
  },
  {
    slug: "ai",
    title: "AI & ML",
    blurb: "LLMs, embeddings, LangChain, and model-adjacent enrichment assets.",
  },
  {
    slug: "sensor",
    title: "Sensors & alerts",
    blurb: "Event-driven runs, monitors, and notifications.",
  },
  {
    slug: "integration",
    title: "Platform integrations",
    blurb: "Databricks, Glue, BigQuery, ADF, and other orchestrated platforms.",
  },
  {
    slug: "infrastructure",
    title: "Infrastructure",
    blurb: "Terraform, CloudFormation, Helm, and deployment automation.",
  },
];

export function Home() {
  const [params, setParams] = useSearchParams();
  const qParam = params.get("q") ?? "";
  const catParam = params.get("category") ?? "";
  const browseAll = params.get("browse") === "all";

  /** Discovery-first home: full catalog only after search / filter / browse-all. */
  const explorationActive = Boolean(qParam || catParam || browseAll);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [components, setComponents] = useState<ManifestComponent[]>([]);
  const [manifestMeta, setManifestMeta] = useState<{
    last_updated: string;
    repo: string;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [localQ, setLocalQ] = useState(qParam);

  useEffect(() => {
    setLocalQ(qParam);
  }, [qParam]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await loadManifest();
        if (cancelled) return;
        setComponents(m.components);
        setManifestMeta({ last_updated: m.last_updated, repo: m.repository });
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load data");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of components) {
      const cat = c.category ?? "uncategorized";
      m.set(cat, (m.get(cat) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [components]);

  const topCategories = useMemo(() => categoryCounts.slice(0, 6), [categoryCounts]);

  const integrationBrands = useMemo(
    () => countDistinctBrandIntegrations(components),
    [components]
  );

  const newestInCatalog = useMemo(() => newestComponents(components, 6), [components]);

  const trustBreakdown = useMemo(() => countVerificationBreakdown(components), [components]);

  const popularCategorySamples = useMemo(() => {
    const byCat = new Map<string, ManifestComponent>();
    for (const c of components) {
      const cat = c.category ?? "uncategorized";
      if (!byCat.has(cat)) byCat.set(cat, c);
    }
    return byCat;
  }, [components]);

  /** One stable pick per top category for the landing spotlight (highlights, not the full index). */
  const spotlight = useMemo(() => {
    if (!components.length) return [];
    const byCat = new Map<string, ManifestComponent[]>();
    for (const c of components) {
      const cat = c.category ?? "uncategorized";
      const arr = byCat.get(cat) ?? [];
      arr.push(c);
      byCat.set(cat, arr);
    }
    for (const arr of byCat.values()) {
      arr.sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
    }
    const topCats = categoryCounts.slice(0, 8).map(([c]) => c);
    return topCats
      .map((cat) => byCat.get(cat)?.[0])
      .filter((c): c is ManifestComponent => Boolean(c));
  }, [components, categoryCounts]);

  const filtered = useMemo(() => {
    let list = components;
    if (catParam) list = list.filter((c) => c.category === catParam);
    list = list.filter((c) => matchesQuery(c, qParam));
    return sortByRelevance(list, qParam);
  }, [components, catParam, qParam]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [qParam, catParam, browseAll]);

  const visiblePage = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );
  const hasMore = visibleCount < filtered.length;

  const onSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const next = new URLSearchParams(params);
      if (localQ) next.set("q", localQ);
      else next.delete("q");
      next.delete("browse");
      setParams(next);
    },
    [localQ, params, setParams]
  );

  const setCategory = useCallback(
    (cat: string) => {
      const next = new URLSearchParams(params);
      if (cat) next.set("category", cat);
      else next.delete("category");
      next.delete("browse");
      setParams(next);
    },
    [params, setParams]
  );

  const setBrowseAll = useCallback(() => {
    const next = new URLSearchParams(params);
    next.set("browse", "all");
    next.delete("category");
    next.delete("q");
    setLocalQ("");
    setParams(next);
  }, [params, setParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loadError) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
        <p>{loadError}</p>
        <p style={{ fontSize: 14 }}>Ensure manifest.json is in /public and run the dev server.</p>
      </div>
    );
  }

  const total = components.length;
  const catCount = categoryCounts.length;

  return (
    <>
      <SearchPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        components={components}
      />

      <section style={{ padding: "48px 24px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--cyan)",
            margin: "0 0 12px",
          }}
        >
          Community library
        </p>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 2.75rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            margin: "0 0 16px",
            lineHeight: 1.15,
            maxWidth: 720,
          }}
        >
          Find the perfect{" "}
          <span style={{ color: "var(--accent-bright)" }}>Dagster components</span> for your
          pipelines
        </h1>
        <p style={{ fontSize: 17, color: "var(--text-muted)", maxWidth: 720, margin: "0 0 12px" }}>
          Discover{" "}
          <strong style={{ color: "var(--text)" }}>{total || "—"}</strong> templates across{" "}
          <strong style={{ color: "var(--text)" }}>{catCount || "—"}</strong> categories and{" "}
          <strong style={{ color: "var(--text)" }}>{integrationBrands || "—"}</strong> distinct{" "}
          <strong>technology integrations</strong> (branded SaaS &amp; data tools via{" "}
          <span className="mono">si:*</span> icons). Each template ships with YAML +{" "}
          <span className="mono">schema.json</span> so you can wire assets with clear metadata—not a
          coarse provider-only bundle.
        </p>
        <p style={{ fontSize: 15, color: "var(--text-dim)", maxWidth: 720, margin: "0 0 28px" }}>
          Community-maintained library · YAML + <span className="mono">schema.json</span> metadata.
        </p>

        <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              flex: "1 1 320px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid var(--border-strong)",
              background: "var(--bg-card)",
            }}
          >
            <span style={{ color: "var(--text-dim)", fontSize: 18 }} aria-hidden>
              ⌕
            </span>
            <input
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Search components, tags, integrations…"
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                color: "var(--text)",
                fontSize: 15,
                outline: "none",
              }}
              aria-label="Search components"
            />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-muted)",
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 6,
              }}
            >
              ⌘K
            </button>
          </div>
          <button
            type="submit"
            style={{
              padding: "12px 22px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, var(--accent) 0%, #5b21b6 100%)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Search
          </button>
        </form>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 14,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px 40px",
        }}
      >
        <StatBox value={total ? String(total) : "—"} label="Templates" hint="Total components" />
        <StatBox value={catCount ? String(catCount) : "—"} label="Categories" hint="Functional groups" />
        <StatBox
          value={integrationBrands ? String(integrationBrands) : "—"}
          label="Tech integrations"
          hint="Distinct branded tools (si: icons)"
        />
        <StatBox
          value={
            trustBreakdown.total
              ? `${trustBreakdown.withPositiveSignal}/${trustBreakdown.total}`
              : "—"
          }
          label="Trust signals"
          hint="CI, manual, or community OK (manifest)"
        />
        <StatBox
          value={trustBreakdown.knownIssues > 0 ? String(trustBreakdown.knownIssues) : "0"}
          label="Known issues"
          hint="Flagged in manifest"
        />
        <StatBox
          value={manifestMeta ? formatDate(manifestMeta.last_updated) : "—"}
          label="Catalog updated"
          hint="Manifest refresh"
        />
      </section>

      <p
        style={{
          fontSize: 14,
          color: "var(--text-muted)",
          maxWidth: 720,
          margin: "0 auto 8px",
          padding: "0 24px",
          lineHeight: 1.55,
        }}
      >
        Most listings are community templates without an independent test guarantee. Each component page shows
        verification when the manifest records CI, manual checks, or community signals—otherwise treat as{" "}
        <strong style={{ color: "var(--text)" }}>unverified</strong>. There is no in-app review system yet; use{" "}
        <strong style={{ color: "var(--text)" }}>Report issue</strong> on a component to leave feedback on GitHub.
      </p>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: 0 }}>
            Popular categories
          </h2>
          <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
            Most templates per category — quick entry points by workload.
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {topCategories.map(([cat, n]) => (
            <PopularCategoryCard
              key={cat}
              category={cat}
              count={n}
              sample={popularCategorySamples.get(cat)}
              active={catParam === cat}
              onSelect={() => setCategory(catParam === cat ? "" : cat)}
            />
          ))}
        </div>
      </section>

      {!explorationActive && newestInCatalog.length > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: 0 }}>
              New in the catalog
            </h2>
            <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
              Latest entries in the manifest (often appended last)
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {newestInCatalog.map((c, i) => (
              <ComponentCard key={c.id ?? `new-${i}`} c={c} />
            ))}
          </div>
        </section>
      )}

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 40px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 8px" }}>
          Browse by ecosystem
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px", maxWidth: 640 }}>
          Jump straight into databases, cloud, AI, analytics, and more—then search or filter from there.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {ECOSYSTEM_TILES.map((u) => (
            <button
              key={u.slug}
              type="button"
              onClick={() => setCategory(u.slug)}
              style={{
                textAlign: "left",
                padding: 20,
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "linear-gradient(165deg, var(--bg-card) 0%, rgba(34, 211, 238, 0.05) 100%)",
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{u.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>{u.blurb}</div>
            </button>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 48px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 16px" }}>
          More use cases
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {USE_CASES.map((u) => (
            <button
              key={u.slug}
              type="button"
              onClick={() => setCategory(u.slug)}
              style={{
                textAlign: "left",
                padding: 18,
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{u.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>
                {u.blurb}
              </div>
            </button>
          ))}
        </div>
      </section>

      {!explorationActive && total > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 32px" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 12px" }}>
            Ready to get started?
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 12px" }}>
            Install Dagster and Components from PyPI (then add templates from this catalog — see any
            component page for copy commands).
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              maxWidth: 720,
            }}
          >
            <code className="mono" style={{ fontSize: 13, color: "var(--text-muted)", flex: "1 1 200px" }}>
              {pipInstallDagsterCore()}
            </code>
            <CopyButton text={pipInstallDagsterCore()} label="Copy" />
          </div>
        </section>
      )}

      {!explorationActive && total > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 48px" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 8px" }}>
            Spotlight
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 20px", maxWidth: 640 }}>
            One sample template per top category — open a category or search for the full list.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {spotlight.map((c) => (
              <ComponentCard key={c.id} c={c} />
            ))}
          </div>
          <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={setBrowseAll}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "1px solid var(--border-strong)",
                background: "var(--bg-card)",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Browse all {total} components
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, var(--accent) 0%, #5b21b6 100%)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Quick search (⌘K)
            </button>
          </div>
        </section>
      )}

      {explorationActive && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 64px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
              {browseAll && !catParam && !qParam
                ? "All components"
                : catParam
                  ? categoryLabel(catParam)
                  : qParam
                    ? `Search results`
                    : "Components"}
              <span style={{ fontWeight: 500, color: "var(--text-muted)", fontSize: 16 }}>
                {" "}
                ({filtered.length}
                {filtered.length !== total ? ` of ${total}` : ""})
              </span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setLocalQ("");
                setParams(new URLSearchParams());
              }}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              Back to discovery
            </button>
          </div>
          {qParam && (
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: -8, marginBottom: 16 }}>
              Matching <span className="mono">{qParam}</span>
            </p>
          )}
          {!total ? (
            <p style={{ color: "var(--text-muted)" }}>Loading catalog…</p>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 16,
                }}
              >
                {visiblePage.map((c) => (
                  <ComponentCard key={c.id} c={c} />
                ))}
              </div>
              {hasMore && (
                <div style={{ marginTop: 28, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                    style={{
                      padding: "12px 28px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--bg-card)",
                      color: "var(--text)",
                      fontWeight: 600,
                      fontSize: 15,
                    }}
                  >
                    Load more ({filtered.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}

function StatBox({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <div
      style={{
        padding: "20px 18px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "linear-gradient(160deg, var(--bg-card) 0%, rgba(124, 58, 237, 0.06) 100%)",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{hint}</div>
    </div>
  );
}
