import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ManifestComponent } from "../types";
import { useCatalog } from "../context/CatalogContext";
import { ComponentCard } from "../components/ComponentCard";
import { componentId } from "../lib/componentId";
import { matchesQuery, sortByRelevance } from "../lib/search";
import { categoryLabel, formatDate } from "../lib/format";
import { countDistinctBrandIntegrations, newestComponents } from "../lib/catalogStats";
import { countVerificationBreakdown } from "../lib/verification";
import { pipInstallDagsterCore } from "../lib/registryRequirements";
import { PopularCategoryCard } from "../components/PopularCategoryCard";
import { CopyButton } from "../components/CopyButton";

const PAGE_SIZE = 48;

/** Link to browse manifest.json on GitHub (same repo URI as manifest `repository`). */
function manifestGithubBlobUrl(repository: string): string {
  const r = repository.replace(/\.git$/i, "").replace(/\/$/, "");
  return `${r}/blob/main/manifest.json`;
}

const QUICK_SEARCHES: { label: string; q: string }[] = [
  { label: "Databricks", q: "databricks" },
  { label: "Snowflake", q: "snowflake" },
  { label: "Postgres", q: "postgres" },
  { label: "BigQuery", q: "bigquery" },
  { label: "Kafka", q: "kafka" },
];

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

  const {
    components,
    manifestMeta,
    manifestFetchedAt,
    loadError,
    openSearchPalette,
    reloadCatalog,
  } = useCatalog();
  const [catalogRefreshBusy, setCatalogRefreshBusy] = useState(false);
  const [localQ, setLocalQ] = useState(qParam);

  const refreshCatalogNow = useCallback(async () => {
    setCatalogRefreshBusy(true);
    try {
      await reloadCatalog();
    } finally {
      setCatalogRefreshBusy(false);
    }
  }, [reloadCatalog]);

  useEffect(() => {
    setLocalQ(qParam);
  }, [qParam]);

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
      arr.sort((a, b) => componentId(a).localeCompare(componentId(b)));
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

  const runQuickSearch = useCallback(
    (term: string) => {
      const next = new URLSearchParams(params);
      next.set("q", term);
      next.delete("browse");
      setLocalQ(term);
      setParams(next);
    },
    [params, setParams]
  );

  if (loadError) {
    return (
      <div style={{ maxWidth: 480, margin: "64px auto", padding: "0 24px", textAlign: "center" }}>
        <div className="callout-help" style={{ borderLeftColor: "var(--error)", textAlign: "left" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 600, color: "var(--text)" }}>Could not load catalog</p>
          <p style={{ margin: 0 }}>{loadError}</p>
          <p style={{ margin: "12px 0 0", fontSize: 13 }}>
            Ensure <span className="mono">manifest.json</span> is in <span className="mono">public/</span> and the dev
            server is running.
          </p>
        </div>
      </div>
    );
  }

  const total = components.length;
  const catCount = categoryCounts.length;

  return (
    <>
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
          Template catalog
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
          Find the right{" "}
          <span style={{ color: "var(--accent-bright)" }}>component templates</span> for your pipelines
        </h1>
        <p style={{ fontSize: 17, color: "var(--text-muted)", maxWidth: 720, margin: "0 0 10px" }}>
          Browse community-maintained <strong style={{ color: "var(--text)" }}>component templates</strong>—each
          folder includes YAML and a <span className="mono">schema.json</span> so you can wire assets with clear
          metadata. Templates live in GitHub; you copy them into your project (they are not published as PyPI
          packages per template).
        </p>
        <p style={{ fontSize: 15, color: "var(--text-dim)", maxWidth: 720, margin: "0 0 20px" }}>
          <strong style={{ color: "var(--text)" }}>{total || "—"}</strong> templates ·{" "}
          <strong style={{ color: "var(--text)" }}>{catCount || "—"}</strong> categories ·{" "}
          <strong style={{ color: "var(--text)" }}>{integrationBrands || "—"}</strong> branded integrations (
          <span className="mono">si:*</span> icons)
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
            maxWidth: 720,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)", marginRight: 4 }}>
            Try:
          </span>
          {QUICK_SEARCHES.map(({ label, q }) => (
            <button
              key={q}
              type="button"
              onClick={() => runQuickSearch(q)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--text-muted)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div className="hero-search-field">
            <span style={{ color: "var(--text-dim)", fontSize: 18 }} aria-hidden>
              ⌕
            </span>
            <input
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Search by name, tag, or integration…"
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                color: "var(--text)",
                fontSize: 15,
              }}
              aria-label="Search components"
            />
            <button
              type="button"
              onClick={() => openSearchPalette()}
              className="kbd"
              title="Open quick search"
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

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 32px" }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            margin: "0 0 16px",
          }}
        >
          At a glance
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 14,
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
          hint="maintainer-run manifest.json on GitHub (last_updated)"
        />
        </div>
        {manifestMeta && (
          <p
            style={{
              margin: "14px 0 0",
              padding: "0",
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.6,
              maxWidth: 760,
            }}
          >
            <strong style={{ color: "var(--text)" }}>Source of truth:</strong> the template total and catalog date
            come from {" "}
            <a href={manifestGithubBlobUrl(manifestMeta.repo)} target="_blank" rel="noreferrer">
              manifest.json
            </a>{" "}
            in the templates repo—they update when you regenerate commit that file (field{" "}
            <span className="mono">last_updated</span>). This site reads that JSON at runtime; it does not scrape
            folders independently.{" "}
            {manifestFetchedAt ? (
              <>
                Your browser last loaded it: {" "}
                <strong>{new Date(manifestFetchedAt).toLocaleString()}</strong>
                .{" "}
              </>
            ) : null}
            <button
              type="button"
              disabled={catalogRefreshBusy}
              onClick={() => void refreshCatalogNow()}
              style={{
                marginLeft: 8,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                border: "1px solid var(--border-strong)",
                background: catalogRefreshBusy ? "var(--code-bg)" : "var(--bg-card)",
                color: "var(--text-muted)",
                cursor: catalogRefreshBusy ? "wait" : "pointer",
              }}
            >
              {catalogRefreshBusy ? "Refreshing…" : "Reload catalog"}
            </button>
          </p>
        )}
      </section>

      <div style={{ maxWidth: 720, margin: "0 auto 32px", padding: "0 24px" }} className="callout-help">
        <strong style={{ color: "var(--text)" }}>Before you ship:</strong> most listings are community templates
        without an independent test guarantee. Component pages show verification when the manifest records CI, manual
        checks, or community signals—otherwise treat as unverified. There is no in-app review yet; use{" "}
        <strong style={{ color: "var(--text)" }}>Report issue</strong> on a template to reach maintainers on GitHub.
      </div>

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
              <ComponentCard key={componentId(c) || `new-${i}`} c={c} />
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
              <ComponentCard key={componentId(c)} c={c} />
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
              onClick={() => openSearchPalette()}
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
                  <ComponentCard key={componentId(c)} c={c} />
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
