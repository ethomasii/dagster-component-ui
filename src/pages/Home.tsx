import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { ManifestComponent } from "../types";
import { useCatalog } from "../context/CatalogContext";
import { ComponentCard } from "../components/ComponentCard";
import { componentId } from "../lib/componentId";
import { matchesQuery, sortByRelevance } from "../lib/search";
import { categoryLabel, formatDate } from "../lib/format";
import { countDistinctBrandIntegrations, newestComponents } from "../lib/catalogStats";
import {
  countTrustSignalHistogram,
  countVerificationBreakdown,
  componentMatchesTrustUrlFilter,
  normalizeTrustFilterParam,
  trustFilterHeading,
  type TrustSignalHistogram,
  type TrustUrlFilter,
} from "../lib/verification";
import { CategoryBrowseDropdown } from "../components/CategoryBrowseDropdown";
import { REGISTRY_DAGSTER_SPEC, UV_INSTALL_DOCS } from "../lib/registryRequirements";
import { countExampleIndexEntries } from "../lib/examplesSearch";
import { fetchExamplesIndexReadmeCached } from "../lib/loadCommunityExamples";

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
    slug: "check",
    title: "Asset checks",
    blurb: "Validation and freshness checks wired as Dagster Components.",
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
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const qParam = params.get("q") ?? "";
  const catParam = params.get("category") ?? "";
  const browseAll = params.get("browse") === "all";
  const trustParam = normalizeTrustFilterParam(params.get("trust"));

  /** Discovery-first home: full catalog only after search / filter / browse-all / trust filter. */
  const explorationActive = Boolean(qParam || catParam || browseAll || trustParam);

  const {
    components,
    catalogTotal,
    manifestMeta,
    manifestFetchedAt,
    loadError,
    openSearchPalette,
    reloadCatalog,
  } = useCatalog();
  const [catalogRefreshBusy, setCatalogRefreshBusy] = useState(false);
  const [localQ, setLocalQ] = useState(qParam);
  const catalogResultsRef = useRef<HTMLElement | null>(null);
  const [examplesIndexCount, setExamplesIndexCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const readme = await fetchExamplesIndexReadmeCached();
        if (!cancelled) setExamplesIndexCount(countExampleIndexEntries(readme));
      } catch {
        if (!cancelled) setExamplesIndexCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const integrationBrands = useMemo(
    () => countDistinctBrandIntegrations(components),
    [components]
  );

  const newestInCatalog = useMemo(() => newestComponents(components, 6), [components]);

  const trustBreakdown = useMemo(() => countVerificationBreakdown(components), [components]);
  const trustHistogram = useMemo(() => countTrustSignalHistogram(components), [components]);

  const popularCategorySamples = useMemo(() => {
    const byCat = new Map<string, ManifestComponent>();
    for (const c of components) {
      const cat = c.category ?? "uncategorized";
      if (!byCat.has(cat)) byCat.set(cat, c);
    }
    return byCat;
  }, [components]);

  /** One stable pick per manifest category—same order as template counts descending. */
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
    return categoryCounts
      .map(([cat]) => byCat.get(cat)?.[0])
      .filter((c): c is ManifestComponent => Boolean(c));
  }, [components, categoryCounts]);

  const filtered = useMemo(() => {
    let list = components;
    if (catParam) list = list.filter((c) => c.category === catParam);
    list = list.filter((c) => componentMatchesTrustUrlFilter(c, trustParam));
    list = list.filter((c) => matchesQuery(c, qParam));
    return sortByRelevance(list, qParam);
  }, [components, catParam, qParam, trustParam]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [qParam, catParam, browseAll, trustParam]);

  useEffect(() => {
    if (!explorationActive) return;
    const id = requestAnimationFrame(() => {
      catalogResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [explorationActive, qParam, catParam, browseAll, trustParam]);

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
    next.delete("trust");
    setLocalQ("");
    setParams(next);
  }, [params, setParams]);

  const runQuickSearch = useCallback(
    (term: string) => {
      const next = new URLSearchParams(params);
      next.set("q", term);
      next.delete("browse");
      next.delete("trust");
      setLocalQ(term);
      setParams(next);
    },
    [params, setParams]
  );

  const setTrustFilter = useCallback(
    (nextTrust: TrustUrlFilter) => {
      const next = new URLSearchParams(params);
      if (!nextTrust) next.delete("trust");
      else next.set("trust", nextTrust);
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

  const catalogExploration = explorationActive ? (
    <section
      ref={catalogResultsRef}
      id="catalog-results"
      style={{ maxWidth: 1200, margin: "0 auto", padding: "4px 24px 32px" }}
      aria-label="Filtered component templates"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--cyan)",
              display: "block",
              marginBottom: 2,
            }}
          >
            Results
          </span>
          {explorationSectionTitle(browseAll, catParam, qParam, trustParam)}
          <span style={{ fontWeight: 500, color: "var(--text-muted)", fontSize: 14 }}>
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
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Back to discovery
        </button>
      </div>
      {(qParam || trustParam) && (
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 12,
            marginTop: -4,
            marginBottom: 10,
            lineHeight: 1.45,
          }}
        >
          {qParam ? (
            <>
              Matching <span className="mono">{qParam}</span>
            </>
          ) : null}
          {qParam && trustParam ? " · " : null}
          {trustParam ? (
            <>
              Trust: <strong style={{ color: "var(--text)" }}>{trustFilterHeading(trustParam)}</strong>
              {" — "}
              <button
                type="button"
                onClick={() => setTrustFilter("")}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "var(--cyan)",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Clear trust filter
              </button>
            </>
          ) : null}
        </p>
      )}
      {!total ? (
        <p style={{ color: "var(--text-muted)" }}>Loading catalog…</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
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
  ) : null;

  return (
    <>
      <section
        style={{
          padding: explorationActive ? "12px 24px 8px" : "36px 24px 28px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {explorationActive ? (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: "8px 16px",
                marginBottom: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--cyan)",
                  }}
                >
                  Template catalog
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 650, color: "var(--text)", lineHeight: 1.3 }}>
                  <strong>{catalogTotal || "—"}</strong> templates
                  <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>
                    {" "}
                    · {catCount} categories · {integrationBrands ?? "—"} brands
                  </span>
                </p>
              </div>
              <Link
                to="/get-started"
                style={{ color: "var(--cyan)", fontWeight: 600, fontSize: 12, textDecoration: "none", flexShrink: 0 }}
              >
                Get started →
              </Link>
            </div>
            <TrustSignalsStrip
              compact
              histogram={trustHistogram}
              trustParam={trustParam}
              onPickTrust={(next) => setTrustFilter(trustParam === next ? "" : next)}
            />
            <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div className="hero-search-field hero-search-field--compact" style={{ flex: "1 1 260px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: 16 }} aria-hidden>
                  ⌕
                </span>
                <input
                  value={localQ}
                  onChange={(e) => setLocalQ(e.target.value)}
                  placeholder="Search templates…"
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    color: "var(--text)",
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
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, var(--accent) 0%, #5b21b6 100%)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Search
              </button>
            </form>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--cyan)",
                margin: "0 0 10px",
              }}
            >
              Template catalog
            </p>
            <h1
              style={{
                fontSize: "clamp(1.85rem, 4.5vw, 2.5rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                margin: "0 0 12px",
                lineHeight: 1.15,
                maxWidth: 720,
              }}
            >
              Find the right{" "}
              <span style={{ color: "var(--accent-bright)" }}>component templates</span> for your pipelines
            </h1>
            <p style={{ fontSize: 16, color: "var(--text-muted)", maxWidth: 720, margin: "0 0 8px" }}>
              Browse community-maintained <strong style={{ color: "var(--text)" }}>component templates</strong>—each
              folder includes YAML and a <span className="mono">schema.json</span> so you can wire assets with clear
              metadata. Templates live in GitHub; you copy them into your project (they are not published as PyPI
              packages per template).
            </p>
            <p style={{ fontSize: 14, color: "var(--text-dim)", maxWidth: 720, margin: "0 0 8px" }}>
              <strong style={{ color: "var(--text)" }}>{catalogTotal || "—"}</strong> templates ·{" "}
              <strong style={{ color: "var(--text)" }}>{catCount || "—"}</strong> categories ·{" "}
              <strong style={{ color: "var(--text)" }}>{integrationBrands || "—"}</strong> branded integrations (
              <span className="mono">si:*</span> icons)
            </p>
            <p style={{ fontSize: 13, color: "var(--text-dim)", maxWidth: 720, margin: "0 0 16px", lineHeight: 1.55 }}>
              <Link to="/get-started" style={{ color: "var(--cyan)", fontWeight: 600, textDecoration: "none" }}>
                Get started
              </Link>{" "}
              covers <span className="mono">uvx</span> (install{" "}
              <a href={UV_INSTALL_DOCS} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
                uv
              </a>{" "}
              first) and <span className="mono">dagster{REGISTRY_DAGSTER_SPEC}</span> for your code location.
            </p>

            <TrustSignalsStrip
              histogram={trustHistogram}
              trustParam={trustParam}
              onPickTrust={(next) => setTrustFilter(trustParam === next ? "" : next)}
            />

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
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
          </>
        )}
      </section>

      {explorationActive ? (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 4px" }}>
          <h2
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
              margin: "0 0 6px",
            }}
          >
            Category
          </h2>
          <CategoryBrowseDropdown
            categoryCounts={categoryCounts}
            samplesByCategory={popularCategorySamples}
            selectedCategory={catParam}
            onSelectCategory={(slug) => setCategory(slug)}
          />
        </section>
      ) : null}

      {catalogExploration}

      {!explorationActive ? (
        <>
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
        <StatBox value={catalogTotal ? String(catalogTotal) : "—"} label="Templates" hint="Total components" />
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
          hint="Templates with a recorded positive signal (informational—use trust pills in the hero to filter)"
        />
        <StatBox
          value={examplesIndexCount === null ? "—" : String(examplesIndexCount)}
          label="CLI examples"
          hint="Demos linked from the community CLI examples README (opens the examples index)"
          onClick={() => navigate("/examples")}
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

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto 24px",
          padding: "10px 24px",
          fontSize: 12,
          color: "var(--text-dim)",
          lineHeight: 1.5,
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        Most components just work — but they're community templates, not independently tested. Component pages show
        trust signals (CI status, manual checks, validation tier: code / infra / live) when the manifest records them;
        otherwise treat as unverified. Use <strong style={{ color: "var(--text)" }}>Report issue</strong> on a template
        to reach maintainers on GitHub.
      </div>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: 0 }}>
            Categories
          </h2>
          <span style={{ fontSize: 13, color: "var(--text-dim)", maxWidth: 480, textAlign: "right", lineHeight: 1.45 }}>
            Pick a manifest category (sorted by count). Opens a filterable list with icons and template totals.
          </span>
        </div>
        <CategoryBrowseDropdown
          categoryCounts={categoryCounts}
          samplesByCategory={popularCategorySamples}
          selectedCategory={catParam}
          onSelectCategory={(slug) => setCategory(slug)}
        />
      </section>

      {newestInCatalog.length > 0 && (
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
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 12px", maxWidth: 720 }}>
          Thematic shortcuts (not exhaustive). Use{" "}
          <strong style={{ color: "var(--text)" }}>Categories</strong> above for the full list.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {ECOSYSTEM_TILES.map((u) => (
            <button
              key={u.slug}
              type="button"
              title={u.blurb}
              onClick={() => setCategory(u.slug)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: `1px solid ${catParam === u.slug ? "var(--accent-bright)" : "var(--border)"}`,
                background: catParam === u.slug ? "rgba(124, 58, 237, 0.18)" : "var(--bg-card)",
                color: catParam === u.slug ? "var(--text)" : "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {u.title}
            </button>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 48px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 8px" }}>
          More use cases
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 12px", maxWidth: 720 }}>
          Curated workload shortcuts; anything not listed is still under{" "}
          <strong style={{ color: "var(--text)" }}>Categories</strong>.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {USE_CASES.map((u) => (
            <button
              key={u.slug}
              type="button"
              title={u.blurb}
              onClick={() => setCategory(u.slug)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: `1px solid ${catParam === u.slug ? "var(--accent-bright)" : "var(--border)"}`,
                background: catParam === u.slug ? "rgba(124, 58, 237, 0.18)" : "var(--bg-card)",
                color: catParam === u.slug ? "var(--text)" : "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {u.title}
            </button>
          ))}
        </div>
      </section>

      {total > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 48px" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 8px" }}>
            Spotlight
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 20px", maxWidth: 640 }}>
            One sample component per category ({catCount} total)—narrow with search or Browse all below.
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
              Browse all {catalogTotal} components
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
    </>
  ) : null}
    </>
  );
}

function trustShareLabel(n: number, total: number): string {
  if (!total) return "—";
  if (!n) return "0%";
  return `${Math.round((100 * n) / total)}%`;
}

function TrustSignalsStrip({
  compact = false,
  histogram: h,
  trustParam,
  onPickTrust,
}: {
  compact?: boolean;
  histogram: TrustSignalHistogram;
  trustParam: TrustUrlFilter;
  onPickTrust: (filter: Exclude<TrustUrlFilter, "">) => void;
}) {
  const total = h.total;

  const pill = (
    filter: Exclude<TrustUrlFilter, "">,
    label: string,
    n: number,
    hint: string,
    extra?: { caution?: boolean }
  ) => {
    if (n === 0) return null;
    const active = trustParam === filter;
    const caution = extra?.caution === true;
    const fs = compact ? 11 : 13;
    const pad = compact ? "3px 8px" : "5px 11px";
    const pctFs = compact ? 9 : 11;
    return (
      <button
        key={filter}
        type="button"
        title={hint}
        onClick={() => onPickTrust(filter)}
        style={{
          padding: pad,
          borderRadius: 999,
          border: `1px solid ${
            active ? "var(--accent-bright)" : caution ? "rgba(248, 113, 113, 0.45)" : "var(--border)"
          }`,
          background: active
            ? "rgba(124, 58, 237, 0.2)"
            : caution
              ? "rgba(248, 113, 113, 0.08)"
              : "var(--bg-card)",
          color: "var(--text)",
          fontSize: fs,
          fontWeight: 500,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {label}{" "}
        <strong style={{ color: "var(--cyan)", fontWeight: 700 }}>{total ? n : "—"}</strong>
        <span style={{ color: "var(--text-dim)", fontWeight: 400, fontSize: pctFs }}> {trustShareLabel(n, total)}</span>
      </button>
    );
  };

  return (
    <div
      style={{
        width: "100%",
        margin: compact ? "0 0 6px" : "4px 0 22px",
        paddingTop: compact ? 4 : 16,
        borderTop: compact ? "none" : "1px solid var(--border)",
      }}
    >
      {!compact ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            rowGap: 8,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--cyan)",
            }}
          >
            Trust signals
          </span>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Manifest only · click to filter</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
            <span className="mono" style={{ color: "var(--text)" }}>
              {formatTrustHistogramSummary(total, h)}
            </span>
          </span>
        </div>
      ) : (
        <p style={{ margin: "0 0 6px", fontSize: 10, color: "var(--text-dim)", lineHeight: 1.35 }} className="mono">
          Trust (manifest): {formatTrustHistogramSummary(total, h)}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? 5 : 8, alignItems: "center", rowGap: compact ? 5 : 8 }}>
        {pill("code", "Code OK", h.validatedCode, "validation.level code")}
        {pill("infra", "Infra OK", h.validatedInfra, "validation.level infra")}
        {pill("live", "Live OK", h.validatedLive, "validation.level live")}
        {pill("ci", "CI", h.ciSmoke, "verification.status ci_smoke")}
        {pill("manual", "Manual", h.manualSpotCheck, "verification.status manual_spot_check")}
        {pill("community", "Community", h.communityOk, "verification.status community_reported_working")}
        {pill("issue", "Known issue", h.knownIssue, "verification.status known_issue", { caution: true })}
        {pill("unverified", "Unverified", h.unverified, "No positive signal recorded")}
      </div>
    </div>
  );
}

function formatTrustHistogramSummary(total: number, h: TrustSignalHistogram): string {
  if (!total) return "Loading…";
  const validated = h.validatedCode + h.validatedInfra + h.validatedLive;
  const recorded = h.ciSmoke + h.manualSpotCheck + h.communityOk;
  return `${validated} validated · ${recorded} checked · ${h.unverified} unverified`;
}

function explorationSectionTitle(
  browseAll: boolean,
  catParam: string,
  qParam: string,
  trustParam: TrustUrlFilter
): string {
  if (catParam) {
    const base = categoryLabel(catParam);
    return trustParam ? `${base} · ${trustFilterHeading(trustParam)}` : base;
  }
  if (qParam) {
    return trustParam ? `Search results · ${trustFilterHeading(trustParam)}` : "Search results";
  }
  if (browseAll) {
    return trustParam ? `All components · ${trustFilterHeading(trustParam)}` : "All components";
  }
  if (trustParam) {
    return `${trustFilterHeading(trustParam)} templates`;
  }
  return "Components";
}

function StatBox({
  value,
  label,
  hint,
  onClick,
  pressed,
}: {
  value: string;
  label: string;
  hint: string;
  onClick?: () => void;
  pressed?: boolean;
}) {
  const boxStyle: CSSProperties = {
    padding: "20px 18px",
    borderRadius: "var(--radius)",
    border: `1px solid ${pressed ? "var(--accent-bright)" : "var(--border)"}`,
    background: pressed
      ? "linear-gradient(160deg, rgba(124, 58, 237, 0.18) 0%, rgba(34, 211, 238, 0.06) 100%)"
      : "linear-gradient(160deg, var(--bg-card) 0%, rgba(124, 58, 237, 0.06) 100%)",
    cursor: onClick ? "pointer" : undefined,
    textAlign: "left" as const,
  };

  const inner = (
    <>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{hint}</div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={pressed}
        style={{ ...boxStyle, color: "var(--text)", font: "inherit" }}
      >
        {inner}
      </button>
    );
  }

  return <div style={boxStyle}>{inner}</div>;
}
